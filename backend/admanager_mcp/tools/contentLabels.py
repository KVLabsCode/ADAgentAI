"""
Google Ad Manager Contentlabels Tools

Auto-generated MCP tools for contentLabels endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksContentLabelsInput,
    ListNetworksContentLabelsInput,
)
from ..utils import handle_api_error, format_response


def register_contentLabels_tools(mcp: FastMCP) -> None:
    """Register contentLabels tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_content_labels",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_content_labels(params: GetNetworksContentLabelsInput) -> str:
        """
        API to retrieve a `ContentLabel` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_content_labels(params.network_code, params.content_labels_id)
            return format_response(response, "contentLabels", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_content_labels",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_content_labels(params: ListNetworksContentLabelsInput) -> str:
        """
        API to retrieve a list of `ContentLabel` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_content_labels(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "contentLabels", params.response_format)
        except Exception as e:
            return handle_api_error(e)

