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


# Network display names for user-friendly messages
NETWORK_DISPLAY_NAMES = {
    "admob": "Google AdMob",
    "gam": "Google Ad Manager",
    "admanager": "Google Ad Manager",
    "applovin": "AppLovin MAX",
    "unity": "Unity LevelPlay",
    "mintegral": "Mintegral",
    "liftoff": "Liftoff Monetize",
    "inmobi": "InMobi",
    "pangle": "Pangle",
    "dtexchange": "DT Exchange",
}


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


async def _fetch_api_key_networks(user_id: str, organization_id: str | None) -> list[str]:
    """Fetch user's connected API-key networks (AppLovin, Unity, Mintegral, etc.)

    Returns:
        List of network names that are connected (e.g., ["mintegral", "unity"])
    """
    try:
        params = {"userId": user_id}
        if organization_id:
            params["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/networks/internal/list",
                params=params,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )
            if response.status_code == 200:
                data = response.json()
                networks = data.get("networks", [])
                return [n.get("name") for n in networks if n.get("name")]
    except Exception as e:
        print(f"[entity_loader] Error fetching API-key networks: {e}")

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

    Also checks if the routed service has its required network connected,
    emitting action_required if not.

    Args:
        state: Current graph state with user_context and routing

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

    # Fetch API-key networks (AppLovin, Unity, Mintegral, etc.)
    api_key_networks = await _fetch_api_key_networks(user_id, organization_id)
    print(f"[entity_loader] Connected API-key networks: {api_key_networks}")

    # Transform AdMob accounts to unified format
    accounts = []
    apps = []
    ad_units = []
    has_admob = False
    has_gam = False

    for acc in entities.get("admob", {}).get("accounts", []):
        has_admob = True
        # In unified entities API: 'id' is the DB provider ID, 'publisherId' is the AdMob account
        provider_id = acc.get("id")  # DB provider ID for API calls
        publisher_id = acc.get("publisherId")

        accounts.append({
            "id": provider_id,  # Use DB provider ID as account ID for consistency
            "name": acc.get("displayName", "Unknown Account"),
            "type": "admob",
            "identifier": publisher_id,
            "enabled": acc.get("enabled", True),
        })

        # Flatten apps with parent account reference
        for app in acc.get("apps", []):
            apps.append({
                "id": app.get("id"),
                "name": app.get("name"),
                "platform": app.get("platform"),
                "account_id": provider_id,  # DB provider ID
                "publisher_id": publisher_id,
            })

        # Fetch ad units for this provider
        if provider_id:
            provider_ad_units = await _fetch_ad_units_for_provider(provider_id)
            for ad_unit in provider_ad_units:
                # API returns: {value: "ca-app-pub-XXX/YYY", label: "Name (FORMAT) #1234", adFormat: "BANNER", appId: "..."}
                ad_units.append({
                    "id": ad_unit.get("value"),  # Full ad unit ID like ca-app-pub-XXX/YYY
                    "name": ad_unit.get("label", "").split(" (")[0],  # Extract name before format
                    "format": ad_unit.get("adFormat"),  # BANNER, INTERSTITIAL, REWARDED, etc.
                    "app_id": ad_unit.get("appId"),
                    "account_id": provider_id,  # DB provider ID
                    "publisher_id": publisher_id,
                })

    # Transform GAM networks to unified format
    for network in entities.get("gam", {}).get("networks", []):
        has_gam = True
        accounts.append({
            "id": network.get("id"),
            "name": network.get("displayName", "Unknown Network"),
            "type": "gam",
            "identifier": network.get("networkCode"),
            "enabled": network.get("enabled", True),
        })

    # Build set of connected networks for quick lookup
    connected_networks = set(api_key_networks)
    if has_admob:
        connected_networks.add("admob")
    if has_gam:
        connected_networks.add("gam")
        connected_networks.add("admanager")  # Alias

    print(f"[entity_loader] Loaded {len(accounts)} accounts, {len(apps)} apps, {len(ad_units)} ad units")

    # Update user context with loaded entities
    updated_context: UserContext = {
        **user_context,
        "accounts": accounts,
        "apps": apps,  # Now loaded upfront (cached server-side)
        "ad_units": ad_units,  # Now loaded upfront for LLM grounding
        "connected_networks": list(connected_networks),  # Store for later use
    }

    # Get context mode from user_context (passed from frontend)
    context_mode = user_context.get("context_mode", "soft")

    # Build entity system prompt for specialist
    entity_system_prompt = build_entity_system_prompt(updated_context)

    # Check if the routed service requires a network that's not connected
    action_required = None
    routing = state.get("routing", {})
    routed_service = routing.get("service", "general")

    print(f"[entity_loader] Routed service: {routed_service}, Connected: {connected_networks}")

    # Skip check for general/orchestration routes
    if routed_service not in ("general", "orchestration"):
        if routed_service not in connected_networks:
            # The required network is not connected
            display_name = NETWORK_DISPLAY_NAMES.get(routed_service, routed_service.title())
            action_required = {
                "action_type": "connect_provider",
                "message": f"{display_name} is not connected. Connect {display_name} to access this feature.",
                "deep_link": "/providers",
                "blocking": True,
                "metadata": {"suggested_provider": routed_service},
            }
            print(f"[entity_loader] Network not connected: {routed_service}")

    # Fallback: Check if user has no connected providers at all
    if not action_required and not accounts and not api_key_networks:
        action_required = {
            "action_type": "connect_provider",
            "message": "You don't have any ad platforms connected. Connect AdMob or Google Ad Manager to get started.",
            "deep_link": "/providers",
            "blocking": True,
            "metadata": {"suggested_provider": "admob"},
        }

    # Check if this is a backflow refresh (clear the flag)
    is_refresh = state.get("needs_entity_refresh", False)
    if is_refresh:
        print("[entity_loader] Backflow refresh - clearing needs_entity_refresh flag")

    # Return both user_context and top-level entity fields for tool validation
    return {
        "user_context": updated_context,
        # Top-level fields for easy access in tool executor validation
        "available_accounts": accounts,
        "available_apps": apps,
        "available_ad_units": ad_units,
        "context_mode": context_mode,
        "entity_system_prompt": entity_system_prompt,
        # Action required for SSE emission
        "action_required": action_required,
        # Clear backflow flag to prevent infinite loop
        "needs_entity_refresh": None,
        "backflow_reason": None,
    }


