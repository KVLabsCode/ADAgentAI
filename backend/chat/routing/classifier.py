"""Query classification for routing to specialists."""

from crewai import LLM
from ad_platform_crew.config.settings import settings

# Classification prompt
CLASSIFICATION_PROMPT = """You are a routing assistant for an ad platform AI. Analyze the user's query and determine the best specialist to handle it.

## Available Specialists

**AdMob (Mobile App Monetization)**
- admob_inventory: Managing accounts, apps, ad units (list, create, configure)
- admob_reporting: Revenue, eCPM, impressions, performance analytics
- admob_mediation: Mediation groups, ad sources, waterfall optimization
- admob_experimentation: A/B tests, experiments

**Google Ad Manager (Web/Advanced Ads)**
- admanager_inventory: Networks, ad units, placements, sites, apps
- admanager_reporting: Reports, analytics, performance metrics
- admanager_orders: Orders, line items, campaigns, creatives
- admanager_deals: Private auctions, programmatic deals
- admanager_targeting: Custom targeting, audiences, geo targeting

**General**
- general: Greetings, help, capabilities, unclear queries

## Context
{context}

## Current Query
{query}

## Your Task
Think step-by-step:
1. What is the user asking about?
2. Does conversation context suggest a specific platform/area?
3. Which specialist has the right tools for this?

Then respond in this exact format:
THINKING: <your brief reasoning>
ROUTE: <category_name>"""

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

# Cached router LLM
_router_llm = None


def get_router_llm():
    """Get or create the router LLM (lightweight model for classification)."""
    global _router_llm
    if _router_llm is None:
        _router_llm = LLM(
            model=settings.llm.model_string,
            temperature=0.0,
            max_tokens=100,
        )
    return _router_llm


def classify_query(user_query: str, conversation_context: str = "") -> tuple[str, str, str]:
    """Classify a user query to determine routing.

    Args:
        user_query: The user's message
        conversation_context: Previous conversation for context

    Returns:
        Tuple of (service, capability, thinking)
    """
    llm = get_router_llm()

    # Build context string
    context_str = conversation_context if conversation_context else "No prior context."

    prompt = CLASSIFICATION_PROMPT.format(
        context=context_str,
        query=user_query
    )

    try:
        response = llm.call(messages=[{"role": "user", "content": prompt}])
        response_text = response if isinstance(response, str) else str(response)

        # Parse response
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

        print(f"  Unknown route '{route}', defaulting to general")
        return "general", "assistant", thinking

    except Exception as e:
        print(f"  Classification error: {e}, defaulting to general")
        return "general", "assistant", ""
