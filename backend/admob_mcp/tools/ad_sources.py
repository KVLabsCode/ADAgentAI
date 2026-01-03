"""
AdMob Ad Sources Tools

Tools for listing mediation ad sources and their adapters.
Ad sources represent ad networks that can be used in mediation groups.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import ListAdSourcesInput, ListAdaptersInput, ResponseFormat
from ..utils import (
    handle_api_error,
    format_ad_sources_markdown,
    format_adapters_markdown,
    format_json_response,
    build_pagination_info,
)


def register_ad_source_tools(mcp: FastMCP) -> None:
    """Register ad source-related tools with the MCP server."""

    @mcp.tool(
        name="admob_list_ad_sources",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_ad_sources(params: ListAdSourcesInput) -> str:
        """
        List all mediation ad sources (ad networks) available for an account.

        Ad sources include networks like AdMob, Facebook Audience Network,
        AppLovin, Unity Ads, ironSource, Vungle, Chartboost, etc.

        Use this to discover available ad networks for mediation setup.
        """
        try:
            client = get_client()
            response = await client.list_ad_sources(
                account_id=params.account_id,
                page_size=params.page_size,
                page_token=params.page_token
            )

            ad_sources = response.get("adSources", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_ad_sources_markdown(ad_sources, pagination)
            else:
                return format_json_response({"adSources": ad_sources}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_list_adapters",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_adapters(params: ListAdaptersInput) -> str:
        """
        List adapters for a specific ad source.

        Adapters are SDK integrations that enable an ad source to work with
        AdMob mediation. Shows supported platforms and ad formats.
        """
        try:
            client = get_client()
            response = await client.list_adapters(
                account_id=params.account_id,
                ad_source_id=params.ad_source_id,
                page_size=params.page_size,
                page_token=params.page_token
            )

            adapters = response.get("adapters", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_adapters_markdown(adapters, pagination)
            else:
                return format_json_response({"adapters": adapters}, pagination)

        except Exception as e:
            return handle_api_error(e)
