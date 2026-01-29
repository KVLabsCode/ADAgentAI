"""Tool Annotation System for MCP tools.

Provides metadata for the approval system to classify operations.
All create/update/delete operations are marked dangerous and require approval.

Risk levels:
- NONE: Read-only operations (list, get, search)
- LOW: Non-destructive modifications (enable/disable)
- MEDIUM: Create operations (reversible)
- HIGH: Update operations (may affect live traffic)
- CRITICAL: Delete operations (irreversible)
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional
import re


class RiskLevel(Enum):
    """Risk classification for tool operations."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolCategory(Enum):
    """Functional category of tools."""
    REPORTING = "reporting"
    INVENTORY = "inventory"
    MEDIATION = "mediation"
    APPS = "apps"
    AD_UNITS = "ad_units"
    ACCOUNTS = "accounts"
    TARGETING = "targeting"
    CREATIVES = "creatives"
    ORDERS = "orders"
    LINE_ITEMS = "line_items"
    GENERAL = "general"


@dataclass
class ToolAnnotation:
    """Annotation metadata for a tool.

    Attributes:
        is_dangerous: Whether this tool modifies data
        requires_approval: Whether human approval is required before execution
        category: Functional category of the tool
        risk_level: Risk classification
        network: Ad network this tool belongs to
        description: Human-readable description of what the tool does
        reversible: Whether the action can be undone
    """
    is_dangerous: bool = False
    requires_approval: bool = False
    category: ToolCategory = ToolCategory.GENERAL
    risk_level: RiskLevel = RiskLevel.NONE
    network: str = "unknown"
    description: str = ""
    reversible: bool = True

    def to_dict(self) -> dict:
        """Convert to dictionary for MCP tool discovery."""
        return {
            "is_dangerous": self.is_dangerous,
            "requires_approval": self.requires_approval,
            "category": self.category.value,
            "risk_level": self.risk_level.value,
            "network": self.network,
            "description": self.description,
            "reversible": self.reversible,
        }


# Pattern matchers for automatic classification
# These match after removing the network prefix (e.g., "admob_create_app" -> "create_app")
CREATE_PATTERNS = [
    r"_create_",
    r"_add_",
    r"_new_",
    r"^create_",
    r"^add_",
    r"^new_",
    r"_create$",
    r"_add$",
]

UPDATE_PATTERNS = [
    r"_update_",
    r"_modify_",
    r"_edit_",
    r"_patch_",
    r"^update_",
    r"^modify_",
    r"^edit_",
    r"^patch_",
    r"_update$",
    r"_modify$",
]

DELETE_PATTERNS = [
    r"_delete_",
    r"_remove_",
    r"_destroy_",
    r"^delete_",
    r"^remove_",
    r"^destroy_",
    r"_delete$",
    r"_remove$",
]

READ_PATTERNS = [
    r"_get_",
    r"_list_",
    r"_search_",
    r"_fetch_",
    r"_query_",
    r"^get_",
    r"^list_",
    r"^search_",
    r"^fetch_",
    r"^query_",
    r"_get$",
    r"_list$",
]

# Network prefix to network name mapping
NETWORK_PREFIXES = {
    "admob": "admob",
    "admanager": "admanager",
    "gam": "admanager",
    "applovin": "applovin",
    "unity": "unity",
    "mintegral": "mintegral",
    "liftoff": "liftoff",
    "inmobi": "inmobi",
    "pangle": "pangle",
    "dtexchange": "dtexchange",
    "dt": "dtexchange",
}

# Category keywords
CATEGORY_KEYWORDS = {
    ToolCategory.REPORTING: ["report", "revenue", "metrics", "analytics", "stats"],
    ToolCategory.INVENTORY: ["inventory", "placement"],
    ToolCategory.MEDIATION: ["mediation", "waterfall", "bidding", "ab_experiment"],
    ToolCategory.APPS: ["app", "application"],
    ToolCategory.AD_UNITS: ["ad_unit", "adunit"],
    ToolCategory.ACCOUNTS: ["account", "publisher"],
    ToolCategory.TARGETING: ["targeting", "audience", "segment", "geo"],
    ToolCategory.CREATIVES: ["creative", "asset", "banner", "video"],
    ToolCategory.ORDERS: ["order"],
    ToolCategory.LINE_ITEMS: ["line_item", "lineitem"],
}


