"""
Google Ad Manager Devicecategories Tools

Auto-generated MCP tools for deviceCategories endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksDeviceCategoriesInput,
    ListNetworksDeviceCategoriesInput,
)
from ..utils import handle_api_error, format_response


def register_deviceCategories_tools(mcp: FastMCP) -> None:
    """Register deviceCategories tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_device_categories",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_device_categories(params: GetNetworksDeviceCategoriesInput) -> str:
        """
        API to retrieve a `DeviceCategory` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_device_categories(params.network_code, params.device_categories_id)
            return format_response(response, "deviceCategories", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_device_categories",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_device_categories(params: ListNetworksDeviceCategoriesInput) -> str:
        """
        API to retrieve a list of `DeviceCategory` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_device_categories(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "deviceCategories", params.response_format)
        except Exception as e:
            return handle_api_error(e)

