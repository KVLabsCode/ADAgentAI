"""
Google Ad Manager Geotargets Tools

Auto-generated MCP tools for geoTargets endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksGeoTargetsInput,
    ListNetworksGeoTargetsInput,
)
from ..utils import handle_api_error, format_response


def register_geoTargets_tools(mcp: FastMCP) -> None:
    """Register geoTargets tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_geo_targets",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_geo_targets(params: GetNetworksGeoTargetsInput) -> str:
        """
        API to retrieve a `GeoTarget` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_geo_targets(params.network_code, params.geo_targets_id)
            return format_response(response, "geoTargets", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_geo_targets",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_geo_targets(params: ListNetworksGeoTargetsInput) -> str:
        """
        API to retrieve a list of `GeoTarget` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_geo_targets(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "geoTargets", params.response_format)
        except Exception as e:
            return handle_api_error(e)

