"""
Google Ad Manager Companies Tools

Auto-generated MCP tools for companies endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCompaniesInput,
    ListNetworksCompaniesInput,
)
from ..utils import handle_api_error, format_response


def register_companies_tools(mcp: FastMCP) -> None:
    """Register companies tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_companies",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_companies(params: GetNetworksCompaniesInput) -> str:
        """
        API to retrieve a `Company` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_companies(params.network_code, params.companies_id)
            return format_response(response, "companies", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_companies",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_companies(params: ListNetworksCompaniesInput) -> str:
        """
        API to retrieve a list of `Company` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_companies(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "companies", params.response_format)
        except Exception as e:
            return handle_api_error(e)

