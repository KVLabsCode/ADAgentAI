"""
AdMob MCP Tools Package

Complete v1beta API tools for:
- Account management (list, get)
- App management (list, create)
- Ad unit management (list, create, mappings)
- Ad source discovery (list, adapters)
- Mediation groups (list, create, update, experiments)
- Reports (mediation, network, campaign)
"""

from .accounts import register_account_tools
from .apps import register_app_tools
from .ad_units import register_ad_unit_tools
from .ad_sources import register_ad_source_tools
from .mediation_groups import register_mediation_group_tools
from .reports import register_report_tools

__all__ = [
    "register_account_tools",
    "register_app_tools",
    "register_ad_unit_tools",
    "register_ad_source_tools",
    "register_mediation_group_tools",
    "register_report_tools",
]
