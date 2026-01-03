"""
Google Ad Manager Customtargetingvalues Tools

Auto-generated MCP tools for customTargetingValues endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCustomTargetingValuesInput,
    ListNetworksCustomTargetingValuesInput,
)
from ..utils import handle_api_error, format_response


def register_customTargetingValues_tools(mcp: FastMCP) -> None:
    """Register customTargetingValues tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_custom_targeting_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_custom_targeting_values(params: GetNetworksCustomTargetingValuesInput) -> str:
        """
        API to retrieve a `CustomTargetingValue` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_custom_targeting_values(params.network_code, params.custom_targeting_values_id)
            return format_response(response, "customTargetingValues", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_custom_targeting_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_custom_targeting_values(params: ListNetworksCustomTargetingValuesInput) -> str:
        """
        API to retrieve a list of `CustomTargetingValue` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_custom_targeting_values(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "customTargetingValues", params.response_format)
        except Exception as e:
            return handle_api_error(e)

