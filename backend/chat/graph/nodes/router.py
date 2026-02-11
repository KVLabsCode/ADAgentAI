"""Router node - classifies queries to determine specialist routing.

Uses a lightweight LLM call to classify user queries into service/capability pairs.
This determines which specialist agent will handle the request.

Supports 9 ad networks:
- admob: Google AdMob (mediation, apps, ad units, reporting)
- admanager: Google Ad Manager (orders, line items, inventory, reporting)
- applovin: AppLovin MAX (mediation, reporting)
- unity: Unity LevelPlay (mediation, ad units, reporting)
- mintegral: Mintegral (campaigns, reporting)
- liftoff: Liftoff (campaigns, ads, reporting)
- inmobi: InMobi (placements, reporting)
- pangle: Pangle (ads, reporting)
- dtexchange: DT Exchange (placements, reporting)
"""

from typing import Literal
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable

from .llm import get_llm, get_model_name

from ..state import GraphState
from ...utils.prompts import get_router_prompt

# ============================================================================
# Network and Capability Definitions
# ============================================================================

# All 9 supported ad networks
SUPPORTED_NETWORKS = [
    "admob",
    "admanager",
    "applovin",
    "unity",
    "mintegral",
    "liftoff",
    "inmobi",
    "pangle",
    "dtexchange",
]

# Capabilities vary by network based on their actual API capabilities
NETWORK_CAPABILITIES: dict[str, list[str]] = {
    "admob": ["inventory", "reporting", "mediation", "experimentation"],
    "admanager": ["inventory", "reporting", "orders", "deals", "targeting"],
    "applovin": ["inventory", "reporting", "mediation"],
    "unity": ["inventory", "reporting", "mediation"],
    "mintegral": ["inventory", "reporting"],
    "liftoff": ["inventory", "reporting"],
    "inmobi": ["inventory", "reporting"],
    "pangle": ["inventory", "reporting"],
    "dtexchange": ["inventory", "reporting"],
}

# ============================================================================
# Dynamic Route Map Generation
# ============================================================================


def _build_route_map() -> dict[str, tuple[str, str]]:
    """Build the route map dynamically from network/capability definitions.

    Returns:
        Dict mapping route keys to (network, capability) tuples
    """
    route_map: dict[str, tuple[str, str]] = {
        "general": ("general", "assistant"),
    }

    # Generate routes for each network × capability combination
    for network, capabilities in NETWORK_CAPABILITIES.items():
        for capability in capabilities:
            route_key = f"{network}_{capability}"
            route_map[route_key] = (network, capability)

    # Cross-network orchestration routes
    route_map["orchestration_mediation"] = ("orchestration", "mediation")
    route_map["orchestration_reporting"] = ("orchestration", "reporting")

    return route_map


# Build the route map at module load time
ROUTE_MAP = _build_route_map()


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


def _parse_router_response(response_text: str) -> tuple[str, str, str, str]:
    """Parse router LLM response to extract thinking, route, and execution path.

    Returns: (service, capability, thinking, execution_path)
    """
    thinking = ""
    route = "general"
    path = "workflow"  # Default to workflow (safer, uses more capable model)

    lines = response_text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if line.startswith("THINKING:"):
            thinking = line[9:].strip()
        elif line.startswith("ROUTE:"):
            route = line[6:].strip().lower().replace('"', '').replace("'", "")
        elif line.startswith("PATH:"):
            path = line[5:].strip().lower()
            if path not in ("reactive", "workflow"):
                path = "workflow"  # Default to workflow for invalid values

    # Map route to service/capability
    if route in ROUTE_MAP:
        service, capability = ROUTE_MAP[route]
        return service, capability, thinking, path

    return "general", "assistant", thinking, path


@traceable(name="router_node", run_type="chain")
async def router_node(state: GraphState) -> dict:
    """Classify the user query to determine routing.

    Supports backflow: if specialist set needs_reroute, use that query instead.
    This enables topic changes mid-conversation (e.g., "now show my GAM orders").

    Args:
        state: Current graph state with user_query

    Returns:
        Updated state with routing result
    """
    # Check for backflow reroute (specialist sent us back with a new query)
    reroute_query = state.get("needs_reroute")
    is_backflow = reroute_query is not None

    # Use reroute query if present, otherwise use original query
    user_query = reroute_query if reroute_query else state.get("user_query", "")
    conversation_history = state.get("conversation_history")

    if is_backflow:
        print(f"[router] Backflow reroute with query: {user_query[:50]}...")

    # Build context string
    context_str = _build_context_string(conversation_history)

    # Get connected networks from state (pre-fetched in run_graph)
    user_context = state.get("user_context", {})
    connected_networks = user_context.get("connected_networks", [])

    # Build connected networks context for the router
    networks_str = ", ".join(connected_networks) if connected_networks else "none"

    # Create router LLM (lightweight, fast)
    router_llm = get_llm(role="haiku", temperature=0.0, max_tokens=150)

    # Build messages with prompt from LangSmith
    router_prompt = get_router_prompt()
    messages = [
        SystemMessage(content=router_prompt),
        HumanMessage(content=f"Connected networks: {networks_str}\n\nContext:\n{context_str}\n\nQuery: {user_query}"),
    ]

    try:
        # Use async invoke to avoid blocking on Windows
        response = await router_llm.ainvoke(messages)
        response_text = response.content if hasattr(response, "content") else str(response)

        service, capability, thinking, execution_path = _parse_router_response(response_text)

        # Extract token usage from router response
        token_usage = {}
        if hasattr(response, "response_metadata") and response.response_metadata:
            usage = response.response_metadata.get("usage", {})
            token_usage = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
            }
            print(f"[router] Token usage: {token_usage}")

        print(f"[router] Classified: service={service}, capability={capability}, path={execution_path}")

        result = {
            "routing": {
                "service": service,
                "capability": capability,
                "thinking": thinking,
                "execution_path": execution_path,
            },
            "router_token_usage": token_usage,
            "router_model": get_model_name("haiku"),
        }

        # Clear backflow flags to prevent infinite loops
        if is_backflow:
            result["needs_reroute"] = None
            result["backflow_reason"] = None
            # Update user_query to the new query for downstream nodes
            result["user_query"] = user_query

        return result

    except Exception as e:
        print(f"[router] Error classifying query: {e}", flush=True)
        result = {
            "routing": {
                "service": "general",
                "capability": "assistant",
                "thinking": f"Routing error: {str(e)}",
                "execution_path": "workflow",  # Default to workflow on error
            }
        }
        # Clear backflow flags even on error
        if is_backflow:
            result["needs_reroute"] = None
            result["backflow_reason"] = None
        return result


def should_use_specialist(state: GraphState) -> Literal["specialist", "general"]:
    """Conditional edge: determine if we need a specialist or general agent."""
    routing = state.get("routing", {})
    service = routing.get("service", "general")

    if service == "general":
        return "general"
    return "specialist"
