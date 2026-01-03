"""
Google Ad Manager Entitysignalsmappings Tools

Auto-generated MCP tools for entitySignalsMappings endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksEntitySignalsMappingsInput,
    ListNetworksEntitySignalsMappingsInput,
    CreateNetworksEntitySignalsMappingsInput,
    PatchNetworksEntitySignalsMappingsInput,
    BatchCreateNetworksEntitySignalsMappingsInput,
    BatchUpdateNetworksEntitySignalsMappingsInput,
)
from ..utils import handle_api_error, format_response


def register_entitySignalsMappings_tools(mcp: FastMCP) -> None:
    """Register entitySignalsMappings tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_entity_signals_mappings",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_entity_signals_mappings(params: GetNetworksEntitySignalsMappingsInput) -> str:
        """
        API to retrieve a `EntitySignalsMapping` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_entity_signals_mappings(params.network_code, params.entity_signals_mappings_id)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_entity_signals_mappings",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_entity_signals_mappings(params: ListNetworksEntitySignalsMappingsInput) -> str:
        """
        API to retrieve a list of `EntitySignalsMapping` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_entity_signals_mappings(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_entity_signals_mappings",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_entity_signals_mappings(params: CreateNetworksEntitySignalsMappingsInput) -> str:
        """
        API to create an `EntitySignalsMapping` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_entity_signals_mappings(params.network_code, params.data)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_entity_signals_mappings",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_entity_signals_mappings(params: PatchNetworksEntitySignalsMappingsInput) -> str:
        """
        API to update an `EntitySignalsMapping` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_entity_signals_mappings(params.network_code, params.entity_signals_mappings_id, params.data, params.update_mask)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_entity_signals_mappings",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_entity_signals_mappings(params: BatchCreateNetworksEntitySignalsMappingsInput) -> str:
        """
        API to batch create `EntitySignalsMapping` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_entity_signals_mappings(params.network_code, params.data)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_entity_signals_mappings",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_entity_signals_mappings(params: BatchUpdateNetworksEntitySignalsMappingsInput) -> str:
        """
        API to batch update `EntitySignalsMapping` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_entity_signals_mappings(params.network_code, params.data)
            return format_response(response, "entitySignalsMappings", params.response_format)
        except Exception as e:
            return handle_api_error(e)

