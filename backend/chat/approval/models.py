"""Approval models and dangerous tools list.

This module defines which MCP tools require human approval before execution.
All write operations (create, update, delete, activate, deactivate, archive,
submit, etc.) are considered dangerous and require approval.

LangGraph uses MCP tool names directly via interrupt().
"""

from datetime import datetime
from typing import Optional


class PendingApproval:
    """Stores state for a pending tool approval."""

    def __init__(self, tool_name: str, tool_input: str):
        self.tool_name = tool_name
        self.tool_input = tool_input
        self.approved: Optional[bool] = None
        self.modified_params: Optional[dict] = None  # User-modified parameters
        self.created_at = datetime.now()


# Tools that require human approval before execution (write/delete operations)
# These are MCP internal tool names used by LangGraph
DANGEROUS_TOOLS: set[str] = {
    # ==========================================================================
    # AdMob Write Operations (8 tools)
    # ==========================================================================
    "admob_create_app",
    "admob_create_ad_unit",
    "admob_create_ad_unit_mapping",
    "admob_batch_create_ad_unit_mappings",
    "admob_create_mediation_group",
    "admob_update_mediation_group",
    "admob_create_mediation_ab_experiment",
    "admob_stop_mediation_ab_experiment",

    # ==========================================================================
    # Ad Manager Write Operations (62 tools)
    # ==========================================================================

    # --- Ad Units ---
    "admanager_create_networks_ad_units",
    "admanager_patch_networks_ad_units",
    "admanager_batch_create_networks_ad_units",
    "admanager_batch_update_networks_ad_units",
    "admanager_batch_activate_networks_ad_units",
    "admanager_batch_deactivate_networks_ad_units",
    "admanager_batch_archive_networks_ad_units",

    # --- Contacts ---
    "admanager_create_networks_contacts",
    "admanager_patch_networks_contacts",
    "admanager_batch_create_networks_contacts",
    "admanager_batch_update_networks_contacts",

    # --- Custom Fields ---
    "admanager_create_networks_custom_fields",
    "admanager_patch_networks_custom_fields",
    "admanager_batch_create_networks_custom_fields",
    "admanager_batch_update_networks_custom_fields",
    "admanager_batch_activate_networks_custom_fields",
    "admanager_batch_deactivate_networks_custom_fields",

    # --- Custom Targeting Keys ---
    "admanager_create_networks_custom_targeting_keys",
    "admanager_patch_networks_custom_targeting_keys",
    "admanager_batch_create_networks_custom_targeting_keys",
    "admanager_batch_update_networks_custom_targeting_keys",
    "admanager_batch_activate_networks_custom_targeting_keys",
    "admanager_batch_deactivate_networks_custom_targeting_keys",

    # --- Entity Signals Mappings ---
    "admanager_create_networks_entity_signals_mappings",
    "admanager_patch_networks_entity_signals_mappings",
    "admanager_batch_create_networks_entity_signals_mappings",
    "admanager_batch_update_networks_entity_signals_mappings",

    # --- Live Stream Events ---
    "admanager_create_networks_live_stream_events_ad_breaks",
    "admanager_create_networks_live_stream_events_by_asset_key_ad_breaks",
    "admanager_create_networks_live_stream_events_by_custom_asset_key_ad_breaks",
    "admanager_patch_networks_live_stream_events_by_asset_key_ad_breaks",
    "admanager_delete_networks_live_stream_events_by_asset_key_ad_breaks",

    # --- Placements ---
    "admanager_create_networks_placements",
    "admanager_patch_networks_placements",
    "admanager_batch_create_networks_placements",
    "admanager_batch_update_networks_placements",
    "admanager_batch_activate_networks_placements",
    "admanager_batch_deactivate_networks_placements",
    "admanager_batch_archive_networks_placements",

    # --- Private Auctions ---
    "admanager_create_networks_private_auctions",
    "admanager_patch_networks_private_auctions",
    "admanager_create_networks_private_auction_deals",
    "admanager_patch_networks_private_auction_deals",

    # --- Reports ---
    "admanager_create_networks_reports",
    "admanager_patch_networks_reports",
    "admanager_run_networks_reports",

    # --- Sites ---
    "admanager_create_networks_sites",
    "admanager_patch_networks_sites",
    "admanager_batch_create_networks_sites",
    "admanager_batch_update_networks_sites",
    "admanager_batch_deactivate_networks_sites",
    "admanager_batch_submit_for_approval_networks_sites",

    # --- Teams ---
    "admanager_create_networks_teams",
    "admanager_patch_networks_teams",
    "admanager_batch_create_networks_teams",
    "admanager_batch_update_networks_teams",
    "admanager_batch_activate_networks_teams",
    "admanager_batch_deactivate_networks_teams",

    # --- Web Properties / Ad Review Center ---
    "admanager_batch_allow_networks_web_properties_ad_review_center_ads",
    "admanager_batch_block_networks_web_properties_ad_review_center_ads",

    # --- Operations (async) ---
    "admanager_cancel_operations",
    "admanager_delete_operations",
}


def is_dangerous_tool(tool_name: str) -> bool:
    """Check if a tool requires human approval.

    Args:
        tool_name: MCP tool name (e.g., "admob_create_app")

    Returns:
        True if tool requires approval before execution
    """
    return tool_name in DANGEROUS_TOOLS


def get_tool_display_name(mcp_tool_name: str) -> str:
    """Convert MCP tool name to human-readable display name.

    Examples:
        "admob_create_app" -> "Create App"
        "admanager_batch_activate_networks_ad_units" -> "Batch Activate Ad Units"
    """
    # Remove prefix
    name = mcp_tool_name
    if name.startswith("admob_"):
        name = name[6:]
    elif name.startswith("admanager_"):
        name = name[10:]

    # Remove "networks_" from Ad Manager tool names
    name = name.replace("networks_", "")

    # Convert snake_case to Title Case
    words = name.split("_")
    return " ".join(word.capitalize() for word in words)
