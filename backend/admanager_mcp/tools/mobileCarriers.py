"""
Google Ad Manager Mobilecarriers Tools

Auto-generated MCP tools for mobileCarriers endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksMobileCarriersInput,
    ListNetworksMobileCarriersInput,
)
from ..utils import handle_api_error, format_response


def register_mobileCarriers_tools(mcp: FastMCP) -> None:
    """Register mobileCarriers tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_mobile_carriers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_mobile_carriers(params: GetNetworksMobileCarriersInput) -> str:
        """
        API to retrieve a `MobileCarrier` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_mobile_carriers(params.network_code, params.mobile_carriers_id)
            return format_response(response, "mobileCarriers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_mobile_carriers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_mobile_carriers(params: ListNetworksMobileCarriersInput) -> str:
        """
        API to retrieve a list of `MobileCarrier` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_mobile_carriers(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "mobileCarriers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

