"""
Google Ad Manager Content Tools

Auto-generated MCP tools for content endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksContentInput,
    ListNetworksContentInput,
)
from ..utils import handle_api_error, format_response


def register_content_tools(mcp: FastMCP) -> None:
    """Register content tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_content",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_content(params: GetNetworksContentInput) -> str:
        """
        API to retrieve a `Content` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_content(params.network_code, params.content_id)
            return format_response(response, "content", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_content",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_content(params: ListNetworksContentInput) -> str:
        """
        API to retrieve a list of `Content` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_content(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "content", params.response_format)
        except Exception as e:
            return handle_api_error(e)

