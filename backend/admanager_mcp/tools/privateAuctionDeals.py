"""
Google Ad Manager Privateauctiondeals Tools

Auto-generated MCP tools for privateAuctionDeals endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksPrivateAuctionDealsInput,
    ListNetworksPrivateAuctionDealsInput,
    CreateNetworksPrivateAuctionDealsInput,
    PatchNetworksPrivateAuctionDealsInput,
)
from ..utils import handle_api_error, format_response


def register_privateAuctionDeals_tools(mcp: FastMCP) -> None:
    """Register privateAuctionDeals tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_private_auction_deals",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_private_auction_deals(params: GetNetworksPrivateAuctionDealsInput) -> str:
        """
        API to retrieve a `PrivateAuctionDeal` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_private_auction_deals(params.network_code, params.private_auction_deals_id)
            return format_response(response, "privateAuctionDeals", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_private_auction_deals",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_private_auction_deals(params: ListNetworksPrivateAuctionDealsInput) -> str:
        """
        API to retrieve a list of `PrivateAuctionDeal` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_private_auction_deals(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "privateAuctionDeals", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_private_auction_deals",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_private_auction_deals(params: CreateNetworksPrivateAuctionDealsInput) -> str:
        """
        API to create a `PrivateAuctionDeal` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_private_auction_deals(params.network_code, params.data)
            return format_response(response, "privateAuctionDeals", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_private_auction_deals",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_private_auction_deals(params: PatchNetworksPrivateAuctionDealsInput) -> str:
        """
        API to update a `PrivateAuctionDeal` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_private_auction_deals(params.network_code, params.private_auction_deals_id, params.data, params.update_mask)
            return format_response(response, "privateAuctionDeals", params.response_format)
        except Exception as e:
            return handle_api_error(e)

