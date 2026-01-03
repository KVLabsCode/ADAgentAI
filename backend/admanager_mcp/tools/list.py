"""
Google Ad Manager List Tools

Auto-generated MCP tools for list endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    ListNetworksInput,
)
from ..utils import handle_api_error, format_response


def register_list_tools(mcp: FastMCP) -> None:
    """Register list tools with the MCP server."""

    @mcp.tool(
        name="admanager_list_networks",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks(params: ListNetworksInput) -> str:
        """
        API to retrieve all the networks the current user has access to.
        """
        try:
            client = get_client()
            response = await client.list_networks(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "list", params.response_format)
        except Exception as e:
            return handle_api_error(e)

