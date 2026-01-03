"""
Google Ad Manager Adunits Tools

Auto-generated MCP tools for adUnits endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksAdUnitsInput,
    ListNetworksAdUnitsInput,
    CreateNetworksAdUnitsInput,
    PatchNetworksAdUnitsInput,
    BatchCreateNetworksAdUnitsInput,
    BatchUpdateNetworksAdUnitsInput,
    BatchActivateNetworksAdUnitsInput,
    BatchDeactivateNetworksAdUnitsInput,
    BatchArchiveNetworksAdUnitsInput,
)
from ..utils import handle_api_error, format_response


def register_adUnits_tools(mcp: FastMCP) -> None:
    """Register adUnits tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_ad_units",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_ad_units(params: GetNetworksAdUnitsInput) -> str:
        """
        API to retrieve an AdUnit object.
        """
        try:
            client = get_client()
            response = await client.get_networks_ad_units(params.network_code, params.ad_units_id)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_ad_units",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_ad_units(params: ListNetworksAdUnitsInput) -> str:
        """
        API to retrieve a list of AdUnit objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_ad_units(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_ad_units(params: CreateNetworksAdUnitsInput) -> str:
        """
        API to create an `AdUnit` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_ad_units(params: PatchNetworksAdUnitsInput) -> str:
        """
        API to update an `AdUnit` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_ad_units(params.network_code, params.ad_units_id, params.data, params.update_mask)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_ad_units(params: BatchCreateNetworksAdUnitsInput) -> str:
        """
        API to batch create `AdUnit` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_ad_units(params: BatchUpdateNetworksAdUnitsInput) -> str:
        """
        API to batch update `AdUnit` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_activate_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_activate_networks_ad_units(params: BatchActivateNetworksAdUnitsInput) -> str:
        """
        API to batch activate `AdUnit` objects.
        """
        try:
            client = get_client()
            response = await client.batch_activate_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_ad_units(params: BatchDeactivateNetworksAdUnitsInput) -> str:
        """
        Deactivates a list of `AdUnit` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_archive_networks_ad_units",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_archive_networks_ad_units(params: BatchArchiveNetworksAdUnitsInput) -> str:
        """
        Archives a list of `AdUnit` objects.
        """
        try:
            client = get_client()
            response = await client.batch_archive_networks_ad_units(params.network_code, params.data)
            return format_response(response, "adUnits", params.response_format)
        except Exception as e:
            return handle_api_error(e)

