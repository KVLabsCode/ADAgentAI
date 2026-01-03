"""
Google Ad Manager Placements Tools

Auto-generated MCP tools for placements endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksPlacementsInput,
    ListNetworksPlacementsInput,
    CreateNetworksPlacementsInput,
    PatchNetworksPlacementsInput,
    BatchCreateNetworksPlacementsInput,
    BatchUpdateNetworksPlacementsInput,
    BatchActivateNetworksPlacementsInput,
    BatchDeactivateNetworksPlacementsInput,
    BatchArchiveNetworksPlacementsInput,
)
from ..utils import handle_api_error, format_response


def register_placements_tools(mcp: FastMCP) -> None:
    """Register placements tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_placements",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_placements(params: GetNetworksPlacementsInput) -> str:
        """
        API to retrieve a `Placement` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_placements(params.network_code, params.placements_id)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_placements",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_placements(params: ListNetworksPlacementsInput) -> str:
        """
        API to retrieve a list of `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_placements(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_placements(params: CreateNetworksPlacementsInput) -> str:
        """
        API to create an `Placement` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_placements(params: PatchNetworksPlacementsInput) -> str:
        """
        API to update an `Placement` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_placements(params.network_code, params.placements_id, params.data, params.update_mask)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_placements(params: BatchCreateNetworksPlacementsInput) -> str:
        """
        API to batch create `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_placements(params: BatchUpdateNetworksPlacementsInput) -> str:
        """
        API to batch update `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_activate_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_activate_networks_placements(params: BatchActivateNetworksPlacementsInput) -> str:
        """
        Activates a list of `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.batch_activate_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_placements(params: BatchDeactivateNetworksPlacementsInput) -> str:
        """
        Deactivates a list of `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_archive_networks_placements",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_archive_networks_placements(params: BatchArchiveNetworksPlacementsInput) -> str:
        """
        Archives a list of `Placement` objects.
        """
        try:
            client = get_client()
            response = await client.batch_archive_networks_placements(params.network_code, params.data)
            return format_response(response, "placements", params.response_format)
        except Exception as e:
            return handle_api_error(e)

