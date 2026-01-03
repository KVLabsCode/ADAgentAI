"""
Google Ad Manager Devicemanufacturers Tools

Auto-generated MCP tools for deviceManufacturers endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksDeviceManufacturersInput,
    ListNetworksDeviceManufacturersInput,
)
from ..utils import handle_api_error, format_response


def register_deviceManufacturers_tools(mcp: FastMCP) -> None:
    """Register deviceManufacturers tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_device_manufacturers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_device_manufacturers(params: GetNetworksDeviceManufacturersInput) -> str:
        """
        API to retrieve a `DeviceManufacturer` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_device_manufacturers(params.network_code, params.device_manufacturers_id)
            return format_response(response, "deviceManufacturers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_device_manufacturers",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_device_manufacturers(params: ListNetworksDeviceManufacturersInput) -> str:
        """
        API to retrieve a list of `DeviceManufacturer` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_device_manufacturers(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "deviceManufacturers", params.response_format)
        except Exception as e:
            return handle_api_error(e)