def _matches_patterns(name: str, patterns: list[str]) -> bool:
    """Check if tool name matches any pattern."""
    name_lower = name.lower()
    return any(re.search(pattern, name_lower) for pattern in patterns)


def _get_network(tool_name: str) -> str:
    """Extract network from tool name prefix."""
    name_lower = tool_name.lower()
    for prefix, network in NETWORK_PREFIXES.items():
        if name_lower.startswith(prefix + "_"):
            return network
    return "unknown"


def _get_category(tool_name: str) -> ToolCategory:
    """Infer category from tool name."""
    name_lower = tool_name.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in name_lower for kw in keywords):
            return category
    return ToolCategory.GENERAL


def classify_tool(tool_name: str, http_method: Optional[str] = None) -> ToolAnnotation:
    """Automatically classify a tool based on its name and HTTP method.

    Args:
        tool_name: The MCP tool name (e.g., "admob_create_mediation_group")
        http_method: Optional HTTP method hint (GET, POST, PUT, PATCH, DELETE)

    Returns:
        ToolAnnotation with inferred metadata
    """
    network = _get_network(tool_name)
    category = _get_category(tool_name)

    # Determine operation type from name patterns
    if _matches_patterns(tool_name, DELETE_PATTERNS) or http_method == "DELETE":
        return ToolAnnotation(
            is_dangerous=True,
            requires_approval=True,
            category=category,
            risk_level=RiskLevel.CRITICAL,
            network=network,
            description=f"Delete operation - irreversible",
            reversible=False,
        )

    if _matches_patterns(tool_name, UPDATE_PATTERNS) or http_method in ("PUT", "PATCH"):
        return ToolAnnotation(
            is_dangerous=True,
            requires_approval=True,
            category=category,
            risk_level=RiskLevel.HIGH,
            network=network,
            description=f"Update operation - may affect live traffic",
            reversible=True,
        )

    if _matches_patterns(tool_name, CREATE_PATTERNS) or http_method == "POST":
        # Check if it's actually a read operation disguised as POST
        if _matches_patterns(tool_name, READ_PATTERNS):
            return ToolAnnotation(
                is_dangerous=False,
                requires_approval=False,
                category=category,
                risk_level=RiskLevel.NONE,
                network=network,
                description=f"Read operation",
                reversible=True,
            )

        return ToolAnnotation(
            is_dangerous=True,
            requires_approval=True,
            category=category,
            risk_level=RiskLevel.MEDIUM,
            network=network,
            description=f"Create operation - can be deleted if needed",
            reversible=True,
        )

    if _matches_patterns(tool_name, READ_PATTERNS) or http_method == "GET":
        return ToolAnnotation(
            is_dangerous=False,
            requires_approval=False,
            category=category,
            risk_level=RiskLevel.NONE,
            network=network,
            description=f"Read-only operation",
            reversible=True,
        )

    # Default: assume read-only for unknown operations
    return ToolAnnotation(
        is_dangerous=False,
        requires_approval=False,
        category=category,
        risk_level=RiskLevel.NONE,
        network=network,
        description=f"Unknown operation type",
        reversible=True,
    )


# Manual overrides for specific tools
TOOL_ANNOTATION_OVERRIDES: dict[str, ToolAnnotation] = {
    # Master controller tools - always safe
    "full_unity_admob_integration": ToolAnnotation(
        is_dangerous=True,
        requires_approval=True,
        category=ToolCategory.MEDIATION,
        risk_level=RiskLevel.HIGH,
        network="master",
        description="Orchestrates Unity-AdMob integration across networks",
        reversible=True,
    ),
    "global_revenue_summary": ToolAnnotation(
        is_dangerous=False,
        requires_approval=False,
        category=ToolCategory.REPORTING,
        risk_level=RiskLevel.NONE,
        network="master",
        description="Aggregates revenue across all networks",
        reversible=True,
    ),
    "check_network_health": ToolAnnotation(
        is_dangerous=False,
        requires_approval=False,
        category=ToolCategory.GENERAL,
        risk_level=RiskLevel.NONE,
        network="master",
        description="Checks health of all network connections",
        reversible=True,
    ),

    # AdMob stop experiment - special case (ends experiment)
    "accounts_mediationGroups_mediationAbExperiments_stop": ToolAnnotation(
        is_dangerous=True,
        requires_approval=True,
        category=ToolCategory.MEDIATION,
        risk_level=RiskLevel.HIGH,
        network="admob",
        description="Stops A/B experiment and applies winner - affects live traffic",
        reversible=False,
    ),
}


