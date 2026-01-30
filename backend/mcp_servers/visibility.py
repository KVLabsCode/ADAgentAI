"""Dynamic Tool Visibility per session.

Filters MCP tools based on connected providers for the current user/org.
Users only see tools for networks they've authenticated with.

Key behaviors:
1. Tools are filtered at session start based on connected_providers
2. Disconnecting a provider immediately hides those tools
3. Connecting a provider immediately shows those tools
4. Tool calls to hidden tools return clear "Provider not connected" error
"""

import os
import httpx
from typing import Optional
from dataclasses import dataclass


# API configuration (same as dependencies.py)
API_URL = os.environ.get("API_URL", "http://localhost:3001")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


class ProviderNotConnectedError(Exception):
    """Raised when a tool is called for a disconnected provider."""
    pass


@dataclass
class ProviderStatus:
    """Status of a provider connection."""
    network: str
    connected: bool
    has_valid_credentials: bool = False
    last_verified: Optional[str] = None


# Network prefix to provider type mapping
# Maps tool prefixes to the provider type stored in connected_providers
NETWORK_TO_PROVIDER = {
    "admob": "admob",
    "admanager": "gam",
    "gam": "gam",
    "applovin": "applovin",
    "unity": "unity",
    "mintegral": "mintegral",
    "liftoff": "liftoff",
    "inmobi": "inmobi",
    "pangle": "pangle",
    "dtexchange": "dtexchange",
    "dt": "dtexchange",
}

# All supported network prefixes
ALL_NETWORK_PREFIXES = list(NETWORK_TO_PROVIDER.keys())


def get_tool_network(tool_name: str) -> Optional[str]:
    """Extract network from tool name prefix.

    Args:
        tool_name: MCP tool name (e.g., "admob_create_app")

    Returns:
        Network name or None if not a network-specific tool
    """
    name_lower = tool_name.lower()

    for prefix in ALL_NETWORK_PREFIXES:
        if name_lower.startswith(prefix + "_"):
            return NETWORK_TO_PROVIDER[prefix]

    # Master controller tools or unknown
    return None


def get_provider_type(network: str) -> str:
    """Map network name to provider type for database lookup.

    Args:
        network: Network name (e.g., "admob", "admanager")

    Returns:
        Provider type as stored in connected_providers table
    """
    return NETWORK_TO_PROVIDER.get(network.lower(), network)


async def get_connected_providers(
    user_id: str,
    organization_id: Optional[str] = None,
) -> set[str]:
    """Fetch connected providers for a user/org.

    Queries both OAuth providers (AdMob/GAM) and API-key networks.

    Args:
        user_id: User ID
        organization_id: Optional organization ID

    Returns:
        Set of connected provider types (e.g., {"admob", "gam", "applovin"})
    """
    connected = set()

    params = {"userId": user_id}
    if organization_id:
        params["organizationId"] = organization_id

    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch OAuth providers (AdMob, GAM)
        try:
            response = await client.get(
                f"{API_URL}/api/providers/internal/list",
                params=params,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )

            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                for p in providers:
                    provider_type = p.get("type")
                    if provider_type:
                        connected.add(provider_type)

        except Exception as e:
            print(f"[visibility] Error fetching OAuth providers: {type(e).__name__}")

        # Fetch ad sources (AppLovin, Unity, etc.)
        try:
            response = await client.get(
                f"{API_URL}/api/ad-sources/internal/list",
                params=params,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )

            if response.status_code == 200:
                data = response.json()
                ad_sources = data.get("adSources", [])
                for s in ad_sources:
                    ad_source_name = s.get("name")
                    if ad_source_name:
                        connected.add(ad_source_name)

        except Exception as e:
            print(f"[visibility] Error fetching ad sources: {type(e).__name__}")

    return connected


async def get_visible_tools(
    all_tools: list[str],
    user_id: str,
    organization_id: Optional[str] = None,
) -> list[str]:
    """Filter tools to only those for connected providers.

    Args:
        all_tools: List of all available tool names
        user_id: User ID
        organization_id: Optional organization ID

    Returns:
        Filtered list of tool names
    """
    connected = await get_connected_providers(user_id, organization_id)

    visible = []
    for tool_name in all_tools:
        network = get_tool_network(tool_name)

        # Master controller tools (no network prefix) are always visible
        if network is None:
            visible.append(tool_name)
            continue

        # Network-specific tools only visible if provider connected
        if network in connected:
            visible.append(tool_name)

    return visible


async def verify_tool_access(
    tool_name: str,
    user_id: str,
    organization_id: Optional[str] = None,
) -> None:
    """Verify user has access to a tool before execution.

    Raises ProviderNotConnectedError if the tool's network is not connected.

    Args:
        tool_name: MCP tool name
        user_id: User ID
        organization_id: Optional organization ID

    Raises:
        ProviderNotConnectedError: If provider not connected
    """
    network = get_tool_network(tool_name)

    # Master controller tools don't require provider connection
    if network is None:
        return

    connected = await get_connected_providers(user_id, organization_id)

    if network not in connected:
        network_display = network.upper() if network in ("gam",) else network.title()
        raise ProviderNotConnectedError(
            f"{network_display} is not connected. "
            f"Please connect your {network_display} account in Settings to use this tool."
        )


def get_tools_by_network(
    all_tools: list[str],
) -> dict[str, list[str]]:
    """Group tools by their network.

    Args:
        all_tools: List of all tool names

    Returns:
        Dict mapping network name to list of tool names
    """
    grouped: dict[str, list[str]] = {"master": []}

    for tool_name in all_tools:
        network = get_tool_network(tool_name)
        if network is None:
            grouped["master"].append(tool_name)
        else:
            if network not in grouped:
                grouped[network] = []
            grouped[network].append(tool_name)

    return grouped


def get_disconnect_message(network: str) -> str:
    """Get user-friendly message for disconnected provider.

    Args:
        network: Network name

    Returns:
        User-friendly error message
    """
    network_names = {
        "admob": "AdMob",
        "gam": "Google Ad Manager",
        "admanager": "Google Ad Manager",
        "applovin": "AppLovin MAX",
        "unity": "Unity LevelPlay",
        "mintegral": "Mintegral",
        "liftoff": "Liftoff",
        "inmobi": "InMobi",
        "pangle": "Pangle",
        "dtexchange": "DT Exchange",
    }

    display_name = network_names.get(network.lower(), network.title())

    return (
        f"I'd love to help with that, but {display_name} isn't connected yet. "
        f"Head over to Settings → Providers to connect your {display_name} account, "
        f"then I'll be able to access your data."
    )


async def check_all_provider_status(
    user_id: str,
    organization_id: Optional[str] = None,
) -> list[ProviderStatus]:
    """Check status of all supported providers for a user.

    Args:
        user_id: User ID
        organization_id: Optional organization ID

    Returns:
        List of ProviderStatus for all supported networks
    """
    connected = await get_connected_providers(user_id, organization_id)

    all_networks = [
        "admob", "gam", "applovin", "unity", "mintegral",
        "liftoff", "inmobi", "pangle", "dtexchange"
    ]

    return [
        ProviderStatus(
            network=network,
            connected=network in connected,
            has_valid_credentials=network in connected,  # Simplified - assume valid if connected
        )
        for network in all_networks
    ]
