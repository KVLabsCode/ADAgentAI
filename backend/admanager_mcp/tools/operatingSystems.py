"""
Google Ad Manager Operatingsystems Tools

Auto-generated MCP tools for operatingSystems endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksOperatingSystemsInput,
    ListNetworksOperatingSystemsInput,
)
from ..utils import handle_api_error, format_response


def register_operatingSystems_tools(mcp: FastMCP) -> None:
    """Register operatingSystems tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_operating_systems",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_operating_systems(params: GetNetworksOperatingSystemsInput) -> str:
        """
        API to retrieve a `OperatingSystem` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_operating_systems(params.network_code, params.operating_systems_id)
            return format_response(response, "operatingSystems", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_operating_systems",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_operating_systems(params: ListNetworksOperatingSystemsInput) -> str:
        """
        API to retrieve a list of `OperatingSystem` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_operating_systems(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "operatingSystems", params.response_format)
        except Exception as e:
            return handle_api_error(e)

