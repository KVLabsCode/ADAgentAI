"""Specialist agent node - LLM agent with tools for ad platform operations.

Uses LangGraph's ReAct agent pattern for multi-step tool use.
The specialist is configured based on the routing result (service/capability).
Supports token-level streaming via asyncio.Queue passed in config.
"""

import os
import re
import asyncio
from datetime import datetime, timezone
from typing import Any
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, AIMessageChunk
from langsmith import traceable
from langgraph.types import RunnableConfig

from ..state import GraphState
from .entity_loader import build_entity_system_prompt
from .tool_retriever import search_tools_within_set
from ...tools import get_tools_for_service
from ...tools.registry import get_tool_registry
from ...streaming.events import format_sse, ThinkingEvent
from ...utils.prompts import (
    get_system_prompt_template,
    get_service_instructions,
    get_agent_role,
)
from mcp_servers.annotations import get_tools_for_network_capability

# Threshold for when to use FTS refinement
TOOL_COUNT_THRESHOLD = 15
FTS_TOP_K = 5

# Model mapping by execution path for auto-selection
# Reactive: simple queries → fast, cheap model
# Workflow: complex queries → capable model with extended thinking
MODEL_BY_PATH = {
    "reactive": "claude-3-5-haiku-20241022",
    "workflow": "claude-sonnet-4-20250514",
}

# Maps service names to account types stored in user context
# Used by _service_has_enabled_accounts to check if user has connected accounts
SERVICE_ACCOUNT_TYPES = {
    "admob": "admob",
    "admanager": "gam",
    "applovin": "applovin",
    "unity": "unity",
    "mintegral": "mintegral",
    "liftoff": "liftoff",
    "inmobi": "inmobi",
    "pangle": "pangle",
    "dtexchange": "dtexchange",
}

CAPABILITY_KEYWORDS = {
    "inventory": [
        "app",
        "apps",
        "ad_unit",
        "ad_units",
        "placement",
        "placements",
        "site",
        "sites",
        "network",
        "networks",
        "contact",
        "team",
        "custom_field",
        "custom_targeting",
        "entity_signals",
    ],
    "reporting": ["report", "reports", "reporting", "metrics"],
    "mediation": [
        "mediation",
        "ad_source",
        "ad_sources",
        "mediation_group",
        "ab_experiment",
        "experiment",
        "ad_unit_mapping",
    ],
    "experimentation": ["experiment", "ab_experiment", "a_b"],
    "orders": ["order", "line_item", "creative", "proposal"],
    "deals": ["deal", "private_auction", "auction"],
    "targeting": ["targeting", "custom_targeting", "custom_field", "key"],
}


def _build_system_prompt(
    service: str,
    capability: str,
    user_context: dict,
    conversation_history: list[dict] | None,
) -> str:
    """Build the full system prompt for the specialist.

    Pulls prompt template from LangSmith if available, falls back to defaults.
    """
    # Get role info (from LangSmith or defaults)
    role_info = get_agent_role(service, capability)

    # Get service instructions (from LangSmith or defaults)
    instructions = get_service_instructions(service)

    # Get entity grounding section
    entity_section = build_entity_system_prompt(user_context)

    # Get current date/time for temporal context
    now = datetime.now(timezone.utc)
    current_date = now.strftime("%Y-%m-%d")
    current_datetime = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Calculate example date ranges
    from datetime import timedelta
    seven_days_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    thirty_days_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    month_start = now.strftime("%Y-%m") + "-01"

    # Build temporal context section
    temporal_section = f"""
## Current Date and Time
Today's date: {current_date}
Current time: {current_datetime}

When the user asks about date ranges like "last 7 days", "this month", "yesterday", etc.,
calculate the appropriate dates based on today's date ({current_date}).

For example:
- "last 7 days" = {seven_days_ago} to {current_date}
- "last 30 days" = {thirty_days_ago} to {current_date}
- "yesterday" = {yesterday}
- "this month" = {month_start} to {current_date}
"""

    # Build conversation context
    context_section = ""
    if conversation_history:
        recent = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
        context_lines = []
        for msg in recent:
            role = msg.get("role", "user").title()
            content = msg.get("content", "")[:300]
            context_lines.append(f"{role}: {content}")
        context_section = f"""
## Previous Conversation
{chr(10).join(context_lines)}

Use this context to understand follow-up questions and maintain continuity.
Reference previous context when relevant (e.g., if user says "that app" or "the same account").
"""

    # Get system prompt template (from LangSmith or default)
    template = get_system_prompt_template()

    # Format the template with all variables
    return template.format(
        role=role_info['role'],
        goal=role_info['goal'],
        temporal_section=temporal_section,
        entity_section=entity_section,
        context_section=context_section,
        instructions=instructions,
    )


