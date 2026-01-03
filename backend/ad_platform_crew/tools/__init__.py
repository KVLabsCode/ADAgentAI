"""Ad Platform MCP Tools for CrewAI integration."""

from .mcp_client import MCPClient
from .admob_tools import (
    list_accounts,
    get_account,
    list_apps,
    list_ad_units,
    generate_mediation_report,
    generate_network_report,
    get_all_tools as get_all_admob_tools,
    get_tool_registry as get_admob_tool_registry,
)

# Import Ad Manager tools
from .admanager_tools import (
    list_networks,
    list_ad_units as list_admanager_ad_units,
    get_ad_unit as get_admanager_ad_unit,
    list_placements,
    list_reports,
    get_all_tools as get_all_admanager_tools,
    get_tool_registry as get_admanager_tool_registry,
)

__all__ = [
    # MCP Client
    "MCPClient",
    # AdMob Tools
    "list_accounts",
    "get_account",
    "list_apps",
    "list_ad_units",
    "generate_mediation_report",
    "generate_network_report",
    "get_all_admob_tools",
    "get_admob_tool_registry",
    # Ad Manager Tools
    "list_networks",
    "list_admanager_ad_units",
    "get_admanager_ad_unit",
    "list_placements",
    "list_reports",
    "get_all_admanager_tools",
    "get_admanager_tool_registry",
]
