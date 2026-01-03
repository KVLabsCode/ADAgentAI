"""
Google Ad Manager Cmsmetadatavalues Tools

Auto-generated MCP tools for cmsMetadataValues endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCmsMetadataValuesInput,
    ListNetworksCmsMetadataValuesInput,
)
from ..utils import handle_api_error, format_response


def register_cmsMetadataValues_tools(mcp: FastMCP) -> None:
    """Register cmsMetadataValues tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_cms_metadata_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_cms_metadata_values(params: GetNetworksCmsMetadataValuesInput) -> str:
        """
        API to retrieve a `CmsMetadataValue` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_cms_metadata_values(params.network_code, params.cms_metadata_values_id)
            return format_response(response, "cmsMetadataValues", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_cms_metadata_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_cms_metadata_values(params: ListNetworksCmsMetadataValuesInput) -> str:
        """
        API to retrieve a list of `CmsMetadataValue` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_cms_metadata_values(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "cmsMetadataValues", params.response_format)
        except Exception as e:
            return handle_api_error(e)

