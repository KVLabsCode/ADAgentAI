"""Specialist agent node - LLM agent with tools for ad platform operations.

Uses LangGraph's ReAct agent pattern for multi-step tool use.
The specialist is configured based on the routing result (service/capability).
"""

import os
from typing import Any
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langsmith import traceable

from ..state import GraphState
from .entity_loader import build_entity_system_prompt
from ...tools import get_tools_for_service


# Service-specific instructions
SERVICE_INSTRUCTIONS = {
    "admob": """
Instructions for AdMob:
1. Use "list_accounts" to get available accounts first
2. Use the account_id from step 1 for subsequent calls
3. For apps: use "list_apps" with the account_id
4. For ad units: use "list_ad_units" with the account_id
5. For reports: use the appropriate report generation tool

IMPORTANT: Always verify account IDs exist before using them.
""",
    "admanager": """
Instructions for Ad Manager:
1. Use "list_networks" to get network codes first
2. Use the network_code from step 1 for subsequent calls
3. For ad units: use "list_ad_units"
4. For reports: use the report tools

IMPORTANT: Always verify network codes exist before using them.
""",
    "general": """
You are a helpful assistant for ad monetization platforms.
Answer questions about AdMob and Google Ad Manager.
If the user needs to perform operations, suggest they connect their accounts first.
""",
}

# Agent role descriptions
AGENT_ROLES = {
    ("admob", "inventory"): {
        "role": "AdMob Inventory Specialist",
        "goal": "Help users manage their AdMob accounts, apps, and ad units",
    },
    ("admob", "reporting"): {
        "role": "AdMob Reporting Specialist",
        "goal": "Help users analyze revenue, eCPM, impressions, and performance metrics",
    },
    ("admob", "mediation"): {
        "role": "AdMob Mediation Specialist",
        "goal": "Help users optimize mediation groups, ad sources, and waterfalls",
    },
    ("admob", "experimentation"): {
        "role": "AdMob Experimentation Specialist",
        "goal": "Help users run and analyze A/B tests and experiments",
    },
    ("admanager", "inventory"): {
        "role": "Ad Manager Inventory Specialist",
        "goal": "Help users manage networks, ad units, placements, and sites",
    },
    ("admanager", "reporting"): {
        "role": "Ad Manager Reporting Specialist",
        "goal": "Help users generate and analyze performance reports",
    },
    ("admanager", "orders"): {
        "role": "Ad Manager Orders Specialist",
        "goal": "Help users manage orders, line items, campaigns, and creatives",
    },
    ("admanager", "deals"): {
        "role": "Ad Manager Deals Specialist",
        "goal": "Help users manage private auctions and programmatic deals",
    },
    ("admanager", "targeting"): {
        "role": "Ad Manager Targeting Specialist",
        "goal": "Help users configure custom targeting, audiences, and geo targeting",
    },
    ("general", "assistant"): {
        "role": "Ad Platform Assistant",
        "goal": "Help users with general questions about ad monetization",
    },
}


def _build_system_prompt(
    service: str,
    capability: str,
    user_context: dict,
    conversation_history: list[dict] | None,
) -> str:
    """Build the full system prompt for the specialist."""
    # Get role info
    role_info = AGENT_ROLES.get((service, capability), AGENT_ROLES[("general", "assistant")])

    # Get service instructions
    instructions = SERVICE_INSTRUCTIONS.get(service, SERVICE_INSTRUCTIONS["general"])

    # Get entity grounding section
    entity_section = build_entity_system_prompt(user_context)

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

    return f"""You are {role_info['role']}.

Goal: {role_info['goal']}

{entity_section}

{context_section}

{instructions}

## Response Guidelines
- Provide clear, actionable responses
- If you encounter errors, explain them clearly
- Always verify entity IDs before using them
- For write operations, confirm the action before proceeding
- Be concise but thorough
"""