def _get_model_from_selection(selected_model: str | None, enable_thinking: bool = True) -> BaseChatModel:
    """Create LLM instance based on user's model selection.

    Args:
        selected_model: Model selection from frontend
            - Anthropic: "anthropic/claude-sonnet-4-20250514" or "claude-sonnet-4-20250514"
            - OpenRouter: "openrouter/google/gemini-2.5-flash"
        enable_thinking: Enable extended thinking for complex reasoning (only for Claude)

    Returns:
        Configured LLM instance (ChatAnthropic or ChatOpenAI)
    """
    # Default to Gemini 2.5 Flash Lite via OpenRouter
    default_model = "openrouter/google/gemini-2.5-flash"

    # Use selected model or default
    model_id = selected_model or default_model

    # Check if it's an OpenRouter model
    if model_id.startswith("openrouter/"):
        # OpenRouter models via ChatOpenAI with OpenRouter base URL
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            print("[specialist] Warning: OPENROUTER_API_KEY not set, falling back to Claude")
            # Fallback to Claude
            return ChatAnthropic(
                model="claude-sonnet-4-20250514",
                max_tokens=16000,
                temperature=0.1,
            )

        # Extract model name (remove "openrouter/" prefix)
        model_name = model_id.replace("openrouter/", "")

        print(f"[specialist] Using OpenRouter model: {model_name}")

        # OpenRouter configuration
        return ChatOpenAI(
            model=model_name,
            openai_api_key=openrouter_api_key,
            openai_api_base="https://openrouter.ai/api/v1",
            max_tokens=16000,
            temperature=0.1,
            model_kwargs={
                "extra_headers": {
                    "HTTP-Referer": "https://adagentai.com",  # Optional but recommended
                    "X-Title": "ADAgentAI",  # Optional but recommended
                }
            }
        )

    # Anthropic Claude models
    if model_id.startswith("anthropic/"):
        model_name = model_id.replace("anthropic/", "")
    elif model_id.startswith("claude-"):
        model_name = model_id
    else:
        # Unknown format, fallback to default
        model_name = "claude-sonnet-4-20250514"

    print(f"[specialist] Using Anthropic model: {model_name}")

    # Base LLM config for Claude
    llm_kwargs: dict[str, Any] = {
        "model": model_name,
        "max_tokens": 16000,
    }

    # Enable extended thinking for deeper reasoning (Claude-specific feature)
    if enable_thinking:
        llm_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": 4096,  # Allow up to 4K tokens for thinking
        }
        llm_kwargs["temperature"] = 1  # Required for thinking mode
    else:
        llm_kwargs["temperature"] = 0.1

    return ChatAnthropic(**llm_kwargs)


def _get_model_for_execution_path(
    execution_path: str,
    user_override: str | None = None,
) -> tuple[BaseChatModel, str]:
    """Auto-select model based on execution path.

    Args:
        execution_path: "reactive" or "workflow" from router classification
        user_override: User's model selection (None or "auto" means auto-select)

    Returns:
        Tuple of (configured LLM instance, model name string)
    """
    # Allow user override if explicitly set to non-"auto" value
    if user_override and user_override != "auto":
        llm = _get_model_from_selection(user_override)
        model_name = user_override
        print(f"[specialist] User override model: {model_name}")
        return llm, model_name

    # Auto-select based on execution path
    model_name = MODEL_BY_PATH.get(execution_path, MODEL_BY_PATH["workflow"])
    print(f"[specialist] Auto-selected model for path='{execution_path}': {model_name}")

    # Configure model based on path
    # Reactive path: no extended thinking (faster)
    # Workflow path: enable extended thinking for complex reasoning
    enable_thinking = execution_path == "workflow"

    llm_kwargs: dict[str, Any] = {
        "model": model_name,
        "max_tokens": 16000,
    }

    if enable_thinking:
        llm_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": 4096,
        }
        llm_kwargs["temperature"] = 1  # Required for thinking mode
    else:
        llm_kwargs["temperature"] = 0.1

    return ChatAnthropic(**llm_kwargs), model_name


