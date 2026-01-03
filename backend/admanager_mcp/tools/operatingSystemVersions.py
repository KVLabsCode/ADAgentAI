"""
Google Ad Manager Operatingsystemversions Tools

Auto-generated MCP tools for operatingSystemVersions endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksOperatingSystemVersionsInput,
    ListNetworksOperatingSystemVersionsInput,
)
from ..utils import handle_api_error, format_response


def register_operatingSystemVersions_tools(mcp: FastMCP) -> None:
    """Register operatingSystemVersions tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_operating_system_versions",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_operating_system_versions(params: GetNetworksOperatingSystemVersionsInput) -> str:
        """
        API to retrieve a `OperatingSystemVersion` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_operating_system_versions(params.network_code, params.operating_system_versions_id)
            return format_response(response, "operatingSystemVersions", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_operating_system_versions",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_operating_system_versions(params: ListNetworksOperatingSystemVersionsInput) -> str:
        """
        API to retrieve a list of `OperatingSystemVersion` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_operating_system_versions(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "operatingSystemVersions", params.response_format)
        except Exception as e:
            return handle_api_error(e)

