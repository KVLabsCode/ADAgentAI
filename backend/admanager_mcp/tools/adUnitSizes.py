"""
Google Ad Manager Adunitsizes Tools

Auto-generated MCP tools for adUnitSizes endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    ListNetworksAdUnitSizesInput,
)
from ..utils import handle_api_error, format_response


def register_adUnitSizes_tools(mcp: FastMCP) -> None:
    """Register adUnitSizes tools with the MCP server."""

    @mcp.tool(
        name="admanager_list_networks_ad_unit_sizes",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_ad_unit_sizes(params: ListNetworksAdUnitSizesInput) -> str:
        """
        API to retrieve a list of AdUnitSize objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_ad_unit_sizes(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "adUnitSizes", params.response_format)
        except Exception as e:
            return handle_api_error(e)