def _sanitize_tool_name(name: str) -> str:
    """Sanitize tool name to meet Gemini's requirements.

    Gemini requires:
    - Must start with a letter or underscore
    - Must be alphanumeric (a-z, A-Z, 0-9), underscores (_), dots (.), colons (:), or dashes (-)
    - Maximum length of 64 characters

    Args:
        name: Original tool name

    Returns:
        Sanitized tool name
    """
    # Replace invalid characters with underscores
    # Keep only: letters, numbers, _, ., :, -
    # Note: Forward slashes (/) are NOT allowed by Gemini
    sanitized = re.sub(r'[^a-zA-Z0-9_.\:\-]', '_', name)

    # Ensure it starts with letter or underscore
    if sanitized and not (sanitized[0].isalpha() or sanitized[0] == '_'):
        sanitized = '_' + sanitized

    # Truncate to 64 characters
    if len(sanitized) > 64:
        sanitized = sanitized[:64]

    return sanitized


def _sanitize_tools_for_gemini(tools: list) -> list:
    """Sanitize tool names for Gemini compatibility.

    Args:
        tools: List of LangChain tools

    Returns:
        List of tools with sanitized names
    """
    sanitized_tools = []
    for tool in tools:
        # Create a copy to avoid modifying original
        if hasattr(tool, 'name'):
            original_name = tool.name
            sanitized_name = _sanitize_tool_name(original_name)

            if original_name != sanitized_name:
                print(f"[specialist] Sanitized tool name: {original_name} -> {sanitized_name}")
                # Update tool name
                tool.name = sanitized_name

        sanitized_tools.append(tool)

    return sanitized_tools


def _get_tool_text(tool: Any) -> str:
    name = getattr(tool, "name", "") or ""
    description = getattr(tool, "description", "") or ""
    return f"{name} {description}".lower()


def _filter_tools_for_capability(tools: list, capability: str) -> list:
    """Filter tools using lightweight keyword matching to reduce tool list size.

    Falls back to the full list if no tools match.
    """
    keywords = CAPABILITY_KEYWORDS.get(capability, [])
    if not keywords:
        return tools

    filtered = [t for t in tools if any(k in _get_tool_text(t) for k in keywords)]
    if not filtered:
        print(f"[specialist] Tool filter returned 0 tools for capability={capability}, using full list")
        return tools

    print(f"[specialist] Filtered tools for capability={capability}: {len(filtered)}/{len(tools)}")
    return filtered


