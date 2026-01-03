"""
Google Ad Manager MCP Tools

Auto-generated tool registrations for all 154 endpoints.
"""

from mcp.server.fastmcp import FastMCP

from .adUnitSizes import register_adUnitSizes_tools
from .adUnits import register_adUnits_tools
from .applications import register_applications_tools
from .audienceSegments import register_audienceSegments_tools
from .bandwidthGroups import register_bandwidthGroups_tools
from .browserLanguages import register_browserLanguages_tools
from .browsers import register_browsers_tools
from .cmsMetadataKeys import register_cmsMetadataKeys_tools
from .cmsMetadataValues import register_cmsMetadataValues_tools
from .companies import register_companies_tools
from .contacts import register_contacts_tools
from .content import register_content_tools
from .contentBundles import register_contentBundles_tools
from .contentLabels import register_contentLabels_tools
from .creativeTemplates import register_creativeTemplates_tools
from .customFields import register_customFields_tools
from .customTargetingKeys import register_customTargetingKeys_tools
from .customTargetingValues import register_customTargetingValues_tools
from .deviceCapabilities import register_deviceCapabilities_tools
from .deviceCategories import register_deviceCategories_tools
from .deviceManufacturers import register_deviceManufacturers_tools
from .entitySignalsMappings import register_entitySignalsMappings_tools
from .geoTargets import register_geoTargets_tools
from .get import register_get_tools
from .lineItems import register_lineItems_tools
from .list import register_list_tools
from .liveStreamEvents import register_liveStreamEvents_tools
from .liveStreamEventsByAssetKey import register_liveStreamEventsByAssetKey_tools
from .liveStreamEventsByCustomAssetKey import register_liveStreamEventsByCustomAssetKey_tools
from .mobileCarriers import register_mobileCarriers_tools
from .mobileDeviceSubmodels import register_mobileDeviceSubmodels_tools
from .mobileDevices import register_mobileDevices_tools
from .operatingSystemVersions import register_operatingSystemVersions_tools
from .operatingSystems import register_operatingSystems_tools
from .operations import register_operations_tools
from .orders import register_orders_tools
from .placements import register_placements_tools
from .privateAuctionDeals import register_privateAuctionDeals_tools
from .privateAuctions import register_privateAuctions_tools
from .programmaticBuyers import register_programmaticBuyers_tools
from .reports import register_reports_tools
from .roles import register_roles_tools
from .sites import register_sites_tools
from .taxonomyCategories import register_taxonomyCategories_tools
from .teams import register_teams_tools
from .users import register_users_tools
from .webProperties import register_webProperties_tools


def register_all_tools(mcp: FastMCP) -> None:
    """Register all Ad Manager tools with the MCP server."""
    register_adUnitSizes_tools(mcp)
    register_adUnits_tools(mcp)
    register_applications_tools(mcp)
    register_audienceSegments_tools(mcp)
    register_bandwidthGroups_tools(mcp)
    register_browserLanguages_tools(mcp)
    register_browsers_tools(mcp)
    register_cmsMetadataKeys_tools(mcp)
    register_cmsMetadataValues_tools(mcp)
    register_companies_tools(mcp)
    register_contacts_tools(mcp)
    register_content_tools(mcp)
    register_contentBundles_tools(mcp)
    register_contentLabels_tools(mcp)
    register_creativeTemplates_tools(mcp)
    register_customFields_tools(mcp)
    register_customTargetingKeys_tools(mcp)
    register_customTargetingValues_tools(mcp)
    register_deviceCapabilities_tools(mcp)
    register_deviceCategories_tools(mcp)
    register_deviceManufacturers_tools(mcp)
    register_entitySignalsMappings_tools(mcp)
    register_geoTargets_tools(mcp)
    register_get_tools(mcp)
    register_lineItems_tools(mcp)
    register_list_tools(mcp)
    register_liveStreamEvents_tools(mcp)
    register_liveStreamEventsByAssetKey_tools(mcp)
    register_liveStreamEventsByCustomAssetKey_tools(mcp)
    register_mobileCarriers_tools(mcp)
    register_mobileDeviceSubmodels_tools(mcp)
    register_mobileDevices_tools(mcp)
    register_operatingSystemVersions_tools(mcp)
    register_operatingSystems_tools(mcp)
    register_operations_tools(mcp)
    register_orders_tools(mcp)
    register_placements_tools(mcp)
    register_privateAuctionDeals_tools(mcp)
    register_privateAuctions_tools(mcp)
    register_programmaticBuyers_tools(mcp)
    register_reports_tools(mcp)
    register_roles_tools(mcp)
    register_sites_tools(mcp)
    register_taxonomyCategories_tools(mcp)
    register_teams_tools(mcp)
    register_users_tools(mcp)
    register_webProperties_tools(mcp)
