"""
Google Ad Manager Browserlanguages Tools

Auto-generated MCP tools for browserLanguages endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksBrowserLanguagesInput,
    ListNetworksBrowserLanguagesInput,
)
from ..utils import handle_api_error, format_response


def register_browserLanguages_tools(mcp: FastMCP) -> None:
    """Register browserLanguages tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_browser_languages",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_browser_languages(params: GetNetworksBrowserLanguagesInput) -> str:
        """
        API to retrieve a `BrowserLanguage` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_browser_languages(params.network_code, params.browser_languages_id)
            return format_response(response, "browserLanguages", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_browser_languages",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_browser_languages(params: ListNetworksBrowserLanguagesInput) -> str:
        """
        API to retrieve a list of `BrowserLanguage` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_browser_languages(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "browserLanguages", params.response_format)
        except Exception as e:
            return handle_api_error(e)

