"""Router node - classifies queries to determine specialist routing.

Uses a lightweight LLM call to classify user queries into service/capability pairs.
This determines which specialist agent will handle the request.
"""

from typing import Literal
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable

from ..state import GraphState
from ...utils.prompts import get_router_prompt

# Route map: category -> (service, capability)
ROUTE_MAP = {
    "general": ("general", "assistant"),
    "admob_inventory": ("admob", "inventory"),
    "admob_reporting": ("admob", "reporting"),
    "admob_mediation": ("admob", "mediation"),
    "admob_experimentation": ("admob", "experimentation"),
    "admanager_inventory": ("admanager", "inventory"),
    "admanager_reporting": ("admanager", "reporting"),
    "admanager_orders": ("admanager", "orders"),
    "admanager_deals": ("admanager", "deals"),
    "admanager_targeting": ("admanager", "targeting"),
}


def _build_context_string(conversation_history: list[dict] | None) -> str:
    """Build context string from conversation history."""
    if not conversation_history:
        return "No prior context."

    recent = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
    context_parts = []

    for msg in recent:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")[:200]
        context_parts.append(f"{role}: {content}")

    return "\n".join(context_parts)


def _parse_router_response(response_text: str) -> tuple[str, str, str]:
    """Parse router LLM response to extract thinking and route.

    Returns: (service, capability, thinking)
    """
    thinking = ""
    route = "general"

    lines = response_text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if line.startswith("THINKING:"):
            thinking = line[9:].strip()
        elif line.startswith("ROUTE:"):
            route = line[6:].strip().lower().replace('"', '').replace("'", "")

    # Map route to service/capability
    if route in ROUTE_MAP:
        service, capability = ROUTE_MAP[route]
        return service, capability, thinking

    return "general", "assistant", thinking


@traceable(name="router_node", run_type="chain")
async def router_node(state: GraphState) -> dict:
    """Classify the user query to determine routing.

    Args:
        state: Current graph state with user_query

    Returns:
        Updated state with routing result
    """
    user_query = state.get("user_query", "")
    conversation_history = state.get("conversation_history")

    # Build context string
    context_str = _build_context_string(conversation_history)

    # Create router LLM (lightweight, fast)
    # Using Claude Haiku for routing - fast and cheap
    router_llm = ChatAnthropic(
        model="claude-3-5-haiku-20241022",
        temperature=0.0,
        max_tokens=150,
    )

    # Build messages with prompt from LangSmith
    router_prompt = get_router_prompt()
    messages = [
        SystemMessage(content=router_prompt),
        HumanMessage(content=f"Context:\n{context_str}\n\nQuery: {user_query}"),
    ]

    try:
        # Use async invoke to avoid blocking on Windows
        response = await router_llm.ainvoke(messages)
        response_text = response.content if hasattr(response, "content") else str(response)

        service, capability, thinking = _parse_router_response(response_text)

        return {
            "routing": {
                "service": service,
                "capability": capability,
                "thinking": thinking,
            }
        }

    except Exception as e:
        print(f"[router] Error classifying query: {e}", flush=True)
        return {
            "routing": {
                "service": "general",
                "capability": "assistant",
                "thinking": f"Routing error: {str(e)}",
            }
        }


def should_use_specialist(state: GraphState) -> Literal["specialist", "general"]:
    """Conditional edge: determine if we need a specialist or general agent."""
    routing = state.get("routing", {})
    service = routing.get("service", "general")

    if service == "general":
        return "general"
    return "specialist"
