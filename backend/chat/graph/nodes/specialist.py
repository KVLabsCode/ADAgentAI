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
from ...tools import get_tools_for_service
from ...streaming.events import format_sse, ThinkingEvent
from ...utils.prompts import (
    get_system_prompt_template,
    get_service_instructions,
    get_agent_role,
)


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

    # Get appropriate LLM
    llm = _get_model_from_selection(selected_model)

    # Check if we're using an OpenRouter model (needs tool name sanitization)
    is_openrouter = selected_model and selected_model.startswith("openrouter/")

    # Load MCP tools for this service
    try:
        tools = await get_tools_for_service(service, user_id)
        print(f"[specialist] Loaded {len(tools)} tools for service: {service}")

        # Bind tools to LLM
        if tools:
            # Sanitize tool names for OpenRouter/Gemini compatibility
            if is_openrouter:
                print(f"[specialist] Sanitizing {len(tools)} tool names for OpenRouter/Gemini")
                tools = _sanitize_tools_for_gemini(tools)

            llm_with_tools = llm.bind_tools(tools)
        else:
            llm_with_tools = llm
            print(f"[specialist] Warning: No tools loaded for {service}")
    except Exception as e:
        print(f"[specialist] Error loading tools: {e}")
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
    if not messages or messages[-1].content != user_query:
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
                                # Accumulate thinking (Claude sends all thinking before text)
                                thinking_text = block.get("thinking", "")
                                if thinking_text:
                                    thinking_content = (thinking_content or "") + thinking_text
                            elif block.get("type") == "text":
                                text = block.get("text", "")
                                if text:
                                    # First text chunk means thinking is complete
                                    # Emit thinking to output_queue BEFORE content
                                    if not thinking_emitted and thinking_content and output_queue:
                                        await output_queue.put(format_sse(
                                            ThinkingEvent(content=thinking_content).model_dump(mode='json')
                                        ))
                                        thinking_emitted = True
                                    # Stream text to content queue
                                    if content_queue:
                                        await content_queue.put(text)
                                    response_text += text
                        elif hasattr(block, "type"):
                            if block.type == "thinking":
                                thinking_text = getattr(block, "thinking", "")
                                if thinking_text:
                                    thinking_content = (thinking_content or "") + thinking_text
                            elif block.type == "text":
                                text = getattr(block, "text", "")
                                if text:
                                    # First text chunk means thinking is complete
                                    # Emit thinking to output_queue BEFORE content
                                    if not thinking_emitted and thinking_content and output_queue:
                                        await output_queue.put(format_sse(
                                            ThinkingEvent(content=thinking_content).model_dump(mode='json')
                                        ))
                                        thinking_emitted = True
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
            if hasattr(final_response, "response_metadata"):
                usage = final_response.response_metadata.get("usage", {})
                token_usage = {
                    "input_tokens": usage.get("input_tokens") or usage.get("prompt_tokens", 0),
                    "output_tokens": usage.get("output_tokens") or usage.get("completion_tokens", 0),
                }

            # Get tool calls from final merged response
            if hasattr(final_response, "tool_calls") and final_response.tool_calls:
                tool_calls_accumulated = []
                for tc in final_response.tool_calls:
                    tool_calls_accumulated.append({
                        "id": tc.get("id", ""),
                        "name": tc.get("name", ""),
                        "args": tc.get("args", {}),
                    })

        # Get model name
        model_name = getattr(llm, "model", "unknown")

        print(f"[specialist] Model: {model_name}")
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
