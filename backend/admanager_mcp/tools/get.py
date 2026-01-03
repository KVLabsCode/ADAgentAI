"""
Google Ad Manager Get Tools

Auto-generated MCP tools for get endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksInput,
)
from ..utils import handle_api_error, format_response


def register_get_tools(mcp: FastMCP) -> None:
    """Register get tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks(params: GetNetworksInput) -> str:
        """
        API to retrieve a Network object.
        """
        try:
            client = get_client()
            response = await client.get_networks(params.network_code)
            return format_response(response, "get", params.response_format)
        except Exception as e:
            return handle_api_error(e)