def build_entity_system_prompt(user_context: UserContext) -> str:
    """Build a system prompt section listing valid entities.

    This is injected into the specialist's system prompt to ground
    the LLM on valid entity IDs.
    """
    accounts = user_context.get("accounts", [])
    apps = user_context.get("apps", [])
    ad_units = user_context.get("ad_units", [])
    connected_networks = user_context.get("connected_networks", [])
    context_mode = user_context.get("context_mode", "soft")
    enabled_by_pref = {a.get("id") for a in accounts if a.get("enabled", True)}
    enabled_by_pref.discard(None)
    selected = set(user_context.get("enabled_accounts", []))
    enabled_accounts = selected & enabled_by_pref if selected else enabled_by_pref

    if not accounts and not connected_networks:
        return """
## Available Entities
No connected ad platforms found. User needs to connect a provider first.
"""

    disabled_notice = ""
    if accounts and not enabled_accounts:
        disabled_notice = """
NOTICE: All connected accounts are currently disabled in settings or out of scope.
Ask the user to enable a provider in Context Settings or Providers before using tools."""

    # Build account list with nested apps and ad units
    account_lines = []
    for acc in accounts:
        acc_id = acc.get("id")
        status = ""
        if not acc.get("enabled", True):
            status = " (DISABLED - provider disabled in settings)"
        elif context_mode == "strict" and enabled_accounts:
            if acc_id not in enabled_accounts:
                status = " (DISABLED - not in scope)"

        account_lines.append(
            f"- {acc.get('name')} ({acc.get('type')}): {acc.get('identifier')}{status}"
        )

        # Add apps for this account (AdMob only)
        if acc.get("type") == "admob":
            acc_apps = [a for a in apps if a.get("account_id") == acc_id]
            for app in acc_apps[:10]:  # Limit to first 10 apps per account
                app_id = app.get("id")
                account_lines.append(
                    f"  - App: {app.get('name')} ({app.get('platform')}) - ID: {app_id}"
                )
                # Add ad units for this app
                app_ad_units = [u for u in ad_units if u.get("app_id") == app_id]
                for unit in app_ad_units[:5]:  # Limit to first 5 ad units per app
                    account_lines.append(
                        f"    - Ad Unit: {unit.get('name')} ({unit.get('format')}) - ID: {unit.get('id')}"
                    )
                if len(app_ad_units) > 5:
                    account_lines.append(f"    - ... and {len(app_ad_units) - 5} more ad units")

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

    # Build connected networks section
    networks_section = ""
    if connected_networks:
        network_names = [NETWORK_DISPLAY_NAMES.get(n, n.title()) for n in connected_networks if n]
        networks_section = f"""
### Connected Ad Networks
{', '.join(sorted(n for n in network_names if n))}
"""

    accounts_section = ""
    if account_lines:
        accounts_section = f"""
### Connected Accounts & Apps
{chr(10).join(account_lines)}
"""

    return f"""
## Available Entities
{mode_instruction}
{disabled_notice}
{networks_section}
{accounts_section}
IMPORTANT: Only use these REAL account, app, and ad unit IDs. Never invent or guess IDs.
If an account/app/ad unit/network isn't listed, it's not connected - inform the user.
"""
