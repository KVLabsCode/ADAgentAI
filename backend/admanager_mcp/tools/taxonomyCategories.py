"""
Google Ad Manager Taxonomycategories Tools

Auto-generated MCP tools for taxonomyCategories endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksTaxonomyCategoriesInput,
    ListNetworksTaxonomyCategoriesInput,
)
from ..utils import handle_api_error, format_response


def register_taxonomyCategories_tools(mcp: FastMCP) -> None:
    """Register taxonomyCategories tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_taxonomy_categories",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_taxonomy_categories(params: GetNetworksTaxonomyCategoriesInput) -> str:
        """
        API to retrieve a `TaxonomyCategory` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_taxonomy_categories(params.network_code, params.taxonomy_categories_id)
            return format_response(response, "taxonomyCategories", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_taxonomy_categories",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_taxonomy_categories(params: ListNetworksTaxonomyCategoriesInput) -> str:
        """
        API to retrieve a list of `TaxonomyCategory` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_taxonomy_categories(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "taxonomyCategories", params.response_format)
        except Exception as e:
            return handle_api_error(e)

