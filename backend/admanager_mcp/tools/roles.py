"""
Google Ad Manager Roles Tools

Auto-generated MCP tools for roles endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksRolesInput,
    ListNetworksRolesInput,
)
from ..utils import handle_api_error, format_response


def register_roles_tools(mcp: FastMCP) -> None:
    """Register roles tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_roles",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_roles(params: GetNetworksRolesInput) -> str:
        """
        API to retrieve a `Role` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_roles(params.network_code, params.roles_id)
            return format_response(response, "roles", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_roles",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_roles(params: ListNetworksRolesInput) -> str:
        """
        API to retrieve a list of `Role` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_roles(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "roles", params.response_format)
        except Exception as e:
            return handle_api_error(e)

