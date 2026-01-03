"""
Google Ad Manager Lineitems Tools

Auto-generated MCP tools for lineItems endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksLineItemsInput,
    ListNetworksLineItemsInput,
)
from ..utils import handle_api_error, format_response


def register_lineItems_tools(mcp: FastMCP) -> None:
    """Register lineItems tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_line_items",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_line_items(params: GetNetworksLineItemsInput) -> str:
        """
        API to retrieve a `LineItem` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_line_items(params.network_code, params.line_items_id)
            return format_response(response, "lineItems", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_line_items",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_line_items(params: ListNetworksLineItemsInput) -> str:
        """
        API to retrieve a list of `LineItem` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_line_items(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "lineItems", params.response_format)
        except Exception as e:
            return handle_api_error(e)