def get_tool_annotation(tool_name: str, http_method: Optional[str] = None) -> ToolAnnotation:
    """Get the annotation for a tool.

    Checks manual overrides first, then falls back to automatic classification.

    Args:
        tool_name: The MCP tool name
        http_method: Optional HTTP method hint

    Returns:
        ToolAnnotation for the tool
    """
    # Check overrides first
    if tool_name in TOOL_ANNOTATION_OVERRIDES:
        return TOOL_ANNOTATION_OVERRIDES[tool_name]

    # Fall back to automatic classification
    return classify_tool(tool_name, http_method)


def is_dangerous_tool(tool_name: str) -> bool:
    """Quick check if a tool is dangerous (requires approval).

    Args:
        tool_name: The MCP tool name

    Returns:
        True if the tool is classified as dangerous
    """
    annotation = get_tool_annotation(tool_name)
    return annotation.is_dangerous


def get_risk_level(tool_name: str) -> RiskLevel:
    """Get the risk level for a tool.

    Args:
        tool_name: The MCP tool name

    Returns:
        RiskLevel enum value
    """
    annotation = get_tool_annotation(tool_name)
    return annotation.risk_level


# Export all annotations for tool discovery
def get_all_annotations() -> dict[str, dict]:
    """Get annotations for all known tools.

    Returns:
        Dict mapping tool names to annotation dicts
    """
    return {name: ann.to_dict() for name, ann in TOOL_ANNOTATION_OVERRIDES.items()}


# ============================================================================
# Tool Tags for Two-Layer Semantic Routing
# ============================================================================
# Maps tool names to their network and capability tags for visibility filtering.
# This enables routing like "admob_mediation" to show only ~10 relevant tools
# instead of the full 171+ tools.

