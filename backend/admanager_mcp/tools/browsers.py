"""
Google Ad Manager Browsers Tools

Auto-generated MCP tools for browsers endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksBrowsersInput,
    ListNetworksBrowsersInput,
)
from ..utils import handle_api_error, format_response


def register_browsers_tools(mcp: FastMCP) -> None:
    """Register browsers tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_browsers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_browsers(params: GetNetworksBrowsersInput) -> str:
        """
        API to retrieve a `Browser` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_browsers(params.network_code, params.browsers_id)
            return format_response(response, "browsers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_browsers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_browsers(params: ListNetworksBrowsersInput) -> str:
        """
        API to retrieve a list of `Browser` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_browsers(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "browsers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

