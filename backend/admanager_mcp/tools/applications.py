"""
Google Ad Manager Applications Tools

Auto-generated MCP tools for applications endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksApplicationsInput,
    ListNetworksApplicationsInput,
)
from ..utils import handle_api_error, format_response


def register_applications_tools(mcp: FastMCP) -> None:
    """Register applications tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_applications",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_applications(params: GetNetworksApplicationsInput) -> str:
        """
        API to retrieve a `Application` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_applications(params.network_code, params.applications_id)
            return format_response(response, "applications", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_applications",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_applications(params: ListNetworksApplicationsInput) -> str:
        """
        API to retrieve a list of `Application` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_applications(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "applications", params.response_format)
        except Exception as e:
            return handle_api_error(e)

