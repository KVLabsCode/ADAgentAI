"""
Google Ad Manager Bandwidthgroups Tools

Auto-generated MCP tools for bandwidthGroups endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksBandwidthGroupsInput,
    ListNetworksBandwidthGroupsInput,
)
from ..utils import handle_api_error, format_response


def register_bandwidthGroups_tools(mcp: FastMCP) -> None:
    """Register bandwidthGroups tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_bandwidth_groups",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_bandwidth_groups(params: GetNetworksBandwidthGroupsInput) -> str:
        """
        API to retrieve a `BandwidthGroup` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_bandwidth_groups(params.network_code, params.bandwidth_groups_id)
            return format_response(response, "bandwidthGroups", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_bandwidth_groups",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_bandwidth_groups(params: ListNetworksBandwidthGroupsInput) -> str:
        """
        API to retrieve a list of `BandwidthGroup` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_bandwidth_groups(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "bandwidthGroups", params.response_format)
        except Exception as e:
            return handle_api_error(e)