async def _filter_tools_by_network_capability(
    tools: list,
    network: str,
    capability: str,
    user_query: str,
) -> list:
    """Two-layer filtering: filter by network AND capability tags, then FTS refinement.

    This implements the semantic routing visibility filter:
    1. First get tools explicitly tagged for network+capability
    2. Fall back to keyword matching if explicit tags don't match enough
    3. If still >15 tools, use FTS to rank and return top 5

    Args:
        tools: Full list of LangChain tools
        network: Network name (e.g., "admob", "unity")
        capability: Capability name (e.g., "mediation", "reporting")
        user_query: Original user query for FTS relevance ranking

    Returns:
        Filtered list of tools (typically 5-15 tools, not 171+)
    """
    filtered = []

    # Try explicit tag-based filtering first (from annotations.py TOOL_TAGS)
    tagged_tool_names = get_tools_for_network_capability(network, capability)

    if tagged_tool_names:
        # Filter to only tools in the explicit tag list
        tagged_set = set(tagged_tool_names)
        filtered = [t for t in tools if getattr(t, "name", "") in tagged_set]

        if filtered:
            print(f"[specialist] Tag-filtered {network}_{capability}: {len(filtered)} tools (explicit tags)")

    # Fall back to registry-based filtering if no explicit tags
    if not filtered:
        registry = get_tool_registry()

        # Ensure tools are loaded into registry
        if registry.tool_count == 0:
            registry.load_from_langchain_tools(tools, network)

        # Use the registry's filter_by_network_capability
        filtered_configs = registry.filter_by_network_capability(network, capability)

        if filtered_configs:
            filtered_names = {c.name for c in filtered_configs}
            filtered = [t for t in tools if getattr(t, "name", "") in filtered_names]

            if filtered:
                print(f"[specialist] Registry-filtered {network}_{capability}: {len(filtered)} tools")

    # Final fallback to keyword-based capability filtering
    if not filtered:
        print(f"[specialist] No tag/registry matches for {network}_{capability}, falling back to keywords")
        filtered = _filter_tools_for_capability(tools, capability)

    # FTS refinement: if too many tools, rank by query relevance
    if len(filtered) > TOOL_COUNT_THRESHOLD:
        tool_names = [getattr(t, "name", "") for t in filtered]
        print(f"[specialist] {len(filtered)} tools > {TOOL_COUNT_THRESHOLD}, using FTS refinement")

        try:
            top_names = await search_tools_within_set(user_query, tool_names, FTS_TOP_K)
            top_set = set(top_names)
            filtered = [t for t in filtered if getattr(t, "name", "") in top_set]
            # Preserve FTS ranking order
            name_to_tool = {getattr(t, "name", ""): t for t in filtered}
            filtered = [name_to_tool[n] for n in top_names if n in name_to_tool]
            print(f"[specialist] FTS refined to {len(filtered)} tools")
        except Exception as e:
            print(f"[specialist] FTS refinement error: {e}, using first {FTS_TOP_K}")
            filtered = filtered[:FTS_TOP_K]

    return filtered


def _filter_tools_for_orchestration(tools: list, capability: str) -> list:
    """Filter tools for cross-network orchestration.

    Includes:
    1. Master controller tools (always included)
    2. Tools matching capability across ALL networks

    Args:
        tools: Full list of tools from all networks
        capability: Capability to filter for (e.g., "mediation", "reporting")

    Returns:
        Combined list of orchestration + capability-matching tools
    """
    # Master controller tools - always included
    master_tools = [
        "full_unity_admob_integration",
        "global_revenue_summary",
        "check_network_health",
    ]

    # Get capability keywords for filtering
    keywords = CAPABILITY_KEYWORDS.get(capability, [])

    # Build filtered list
    filtered = []
    filtered_names = set()

    for tool in tools:
        name = getattr(tool, "name", "")

        # Include master controller tools
        if name in master_tools:
            if name not in filtered_names:
                filtered.append(tool)
                filtered_names.add(name)
            continue

        # Include tools matching capability keywords
        if keywords and any(k in _get_tool_text(tool) for k in keywords):
            if name not in filtered_names:
                filtered.append(tool)
                filtered_names.add(name)

    if not filtered:
        print(f"[specialist] No orchestration tools for capability={capability}, using full list")
        return tools

    print(f"[specialist] Orchestration filtered for {capability}: {len(filtered)} tools")
    return filtered


def _resolve_enabled_account_ids(user_context: dict) -> set[str]:
    accounts = user_context.get("accounts", [])
    enabled_by_pref = {a.get("id") for a in accounts if a.get("enabled", True)}
    enabled_by_pref.discard(None)

    selected = set(user_context.get("enabled_accounts", []))
    if selected:
        return {acc_id for acc_id in selected if acc_id in enabled_by_pref}
    return enabled_by_pref