TOOL_TAGS: dict[str, dict[str, list[str]]] = {
    # === AdMob Tools ===
    # Tool names are generated from Discovery JSON: admob.X.Y.Z -> X_Y_Z
    "admob": {
        "inventory": [
            "accounts_list",
            "accounts_get",
            "accounts_apps_list",
            "accounts_apps_create",
            "accounts_adUnits_list",
            "accounts_adUnits_create",
        ],
        "reporting": [
            "accounts_mediationReport_generate",
            "accounts_networkReport_generate",
            "accounts_campaignReport_generate",
        ],
        "mediation": [
            "accounts_mediationGroups_list",
            "accounts_mediationGroups_create",
            "accounts_mediationGroups_patch",
            "accounts_adSources_list",
            "accounts_adSources_adapters_list",
            "accounts_adUnits_adUnitMappings_list",
            "accounts_adUnits_adUnitMappings_create",
            "accounts_adUnitMappings_batchCreate",
        ],
        "experimentation": [
            "accounts_mediationGroups_mediationAbExperiments_create",
            "accounts_mediationGroups_mediationAbExperiments_stop",
        ],
    },
    # === Google Ad Manager Tools ===
    "admanager": {
        "inventory": [
            "admanager_networks_adUnits_list",
            "admanager_networks_adUnits_get",
            "admanager_networks_placements_list",
            "admanager_networks_placements_get",
            "admanager_networks_sites_list",
            "admanager_networks_sites_get",
        ],
        "reporting": [
            "admanager_networks_reports_run",
            "admanager_networks_reports_list",
            "admanager_networks_reports_get",
            "admanager_networks_savedReports_run",
        ],
        "orders": [
            "admanager_networks_orders_list",
            "admanager_networks_orders_get",
            "admanager_networks_orders_lineItems_list",
            "admanager_networks_orders_lineItems_get",
            "admanager_networks_orders_lineItems_create",
            "admanager_networks_creatives_list",
            "admanager_networks_creatives_get",
        ],
        "deals": [
            "admanager_networks_privateAuctions_list",
            "admanager_networks_privateAuctions_get",
            "admanager_networks_privateAuctions_deals_list",
        ],
        "targeting": [
            "admanager_networks_customTargetingKeys_list",
            "admanager_networks_customTargetingKeys_get",
            "admanager_networks_customTargetingKeys_customTargetingValues_list",
            "admanager_networks_audienceSegments_list",
            "admanager_networks_audienceSegments_get",
        ],
    },
    # === AppLovin Tools ===
    "applovin": {
        "inventory": [
            "applovin_list_applications",
            "applovin_get_application",
            "applovin_list_ad_units",
            "applovin_get_ad_unit",
            "applovin_create_ad_unit",
            "applovin_update_ad_unit",
        ],
        "reporting": [
            "applovin_get_max_report",
            "applovin_get_advertiser_report",
        ],
        "mediation": [
            "applovin_list_placements",
            "applovin_get_placement",
            "applovin_create_placement",
            "applovin_update_placement",
            "applovin_list_ad_review_settings",
        ],
    },
    # === Unity LevelPlay Tools ===
    "unity": {
        "inventory": [
            "unity_list_apps",
            "unity_get_app",
            "unity_create_app",
            "unity_list_ad_units",
            "unity_get_ad_unit",
            "unity_create_ad_unit",
            "unity_update_ad_unit",
        ],
        "reporting": [
            "unity_get_monetization_report",
            "unity_get_user_ad_activity_report",
        ],
        "mediation": [
            "unity_list_mediation_groups",
            "unity_get_mediation_group",
            "unity_create_mediation_group",
            "unity_update_mediation_group",
            "unity_list_instances",
            "unity_create_instance",
            "unity_update_instance",
        ],
    },
    # === Mintegral Tools ===
    "mintegral": {
        "inventory": [
            "mintegral_list_apps",
            "mintegral_get_app",
            "mintegral_create_app",
            "mintegral_list_placements",
            "mintegral_get_placement",
            "mintegral_create_placement",
        ],
        "reporting": [
            "mintegral_get_publisher_report",
        ],
    },
    # === Liftoff Tools ===
    "liftoff": {
        "inventory": [
            "liftoff_list_apps",
            "liftoff_get_app",
            "liftoff_list_campaigns",
            "liftoff_get_campaign",
            "liftoff_create_campaign",
            "liftoff_list_creatives",
        ],
        "reporting": [
            "liftoff_get_performance_report",
        ],
    },
    # === InMobi Tools ===
    "inmobi": {
        "inventory": [
            "inmobi_list_apps",
            "inmobi_get_app",
            "inmobi_list_placements",
            "inmobi_get_placement",
            "inmobi_create_placement",
            "inmobi_update_placement",
        ],
        "reporting": [
            "inmobi_get_publisher_report",
        ],
    },
    # === Pangle Tools ===
    "pangle": {
        "inventory": [
            "pangle_list_apps",
            "pangle_get_app",
            "pangle_list_placements",
            "pangle_get_placement",
            "pangle_create_placement",
        ],
        "reporting": [
            "pangle_get_publisher_report",
        ],
    },
    # === DT Exchange Tools ===
    "dtexchange": {
        "inventory": [
            "dtexchange_list_apps",
            "dtexchange_get_app",
            "dtexchange_list_placements",
            "dtexchange_get_placement",
            "dtexchange_create_placement",
            "dtexchange_update_placement",
        ],
        "reporting": [
            "dtexchange_get_reporting_api",
        ],
    },
}


def get_tool_tags(tool_name: str) -> set[str]:
    """Get network and capability tags for a tool.

    Args:
        tool_name: The MCP tool name (e.g., "admob_create_mediation_group")

    Returns:
        Set of tags (e.g., {"admob", "mediation"})
    """
    tags: set[str] = set()

    for network, capabilities in TOOL_TAGS.items():
        for capability, tools in capabilities.items():
            if tool_name in tools:
                tags.add(network)
                tags.add(capability)

    # Fallback: extract network from prefix if not in explicit mapping
    if not tags:
        name_lower = tool_name.lower()
        for prefix, network in NETWORK_PREFIXES.items():
            if name_lower.startswith(prefix + "_"):
                tags.add(network)
                break

        # Try to infer capability from name
        category = _get_category(tool_name)
        if category != ToolCategory.GENERAL:
            tags.add(category.value)

    return tags


def get_tools_for_network_capability(network: str, capability: str) -> list[str]:
    """Get all tool names for a network + capability combination.

    Args:
        network: Network name (e.g., "admob")
        capability: Capability name (e.g., "mediation")

    Returns:
        List of tool names
    """
    network_tools = TOOL_TAGS.get(network, {})
    return network_tools.get(capability, [])
