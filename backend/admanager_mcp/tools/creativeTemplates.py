"""
Google Ad Manager Creativetemplates Tools

Auto-generated MCP tools for creativeTemplates endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCreativeTemplatesInput,
    ListNetworksCreativeTemplatesInput,
)
from ..utils import handle_api_error, format_response


def register_creativeTemplates_tools(mcp: FastMCP) -> None:
    """Register creativeTemplates tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_creative_templates",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_creative_templates(params: GetNetworksCreativeTemplatesInput) -> str:
        """
        API to retrieve a `CreativeTemplate` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_creative_templates(params.network_code, params.creative_templates_id)
            return format_response(response, "creativeTemplates", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_creative_templates",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_creative_templates(params: ListNetworksCreativeTemplatesInput) -> str:
        """
        API to retrieve a list of `CreativeTemplate` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_creative_templates(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "creativeTemplates", params.response_format)
        except Exception as e:
            return handle_api_error(e)

