"""
Google Ad Manager Users Tools

Auto-generated MCP tools for users endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksUsersInput,
)
from ..utils import handle_api_error, format_response


def register_users_tools(mcp: FastMCP) -> None:
    """Register users tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_users",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_users(params: GetNetworksUsersInput) -> str:
        """
        API to retrieve a User object. To get the current user, the resource name `networks/{networkCode}/users/me` can be used.
        """
        try:
            client = get_client()
            response = await client.get_networks_users(params.network_code, params.users_id)
            return format_response(response, "users", params.response_format)
        except Exception as e:
            return handle_api_error(e)