def _service_has_enabled_accounts(user_context: dict, service: str) -> bool:
    account_type = SERVICE_ACCOUNT_TYPES.get(service, service)
    accounts = [a for a in user_context.get("accounts", []) if a.get("type") == account_type]
    if not accounts:
        return False
    enabled_ids = _resolve_enabled_account_ids(user_context)
    if not enabled_ids:
        return False
    return any(a.get("id") in enabled_ids for a in accounts)


@traceable(name="specialist_node", run_type="llm")
async def specialist_node(state: GraphState, config: RunnableConfig) -> dict:
    """Invoke the specialist LLM to generate a response or tool calls.

    This node:
    1. Builds the system prompt with entity grounding
    2. Loads MCP tools for the service
    3. Streams the LLM response with tools bound (token-by-token)
    4. Returns either a response or tool calls for execution

    Token-level streaming is achieved by putting content chunks into
    the asyncio.Queue passed via config["configurable"]["content_queue"].

    Args:
        state: Current graph state
        config: LangGraph config with content_queue for streaming

    Returns:
        Updated state with response or tool_calls
    """
    user_query = state.get("user_query", "")
    user_context = state.get("user_context", {})
    routing = state.get("routing", {})
    messages = list(state.get("messages", []))
    selected_model = state.get("selected_model")
    conversation_history = state.get("conversation_history")

    service = routing.get("service", "general")
    capability = routing.get("capability", "assistant")
    user_id = user_context.get("user_id")
    organization_id = user_context.get("organization_id")

    # Build system prompt
    # Debug: log user_context to verify entity loading
    accounts = user_context.get("accounts", [])
    apps = user_context.get("apps", [])
    print(f"[specialist] User context has {len(accounts)} accounts and {len(apps)} apps")
    if accounts:
        for acc in accounts[:3]:  # Log first 3 accounts
            print(f"[specialist]   Account: {acc.get('name')} ({acc.get('type')}) - {acc.get('identifier')}")

    system_prompt = _build_system_prompt(
        service=service,
        capability=capability,
        user_context=user_context,
        conversation_history=conversation_history,
    )

    # Debug: log system prompt length and preview
    print(f"[specialist] System prompt length: {len(system_prompt)} chars")
    # Log entity section if present
    if "Available Entities" in system_prompt:
        entity_start = system_prompt.find("## Available Entities")
        entity_end = system_prompt.find("##", entity_start + 10) if entity_start >= 0 else -1
        if entity_end == -1:
            entity_end = min(entity_start + 500, len(system_prompt))
        print(f"[specialist] Entity section preview: {system_prompt[entity_start:entity_end][:300]}...")

    # Get execution path from routing for auto-model selection
    execution_path = routing.get("execution_path", "workflow")

    # Get appropriate LLM using auto-selection based on execution path
    llm, actual_model_name = _get_model_for_execution_path(execution_path, selected_model)

    # Check if we're using an OpenRouter model (needs tool name sanitization)
    # Check both user's selection and actual model name in case of auto-selection
    is_openrouter = (
        (selected_model and selected_model.startswith("openrouter/")) or
        actual_model_name.startswith("openrouter/")
    )

    # Load MCP tools for this service
    retrieved_tools = state.get("retrieved_tools")  # From tool_retriever node
    tools = []  # Initialize to avoid undefined variable if loading fails

    try:
        # Handle orchestration service specially - load all network tools
        if service == "orchestration":
            tools = await get_tools_for_service("all", user_id, organization_id)
            print(f"[specialist] Loaded {len(tools)} tools for orchestration (all networks)")
        else:
            tools = await get_tools_for_service(service, user_id, organization_id)
            print(f"[specialist] Loaded {len(tools)} tools for service: {service}")

        if service not in ("general", "orchestration") and not _service_has_enabled_accounts(user_context, service):
            print(f"[specialist] No enabled accounts for service={service}; skipping tool binding")
            tools = []

        # Use retrieved tools from semantic search if available
        if tools and retrieved_tools:
            retrieved_set = set(retrieved_tools)
            tools = [t for t in tools if getattr(t, "name", "") in retrieved_set]
            print(f"[specialist] Filtered to {len(tools)} tools from semantic retrieval")
        # Two-layer tag-based filtering (network + capability) + FTS refinement
        elif tools and service not in ("general", "orchestration"):
            tools = await _filter_tools_by_network_capability(tools, service, capability, user_query)
        # Orchestration: filter to relevant capability across all networks
        elif tools and service == "orchestration":
            tools = _filter_tools_for_orchestration(tools, capability)

        # Bind tools to LLM
        if tools:
            # Sanitize tool names for OpenRouter/Gemini compatibility
            if is_openrouter:
                print(f"[specialist] Sanitizing {len(tools)} tool names for OpenRouter/Gemini")
                tools = _sanitize_tools_for_gemini(tools)

            llm_with_tools = llm.bind_tools(tools)
            print(f"[specialist] Successfully bound {len(tools)} tools to LLM")
        else:
            llm_with_tools = llm
            print(f"[specialist] Warning: No tools loaded for {service}")
    except Exception as e:
        print(f"[specialist] Error loading tools: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        llm_with_tools = llm

    # Build messages for LLM
    llm_messages = [SystemMessage(content=system_prompt)]

    # Add conversation history as messages
    for msg in messages:
        llm_messages.append(msg)

    # For OpenRouter/Gemini models, inject entity context as a user message
    # This ensures the model "sees" the account info prominently
    # Gemini models sometimes don't weight system prompts as heavily as Claude/GPT
    if is_openrouter:
        print(f"[specialist] OpenRouter model detected, injecting entity context into conversation")
        accounts = user_context.get("accounts", [])
        if accounts:
            print(f"[specialist] Injecting {len(accounts)} accounts as context reminder")
            account_summary = []
            for acc in accounts[:5]:  # Top 5 accounts
                acc_name = acc.get("name", "Unknown")
                acc_type = acc.get("type", "unknown")
                acc_id = acc.get("identifier", "N/A")
                account_summary.append(f"- {acc_name} ({acc_type}): {acc_id}")

            context_reminder = f"""CONTEXT REMINDER - User's connected accounts:
{chr(10).join(account_summary)}

Use these account IDs when calling tools. If the user asks about "my account" or revenue, use their actual account ID from above."""

            llm_messages.append(HumanMessage(content=context_reminder))
            # Add a brief assistant acknowledgment to complete the pair
            llm_messages.append(AIMessage(content="I understand. I'll use your connected AdMob account for this request."))

    # Add current query if not already in messages
    # Check if user_query exists in ANY HumanMessage, not just the last one
    # This prevents re-adding the query after tool execution (which would confuse the LLM)
    user_query_exists = any(
        isinstance(msg, HumanMessage) and msg.content == user_query
        for msg in messages
    )
    if not user_query_exists:
        llm_messages.append(HumanMessage(content=user_query))

    # Get streaming queues from config
    # content_queue: for token-level streaming to frontend
    # output_queue: for SSE events (thinking, etc.) that need proper ordering
    configurable = config.get("configurable", {}) if config else {}
    content_queue: asyncio.Queue[str | None] | None = configurable.get("content_queue")
    output_queue: asyncio.Queue[str | None] | None = configurable.get("output_queue")

    try:
        # Stream LLM response with proper event ordering:
        # 1. Accumulate thinking chunks (Claude sends all thinking before text)
        # 2. When first text chunk arrives → emit thinking to output_queue
        # 3. Stream text chunks to content_queue
        response_text = ""
        thinking_content: str | None = None
        thinking_emitted = False
        token_usage: dict[str, int] = {}
        tool_calls_accumulated: list[dict] = []
        response_chunks: list[AIMessageChunk] = []
        final_response: AIMessageChunk | None = None

        print(f"[specialist] Starting response (streaming mode)")

        async for chunk in llm_with_tools.astream(llm_messages):
            response_chunks.append(chunk)

            # Extract content from chunk
            if hasattr(chunk, "content"):
                chunk_content = chunk.content

                # Handle list of content blocks (Claude with extended thinking)
                if isinstance(chunk_content, list):
                    for block in chunk_content:
                        if isinstance(block, dict):
                            if block.get("type") == "thinking":
                                # Stream thinking chunks immediately as they arrive
                                thinking_text = block.get("thinking", "")
                                if thinking_text:
                                    thinking_content = (thinking_content or "") + thinking_text
                                    # Emit each thinking chunk immediately
                                    if output_queue:
                                        await output_queue.put(format_sse(
                                            ThinkingEvent(content=thinking_text).model_dump(mode='json')
                                        ))
                                        thinking_emitted = True
                            elif block.get("type") == "text":
                                text = block.get("text", "")
                                if text:
                                    # Stream text to content queue
                                    if content_queue:
                                        await content_queue.put(text)
                                    response_text += text
                        elif hasattr(block, "type"):
                            if block.type == "thinking":
                                # Stream thinking chunks immediately as they arrive
                                thinking_text = getattr(block, "thinking", "")
                                if thinking_text:
                                    thinking_content = (thinking_content or "") + thinking_text
                                    # Emit each thinking chunk immediately
                                    if output_queue:
                                        await output_queue.put(format_sse(
                                            ThinkingEvent(content=thinking_text).model_dump(mode='json')
                                        ))
                                        thinking_emitted = True
                            elif block.type == "text":
                                text = getattr(block, "text", "")
                                if text:
                                    # Stream text to content queue
                                    if content_queue:
                                        await content_queue.put(text)
                                    response_text += text
                elif isinstance(chunk_content, str) and chunk_content:
                    # Simple string content (OpenRouter models - no thinking)
                    if content_queue:
                        await content_queue.put(chunk_content)
                    response_text += chunk_content

            # Accumulate tool calls from chunks
            if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                for tc_chunk in chunk.tool_call_chunks:
                    # Find or create tool call entry
                    tc_id = tc_chunk.get("id") or tc_chunk.get("index", 0)
                    existing = next((tc for tc in tool_calls_accumulated if tc.get("id") == tc_id), None)
                    if existing:
                        # Append args
                        if tc_chunk.get("args"):
                            existing["args_str"] = existing.get("args_str", "") + tc_chunk["args"]
                    else:
                        tool_calls_accumulated.append({
                            "id": tc_id,
                            "name": tc_chunk.get("name", ""),
                            "args_str": tc_chunk.get("args", ""),
                        })

        # Merge all chunks to get final response with metadata
        if response_chunks:
            final_response = response_chunks[0]
            for chunk in response_chunks[1:]:
                final_response = final_response + chunk

            # Extract token usage from final response metadata
            # Note: In streaming mode, usage is often only in the last chunk
            usage: dict = {}

            if hasattr(final_response, "response_metadata") and final_response.response_metadata:
                usage = final_response.response_metadata.get("usage", {})
                print(f"[specialist] response_metadata: {final_response.response_metadata}")

            # Fallback: check usage_metadata (some LangChain versions use this)
            if not usage and hasattr(final_response, "usage_metadata") and final_response.usage_metadata:
                usage = {
                    "input_tokens": getattr(final_response.usage_metadata, "input_tokens", 0),
                    "output_tokens": getattr(final_response.usage_metadata, "output_tokens", 0),
                }
                print(f"[specialist] usage_metadata fallback: {usage}")

            # Fallback: check last chunk directly for usage
            if not usage and response_chunks:
                last_chunk = response_chunks[-1]
                if hasattr(last_chunk, "response_metadata") and last_chunk.response_metadata:
                    usage = last_chunk.response_metadata.get("usage", {})
                    print(f"[specialist] last_chunk response_metadata: {last_chunk.response_metadata}")

            # Build token_usage dict from whatever we found
            if usage:
                token_usage = {
                    "input_tokens": usage.get("input_tokens") or usage.get("prompt_tokens", 0),
                    "output_tokens": usage.get("output_tokens") or usage.get("completion_tokens", 0),
                }

            # Get tool calls from final merged response
            print(f"[specialist] final_response has tool_calls attr: {hasattr(final_response, 'tool_calls')}")
            if hasattr(final_response, "tool_calls"):
                print(f"[specialist] final_response.tool_calls: {final_response.tool_calls}")
            if hasattr(final_response, "tool_calls") and final_response.tool_calls:
                tool_calls_accumulated = []
                for tc in final_response.tool_calls:
                    tool_calls_accumulated.append({
                        "id": tc.get("id", ""),
                        "name": tc.get("name", ""),
                        "args": tc.get("args", {}),
                    })

        # Use actual_model_name from auto-selection (more accurate than extracting from llm)
        model_name = actual_model_name

        print(f"[specialist] Model: {model_name}, execution_path: {execution_path}")
        print(f"[specialist] Token usage: {token_usage}")
        print(f"[specialist] Thinking: {thinking_content[:100] if thinking_content else 'None'}...")
        print(f"[specialist] Response: {response_text[:100] if response_text else 'None'}...")

        # Check if we have accumulated tool calls
        if tool_calls_accumulated:
            # Return tool calls for tool_executor to handle
            tool_calls = []
            for tc in tool_calls_accumulated:
                tool_calls.append({
                    "id": tc.get("id", ""),
                    "name": tc.get("name", ""),
                    "args": tc.get("args", {}),
                    "result": None,
                    "is_dangerous": False,  # Will be set by tool_executor
                    "approval_status": None,
                })

            result = {
                "messages": [final_response] if final_response else [],
                "tool_calls": tool_calls,
                "token_usage": token_usage,
                "model": model_name,
            }

            # NOTE: Don't pass tools through state - StructuredTool objects can't be
            # serialized by the PostgreSQL checkpointer. MCP caching handles reuse.

            # Include partial response text if any (text before tool calls)
            # Mark as streamed so processor knows not to duplicate
            if response_text:
                result["partial_response"] = response_text
                if content_queue:
                    result["content_streamed"] = True

            # Include thinking if present
            # Mark as streamed so processor knows not to duplicate
            if thinking_content:
                result["thinking"] = thinking_content
                if thinking_emitted:
                    result["thinking_streamed"] = True

            print(f"[specialist] Returning result with keys: {list(result.keys())}, content_streamed: {result.get('content_streamed')}, thinking_streamed: {result.get('thinking_streamed')}", flush=True)
            return result

        # No tool calls - return final response
        final_content = response_text
        if not final_content and final_response:
            # Extract content from final response if not accumulated
            content = getattr(final_response, "content", "")
            if isinstance(content, str):
                final_content = content
            elif isinstance(content, list):
                final_content = "".join(
                    getattr(block, "text", "") for block in content
                    if hasattr(block, "type") and block.type == "text"
                )

        result = {
            "messages": [final_response] if final_response else [],
            "response": final_content or "",
            "token_usage": token_usage,
            "model": model_name,
        }

        # Include thinking if present
        # Mark as streamed so processor knows not to duplicate
        if thinking_content:
            result["thinking"] = thinking_content
            if thinking_emitted:
                result["thinking_streamed"] = True

        # Mark content as streamed so processor knows not to duplicate
        if content_queue and final_content:
            result["content_streamed"] = True

        print(f"[specialist] Returning FINAL result with keys: {list(result.keys())}, response length: {len(result.get('response', ''))}", flush=True)
        return result

    except Exception as e:
        error_msg = f"Error invoking specialist: {str(e)}"
        print(f"[specialist] {error_msg}")
        import traceback
        traceback.print_exc()
        return {
            "error": error_msg,
            "response": f"I encountered an error processing your request: {str(e)}",
        }


def has_tool_calls(state: GraphState) -> bool:
    """Check if the specialist response has tool calls to execute."""
    tool_calls = state.get("tool_calls", [])
    # Check for pending tool calls (no result yet)
    pending = [tc for tc in tool_calls if tc.get("result") is None]
    return len(pending) > 0


def needs_more_steps(state: GraphState) -> bool:
    """Check if we need to continue the agent loop."""
    # Continue if there are pending tool calls
    if has_tool_calls(state):
        return True

    # Stop if we have a final response
    if state.get("response"):
        return False

    # Stop if there's an error
    if state.get("error"):
        return False

    return False
