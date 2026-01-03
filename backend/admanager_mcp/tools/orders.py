"""
Google Ad Manager Orders Tools

Auto-generated MCP tools for orders endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksOrdersInput,
    ListNetworksOrdersInput,
)
from ..utils import handle_api_error, format_response


def register_orders_tools(mcp: FastMCP) -> None:
    """Register orders tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_orders",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_orders(params: GetNetworksOrdersInput) -> str:
        """
        API to retrieve an Order object.
        """
        try:
            client = get_client()
            response = await client.get_networks_orders(params.network_code, params.orders_id)
            return format_response(response, "orders", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_orders",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_orders(params: ListNetworksOrdersInput) -> str:
        """
        API to retrieve a list of `Order` objects. Fields used for literal matching in filter string: * `order_id` * `display_name` * `external_order_id`
        """
        try:
            client = get_client()
            response = await client.list_networks_orders(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "orders", params.response_format)
        except Exception as e:
            return handle_api_error(e)

