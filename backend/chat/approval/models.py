"""Approval models and dangerous tools list."""

from datetime import datetime
from threading import Event
from typing import Optional


class PendingApproval:
    """Stores state for a pending tool approval."""

    def __init__(self, tool_name: str, tool_input: str):
        self.tool_name = tool_name
        self.tool_input = tool_input
        self.event = Event()  # Threading event for blocking
        self.approved: Optional[bool] = None
        self.created_at = datetime.now()


# Tools that require human approval before execution (write/delete operations)
# These are the DISPLAY NAMES used by CrewAI @tool decorator
DANGEROUS_TOOLS = [
    # AdMob write operations
    "Create AdMob App",
    "Create AdMob Ad Unit",
    "Create Ad Unit Mapping",
    "Batch Create Ad Unit Mappings",
    "Create Mediation Group",
    "Update Mediation Group",
    "Create Mediation A/B Experiment",
    "Stop Mediation A/B Experiment",
    # Ad Manager write operations
    "Create Ad Unit",
    "Update Ad Unit",
    "Create Order",
    "Update Order",
    "Create Line Item",
    "Update Line Item",
    "Create Creative",
    "Create Site",
    "Update Site",
    "Submit Sites for Approval",
]


def is_dangerous_tool(tool_name: str) -> bool:
    """Check if a tool requires human approval."""
    return tool_name in DANGEROUS_TOOLS


# Mapping from CrewAI display names to MCP internal tool names
# When a tool is blocked, we block BOTH names
TOOL_NAME_MAPPING = {
    "Create AdMob App": "admob_create_app",
    "Create AdMob Ad Unit": "admob_create_ad_unit",
    "Create Ad Unit Mapping": "admob_create_ad_unit_mapping",
    "Batch Create Ad Unit Mappings": "admob_batch_create_ad_unit_mappings",
    "Create Mediation Group": "admob_create_mediation_group",
    "Update Mediation Group": "admob_update_mediation_group",
    "Create Mediation A/B Experiment": "admob_create_mediation_ab_experiment",
    "Stop Mediation A/B Experiment": "admob_stop_mediation_ab_experiment",
}


def get_mcp_tool_name(display_name: str) -> str | None:
    """Get the MCP internal tool name for a display name."""
    return TOOL_NAME_MAPPING.get(display_name)
