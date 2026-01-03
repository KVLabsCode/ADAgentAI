"""
Google Ad Manager Customtargetingkeys Tools

Auto-generated MCP tools for customTargetingKeys endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCustomTargetingKeysInput,
    ListNetworksCustomTargetingKeysInput,
    CreateNetworksCustomTargetingKeysInput,
    BatchCreateNetworksCustomTargetingKeysInput,
    PatchNetworksCustomTargetingKeysInput,
    BatchUpdateNetworksCustomTargetingKeysInput,
    BatchActivateNetworksCustomTargetingKeysInput,
    BatchDeactivateNetworksCustomTargetingKeysInput,
    GetNetworksCustomTargetingKeysCustomTargetingValuesInput,
    ListNetworksCustomTargetingKeysCustomTargetingValuesInput,
)
from ..utils import handle_api_error, format_response


def register_customTargetingKeys_tools(mcp: FastMCP) -> None:
    """Register customTargetingKeys tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_custom_targeting_keys",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_custom_targeting_keys(params: GetNetworksCustomTargetingKeysInput) -> str:
        """
        API to retrieve a `CustomTargetingKey` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_custom_targeting_keys(params.network_code, params.custom_targeting_keys_id)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_custom_targeting_keys",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_custom_targeting_keys(params: ListNetworksCustomTargetingKeysInput) -> str:
        """
        API to retrieve a list of `CustomTargetingKey` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_custom_targeting_keys(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_custom_targeting_keys(params: CreateNetworksCustomTargetingKeysInput) -> str:
        """
        API to create a `CustomTargetingKey` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_custom_targeting_keys(params.network_code, params.data)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_custom_targeting_keys(params: BatchCreateNetworksCustomTargetingKeysInput) -> str:
        """
        API to batch create `CustomTargetingKey` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_custom_targeting_keys(params.network_code, params.data)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_custom_targeting_keys(params: PatchNetworksCustomTargetingKeysInput) -> str:
        """
        API to update a `CustomTargetingKey` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_custom_targeting_keys(params.network_code, params.custom_targeting_keys_id, params.data, params.update_mask)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_custom_targeting_keys(params: BatchUpdateNetworksCustomTargetingKeysInput) -> str:
        """
        API to batch update `CustomTargetingKey` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_custom_targeting_keys(params.network_code, params.data)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_activate_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_activate_networks_custom_targeting_keys(params: BatchActivateNetworksCustomTargetingKeysInput) -> str:
        """
        API to batch activate `CustomTargetingKey` objects.
        """
        try:
            client = get_client()
            response = await client.batch_activate_networks_custom_targeting_keys(params.network_code, params.data)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_custom_targeting_keys",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_custom_targeting_keys(params: BatchDeactivateNetworksCustomTargetingKeysInput) -> str:
        """
        Deactivates a list of `CustomTargetingKey` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_custom_targeting_keys(params.network_code, params.data)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_get_networks_custom_targeting_keys_custom_targeting_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_custom_targeting_keys_custom_targeting_values(params: GetNetworksCustomTargetingKeysCustomTargetingValuesInput) -> str:
        """
        API to retrieve a `CustomTargetingValue` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_custom_targeting_keys_custom_targeting_values(params.network_code, params.custom_targeting_keys_id, params.custom_targeting_values_id)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_custom_targeting_keys_custom_targeting_values",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_custom_targeting_keys_custom_targeting_values(params: ListNetworksCustomTargetingKeysCustomTargetingValuesInput) -> str:
        """
        API to retrieve a list of `CustomTargetingValue` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_custom_targeting_keys_custom_targeting_values(params.network_code, params.custom_targeting_keys_id, params.page_size, params.page_token, params.filter)
            return format_response(response, "customTargetingKeys", params.response_format)
        except Exception as e:
            return handle_api_error(e)

