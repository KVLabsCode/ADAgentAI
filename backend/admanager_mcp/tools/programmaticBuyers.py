"""
Google Ad Manager Programmaticbuyers Tools

Auto-generated MCP tools for programmaticBuyers endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksProgrammaticBuyersInput,
    ListNetworksProgrammaticBuyersInput,
)
from ..utils import handle_api_error, format_response


def register_programmaticBuyers_tools(mcp: FastMCP) -> None:
    """Register programmaticBuyers tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_programmatic_buyers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_programmatic_buyers(params: GetNetworksProgrammaticBuyersInput) -> str:
        """
        API to retrieve a `ProgrammaticBuyer` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_programmatic_buyers(params.network_code, params.programmatic_buyers_id)
            return format_response(response, "programmaticBuyers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_programmatic_buyers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_programmatic_buyers(params: ListNetworksProgrammaticBuyersInput) -> str:
        """
        API to retrieve a list of `ProgrammaticBuyer` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_programmatic_buyers(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "programmaticBuyers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

