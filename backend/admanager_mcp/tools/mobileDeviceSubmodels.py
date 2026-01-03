"""
Google Ad Manager Mobiledevicesubmodels Tools

Auto-generated MCP tools for mobileDeviceSubmodels endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksMobileDeviceSubmodelsInput,
    ListNetworksMobileDeviceSubmodelsInput,
)
from ..utils import handle_api_error, format_response


def register_mobileDeviceSubmodels_tools(mcp: FastMCP) -> None:
    """Register mobileDeviceSubmodels tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_mobile_device_submodels",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_mobile_device_submodels(params: GetNetworksMobileDeviceSubmodelsInput) -> str:
        """
        API to retrieve a `MobileDeviceSubmodel` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_mobile_device_submodels(params.network_code, params.mobile_device_submodels_id)
            return format_response(response, "mobileDeviceSubmodels", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_mobile_device_submodels",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_mobile_device_submodels(params: ListNetworksMobileDeviceSubmodelsInput) -> str:
        """
        API to retrieve a list of `MobileDeviceSubmodel` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_mobile_device_submodels(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "mobileDeviceSubmodels", params.response_format)
        except Exception as e:
            return handle_api_error(e)