def _get_model_from_selection(selected_model: str | None, enable_thinking: bool = True) -> ChatAnthropic:
    """Create LLM instance based on user's model selection.

    Args:
        selected_model: Model selection from frontend (e.g., "anthropic/claude-sonnet-4-20250514")
        enable_thinking: Enable extended thinking for complex reasoning

    Returns:
        Configured ChatAnthropic instance
    """
    # Determine model name
    model_name = "claude-sonnet-4-20250514"  # Default
    if selected_model:
        if selected_model.startswith("anthropic/"):
            model_name = selected_model.replace("anthropic/", "")
        elif selected_model.startswith("claude-"):
            model_name = selected_model

    # Base LLM config
    llm_kwargs: dict[str, Any] = {
        "model": model_name,
        "max_tokens": 16000,
    }

    # Enable extended thinking for deeper reasoning
    if enable_thinking:
        llm_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": 4096,  # Allow up to 4K tokens for thinking
        }
        llm_kwargs["temperature"] = 1  # Required for thinking mode
    else:
        llm_kwargs["temperature"] = 0.1

    return ChatAnthropic(**llm_kwargs)


@traceable(name="specialist_node", run_type="llm")
async def specialist_node(state: GraphState) -> dict:
    """Invoke the specialist LLM to generate a response or tool calls.

    This node:
    1. Builds the system prompt with entity grounding
    2. Loads MCP tools for the service
    3. Invokes the LLM with tools bound
    4. Returns either a response or tool calls for execution

    Args:
        state: Current graph state

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
    system_prompt = _build_system_prompt(
        service=service,
        capability=capability,
        user_context=user_context,
        conversation_history=conversation_history,
    )

    # Get appropriate LLM
    llm = _get_model_from_selection(selected_model)

    # Load MCP tools for this service
    try:
        tools = await get_tools_for_service(service, user_id)
        print(f"[specialist] Loaded {len(tools)} tools for service: {service}")

        # Bind tools to LLM
        if tools:
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

    # Add current query if not already in messages
    if not messages or messages[-1].content != user_query:
        llm_messages.append(HumanMessage(content=user_query))

    try:
        # Invoke LLM with tools
        response = await llm_with_tools.ainvoke(llm_messages)

        # Extract token usage from response metadata
        token_usage = {}
        if hasattr(response, "response_metadata"):
            usage = response.response_metadata.get("usage", {})
            token_usage = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
            }

        # Extract thinking content from response (extended thinking)
        thinking_content = None
        response_text = ""

        # Handle AIMessage with content blocks (extended thinking response)
        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, list):
                # Content is a list of blocks (thinking + text)
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "thinking":
                            thinking_content = block.get("thinking", "")
                        elif block.get("type") == "text":
                            response_text = block.get("text", "")
                    elif hasattr(block, "type"):
                        if block.type == "thinking":
                            thinking_content = getattr(block, "thinking", "")
                        elif block.type == "text":
                            response_text = getattr(block, "text", "")
            else:
                # Simple string content
                response_text = str(content)

        print(f"[specialist] Thinking: {thinking_content[:100] if thinking_content else 'None'}...")
        print(f"[specialist] Response: {response_text[:100] if response_text else 'None'}...")

        # Check if response has tool calls
        if hasattr(response, "tool_calls") and response.tool_calls:
            # Return tool calls for tool_executor to handle
            tool_calls = []
            for tc in response.tool_calls:
                tool_calls.append({
                    "id": tc.get("id", ""),
                    "name": tc.get("name", ""),
                    "args": tc.get("args", {}),
                    "result": None,
                    "is_dangerous": False,  # Will be set by tool_executor
                    "approval_status": None,
                })

            result = {
                "messages": [response],
                "tool_calls": tool_calls,
                "token_usage": token_usage,
                "model": llm.model,
            }

            # Include thinking if present
            if thinking_content:
                result["thinking"] = thinking_content

            return result

        # No tool calls - return final response
        result = {
            "messages": [response],
            "response": response_text or str(response.content),
            "token_usage": token_usage,
            "model": llm.model,
        }

        # Include thinking if present
        if thinking_content:
            result["thinking"] = thinking_content

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
