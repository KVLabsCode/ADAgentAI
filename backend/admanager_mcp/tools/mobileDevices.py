"""
Google Ad Manager Mobiledevices Tools

Auto-generated MCP tools for mobileDevices endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksMobileDevicesInput,
    ListNetworksMobileDevicesInput,
)
from ..utils import handle_api_error, format_response


def register_mobileDevices_tools(mcp: FastMCP) -> None:
    """Register mobileDevices tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_mobile_devices",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_mobile_devices(params: GetNetworksMobileDevicesInput) -> str:
        """
        API to retrieve a `MobileDevice` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_mobile_devices(params.network_code, params.mobile_devices_id)
            return format_response(response, "mobileDevices", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_mobile_devices",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_mobile_devices(params: ListNetworksMobileDevicesInput) -> str:
        """
        API to retrieve a list of `MobileDevice` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_mobile_devices(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "mobileDevices", params.response_format)
        except Exception as e:
            return handle_api_error(e)

