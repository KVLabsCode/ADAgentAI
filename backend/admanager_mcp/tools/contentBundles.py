"""
Google Ad Manager Contentbundles Tools

Auto-generated MCP tools for contentBundles endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksContentBundlesInput,
    ListNetworksContentBundlesInput,
)
from ..utils import handle_api_error, format_response


def register_contentBundles_tools(mcp: FastMCP) -> None:
    """Register contentBundles tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_content_bundles",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_content_bundles(params: GetNetworksContentBundlesInput) -> str:
        """
        API to retrieve a `ContentBundle` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_content_bundles(params.network_code, params.content_bundles_id)
            return format_response(response, "contentBundles", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_content_bundles",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_content_bundles(params: ListNetworksContentBundlesInput) -> str:
        """
        API to retrieve a list of `ContentBundle` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_content_bundles(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "contentBundles", params.response_format)
        except Exception as e:
            return handle_api_error(e)

