"""
Google Ad Manager Cmsmetadatakeys Tools

Auto-generated MCP tools for cmsMetadataKeys endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCmsMetadataKeysInput,
    ListNetworksCmsMetadataKeysInput,
)
from ..utils import handle_api_error, format_response


def register_cmsMetadataKeys_tools(mcp: FastMCP) -> None:
    """Register cmsMetadataKeys tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_cms_metadata_keys",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_cms_metadata_keys(params: GetNetworksCmsMetadataKeysInput) -> str:
        """
        API to retrieve a `CmsMetadataKey` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_cms_metadata_keys(params.network_code, params.cms_metadata_keys_id)
            return format_response(response, "cmsMetadataKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_cms_metadata_keys",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_cms_metadata_keys(params: ListNetworksCmsMetadataKeysInput) -> str:
        """
        API to retrieve a list of `CmsMetadataKey` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_cms_metadata_keys(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "cmsMetadataKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

