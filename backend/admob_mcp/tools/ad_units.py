"""
AdMob Ad Unit Tools

Tools for listing, creating ad units and managing ad unit mappings.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ListAdUnitsInput, CreateAdUnitInput,
    ListAdUnitMappingsInput, CreateAdUnitMappingInput, BatchCreateAdUnitMappingsInput,
    ResponseFormat
)
from ..utils import (
    handle_api_error,
    format_ad_units_markdown,
    format_ad_unit_mappings_markdown,
    format_json_response,
    format_create_response_markdown,
    build_pagination_info,
)


def register_ad_unit_tools(mcp: FastMCP) -> None:
    """Register ad unit-related tools with the MCP server."""

    @mcp.tool(
        name="admob_list_ad_units",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_ad_units(params: ListAdUnitsInput) -> str:
        """
        List all ad units configured under an AdMob account.

        Returns ad unit ID, format (BANNER, INTERSTITIAL, REWARDED, etc.),
        ad types (RICH_MEDIA, VIDEO), and associated app ID for each ad unit.
        """
        try:
            client = get_client()
            response = await client.list_ad_units(
                account_id=params.account_id,
                page_size=params.page_size,
                page_token=params.page_token
            )

            ad_units = response.get("adUnits", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_ad_units_markdown(ad_units, pagination)
            else:
                return format_json_response({"adUnits": ad_units}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_create_ad_unit",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_create_ad_unit(params: CreateAdUnitInput) -> str:
        """
        Create a new ad unit under an AdMob account.

        NOTE: This endpoint requires special access. If you see a 403 permission
        denied error, contact your Google account manager for access.

        Args:
            account_id: Publisher account ID
            app_id: App ID this ad unit belongs to
            display_name: Display name (max 80 chars)
            ad_format: Format type (BANNER, INTERSTITIAL, REWARDED, etc.)
            ad_types: Optional list of ad types (RICH_MEDIA, VIDEO)
        """
        try:
            client = get_client()

            ad_unit_data = {
                "appId": params.app_id,
                "displayName": params.display_name,
                "adFormat": params.ad_format.value,
            }

            if params.ad_types:
                ad_unit_data["adTypes"] = params.ad_types

            response = await client.create_ad_unit(params.account_id, ad_unit_data)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_create_response_markdown("Ad Unit", response)
            else:
                return format_json_response({"adUnit": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_list_ad_unit_mappings",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_ad_unit_mappings(params: ListAdUnitMappingsInput) -> str:
        """
        List ad unit mappings for a specific ad unit.

        Ad unit mappings connect ad units to ad sources (ad networks) for mediation.

        NOTE: This endpoint requires special access.
        """
        try:
            client = get_client()
            response = await client.list_ad_unit_mappings(
                account_id=params.account_id,
                ad_unit_id=params.ad_unit_id,
                page_size=params.page_size,
                page_token=params.page_token,
                filter_str=params.filter
            )

            mappings = response.get("adUnitMappings", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_ad_unit_mappings_markdown(mappings, pagination)
            else:
                return format_json_response({"adUnitMappings": mappings}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_create_ad_unit_mapping",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_create_ad_unit_mapping(params: CreateAdUnitMappingInput) -> str:
        """
        Create an ad unit mapping to connect an ad unit to an ad source.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            ad_unit_id: Ad unit ID to create mapping for
            ad_source_id: Ad source (network) ID
            display_name: Display name for the mapping
            ad_unit_configurations: Optional ad source specific configurations
        """
        try:
            client = get_client()

            mapping_data = {
                "adSourceId": params.ad_source_id,
                "displayName": params.display_name,
            }

            if params.ad_unit_configurations:
                mapping_data["adUnitConfigurations"] = params.ad_unit_configurations

            response = await client.create_ad_unit_mapping(
                params.account_id, params.ad_unit_id, mapping_data
            )

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_create_response_markdown("Ad Unit Mapping", response)
            else:
                return format_json_response({"adUnitMapping": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_batch_create_ad_unit_mappings",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_batch_create_ad_unit_mappings(params: BatchCreateAdUnitMappingsInput) -> str:
        """
        Batch create ad unit mappings (up to 100 at once).

        Create multiple ad unit mappings in a single request.
        Useful for setting up mediation across many ad units quickly.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            mappings: List of mapping objects, each with:
                      - ad_unit_id: Ad unit ID
                      - ad_source_id: Ad source (network) ID
                      - display_name: Display name
                      - ad_unit_configurations: Optional ad source specific configs
        """
        try:
            client = get_client()

            # Build the requests array for batch create
            requests = []
            for mapping in params.mappings:
                req = {
                    "adUnitId": mapping.ad_unit_id,
                    "adUnitMapping": {
                        "adSourceId": mapping.ad_source_id,
                        "displayName": mapping.display_name,
                    }
                }
                if mapping.ad_unit_configurations:
                    req["adUnitMapping"]["adUnitConfigurations"] = mapping.ad_unit_configurations
                requests.append(req)

            response = await client.batch_create_ad_unit_mappings(params.account_id, requests)

            if params.response_format == ResponseFormat.MARKDOWN:
                mappings_created = response.get("adUnitMappings", [])
                count = len(mappings_created)
                result = f"## Batch Create Ad Unit Mappings\n\n"
                result += f"Successfully created **{count}** ad unit mappings.\n\n"
                if mappings_created:
                    result += "### Created Mappings\n\n"
                    for m in mappings_created[:10]:  # Show first 10
                        result += f"- {m.get('name', 'N/A')}: {m.get('displayName', 'N/A')}\n"
                    if count > 10:
                        result += f"\n... and {count - 10} more\n"
                return result
            else:
                return format_json_response({"adUnitMappings": response.get("adUnitMappings", [])})

        except Exception as e:
            return handle_api_error(e)
