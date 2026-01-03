"""
Google Ad Manager MCP Server

Complete MCP server with all 154 API endpoints as tools.
Auto-generated from discovery document.
"""

import os
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from .tools import register_all_tools

load_dotenv()

# Initialize FastMCP server
mcp = FastMCP(
    name="admanager-mcp",
    instructions="""
    Google Ad Manager MCP Server - Complete API Access

    This server provides access to ALL 154 Google Ad Manager API endpoints.

    Getting Started:
    1. Use admanager_list_networks to find your network code
    2. Use the network_code in subsequent calls

    Resource Groups:
        - adUnitSizes: 1 tools
    - adUnits: 9 tools
    - applications: 2 tools
    - audienceSegments: 2 tools
    - bandwidthGroups: 2 tools
    - browserLanguages: 2 tools
    - browsers: 2 tools
    - cmsMetadataKeys: 2 tools
    - cmsMetadataValues: 2 tools
    - companies: 2 tools
    - contacts: 6 tools
    - content: 2 tools
    - contentBundles: 2 tools
    - contentLabels: 2 tools
    - creativeTemplates: 2 tools
    - customFields: 8 tools
    - customTargetingKeys: 10 tools
    - customTargetingValues: 2 tools
    - deviceCapabilities: 2 tools
    - deviceCategories: 2 tools
    - deviceManufacturers: 2 tools
    - entitySignalsMappings: 6 tools
    - geoTargets: 2 tools
    - get: 1 tools
    - lineItems: 2 tools
    - list: 1 tools
    - liveStreamEvents: 3 tools
    - liveStreamEventsByAssetKey: 5 tools
    - liveStreamEventsByCustomAssetKey: 3 tools
    - mobileCarriers: 2 tools
    - mobileDeviceSubmodels: 2 tools
    - mobileDevices: 2 tools
    - operatingSystemVersions: 2 tools
    - operatingSystems: 2 tools
    - operations: 4 tools
    - orders: 2 tools
    - placements: 9 tools
    - privateAuctionDeals: 4 tools
    - privateAuctions: 4 tools
    - programmaticBuyers: 2 tools
    - reports: 6 tools
    - roles: 2 tools
    - sites: 8 tools
    - taxonomyCategories: 2 tools
    - teams: 8 tools
    - users: 1 tools
    - webProperties: 3 tools

    Response Formats:
    - markdown (default): Human-readable formatted output
    - json: Machine-readable structured data
    """,
)

# Register all tools
register_all_tools(mcp)


def main():
    """Run the MCP server."""
    transport = os.getenv("TRANSPORT", "stdio")

    if transport == "http":
        port = int(os.getenv("PORT", "8001"))
        mcp.run(transport="streamable-http", port=port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
