"""Entity loader node - loads user's provider entities for grounding.

This node fetches the user's connected providers (accounts, apps, ad units)
and injects them into the state for use in entity grounding.

Entity grounding prevents the LLM from hallucinating IDs by:
1. Pre-loading valid entities
2. Injecting them into the system prompt
3. Validating tool inputs against known entities
"""

import os
import httpx
from langsmith import traceable

from ..state import GraphState, UserContext


# API configuration
API_URL = os.environ.get("API_URL", "http://localhost:3001")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


async def _fetch_entities(user_id: str, organization_id: str | None, include_apps: bool = True) -> dict:
    """Fetch all user entities from the unified entities API.

    Returns:
        Dict with 'admob' and 'gam' sections containing accounts/networks with apps
    """
    try:
        params = {"userId": user_id, "includeApps": str(include_apps).lower()}
        if organization_id:
            params["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{API_URL}/api/internal/entities",
                params=params,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"[entity_loader] Error fetching entities: {e}")

    return {"admob": {"accounts": []}, "gam": {"networks": []}}


async def _fetch_providers(user_id: str, organization_id: str | None) -> list[dict]:
    """Fetch user's connected providers from the API (legacy wrapper)."""
    try:
        params = {"userId": user_id}
        if organization_id:
            params["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/list",
                params=params,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("providers", [])
    except Exception as e:
        print(f"[entity_loader] Error fetching providers: {e}")

    return []


async def _fetch_apps_for_provider(provider_id: str) -> list[dict]:
    """Fetch apps for an AdMob provider (legacy - use _fetch_entities instead)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/apps",
                params={"providerId": provider_id},
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("apps", [])
    except Exception as e:
        print(f"[entity_loader] Error fetching apps: {e}")

    return []


async def _fetch_ad_units_for_provider(provider_id: str) -> list[dict]:
    """Fetch ad units for an AdMob provider."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/ad-units",
                params={"providerId": provider_id},
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("adUnits", [])
    except Exception as e:
        print(f"[entity_loader] Error fetching ad units: {e}")

    return []


@traceable(name="entity_loader_node", run_type="chain")
async def entity_loader_node(state: GraphState) -> dict:
    """Load user's provider entities for grounding.

    Fetches all entities (accounts, apps) using the unified entities API.
    The API response is cached server-side for 5 minutes.

    Args:
        state: Current graph state with user_context

    Returns:
        Updated state with populated entity lists
    """
    user_context = state.get("user_context", {})
    user_id = user_context.get("user_id")
    organization_id = user_context.get("organization_id")

    if not user_id:
        print("[entity_loader] No user_id in context, skipping entity load")
        return {}

    # Fetch all entities using the unified endpoint (with caching)
    entities = await _fetch_entities(user_id, organization_id, include_apps=True)

    # Transform AdMob accounts to unified format
    accounts = []
    apps = []
    for acc in entities.get("admob", {}).get("accounts", []):
        accounts.append({
            "id": acc.get("id"),
            "name": acc.get("displayName", "Unknown Account"),
            "type": "admob",
            "identifier": acc.get("publisherId"),
            "enabled": acc.get("enabled", True),
        })
        # Flatten apps with parent account reference
        for app in acc.get("apps", []):
            apps.append({
                "id": app.get("id"),
                "name": app.get("name"),
                "platform": app.get("platform"),
                "account_id": acc.get("id"),
                "publisher_id": acc.get("publisherId"),
            })

    # Transform GAM networks to unified format
    for network in entities.get("gam", {}).get("networks", []):
        accounts.append({
            "id": network.get("id"),
            "name": network.get("displayName", "Unknown Network"),
            "type": "gam",
            "identifier": network.get("networkCode"),
            "enabled": network.get("enabled", True),
        })

    # Update user context with loaded entities
    updated_context: UserContext = {
        **user_context,
        "accounts": accounts,
        "apps": apps,  # Now loaded upfront (cached server-side)
        "ad_units": [],  # Still lazy loaded on demand
    }

    # Get context mode from user_context (passed from frontend)
    context_mode = user_context.get("context_mode", "soft")

    # Build entity system prompt for specialist
    entity_system_prompt = build_entity_system_prompt(updated_context)

    # Return both user_context and top-level entity fields for tool validation
    return {
        "user_context": updated_context,
        # Top-level fields for easy access in tool executor validation
        "available_accounts": accounts,
        "available_apps": apps,
        "context_mode": context_mode,
        "entity_system_prompt": entity_system_prompt,
    }


def build_entity_system_prompt(user_context: UserContext) -> str:
    """Build a system prompt section listing valid entities.

    This is injected into the specialist's system prompt to ground
    the LLM on valid entity IDs.
    """
    accounts = user_context.get("accounts", [])
    apps = user_context.get("apps", [])
    context_mode = user_context.get("context_mode", "soft")
    enabled_accounts = user_context.get("enabled_accounts", [])

    if not accounts:
        return """
## Available Entities
No connected ad accounts found. User needs to connect an AdMob or Ad Manager account first.
"""

    # Build account list with nested apps
    account_lines = []
    for acc in accounts:
        acc_id = acc.get("id")
        status = ""
        if context_mode == "strict" and enabled_accounts:
            if acc_id not in enabled_accounts:
                status = " (DISABLED - not in scope)"

        account_lines.append(
            f"- {acc.get('name')} ({acc.get('type')}): {acc.get('identifier')}{status}"
        )

        # Add apps for this account (AdMob only)
        if acc.get("type") == "admob":
            acc_apps = [a for a in apps if a.get("account_id") == acc_id]
            for app in acc_apps[:10]:  # Limit to first 10 apps per account
                account_lines.append(
                    f"  - App: {app.get('name')} ({app.get('platform')}) - ID: {app.get('id')}"
                )
            if len(acc_apps) > 10:
                account_lines.append(f"  - ... and {len(acc_apps) - 10} more apps")

    mode_instruction = ""
    if context_mode == "strict":
        mode_instruction = """
STRICT MODE: Only use accounts/entities explicitly enabled by the user.
If user asks about a disabled entity, inform them it's not in their current scope."""
    else:
        mode_instruction = """
SOFT MODE: Prefer enabled accounts, but allow explicit references to others."""

    return f"""
## Available Entities
{mode_instruction}

### Connected Accounts & Apps
{chr(10).join(account_lines)}

IMPORTANT: Only use these REAL account and app IDs. Never invent or guess IDs.
If an account/app isn't listed, it's not connected - inform the user.
"""
