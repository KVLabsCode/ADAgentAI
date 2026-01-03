"""
Google Ad Manager Devicecapabilities Tools

Auto-generated MCP tools for deviceCapabilities endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksDeviceCapabilitiesInput,
    ListNetworksDeviceCapabilitiesInput,
)
from ..utils import handle_api_error, format_response


def register_deviceCapabilities_tools(mcp: FastMCP) -> None:
    """Register deviceCapabilities tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_device_capabilities",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_device_capabilities(params: GetNetworksDeviceCapabilitiesInput) -> str:
        """
        API to retrieve a `DeviceCapability` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_device_capabilities(params.network_code, params.device_capabilities_id)
            return format_response(response, "deviceCapabilities", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_device_capabilities",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_device_capabilities(params: ListNetworksDeviceCapabilitiesInput) -> str:
        """
        API to retrieve a list of `DeviceCapability` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_device_capabilities(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "deviceCapabilities", params.response_format)
        except Exception as e:
            return handle_api_error(e)

