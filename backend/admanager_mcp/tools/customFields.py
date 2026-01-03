"""
Google Ad Manager Customfields Tools

Auto-generated MCP tools for customFields endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksCustomFieldsInput,
    ListNetworksCustomFieldsInput,
    CreateNetworksCustomFieldsInput,
    BatchCreateNetworksCustomFieldsInput,
    PatchNetworksCustomFieldsInput,
    BatchUpdateNetworksCustomFieldsInput,
    BatchActivateNetworksCustomFieldsInput,
    BatchDeactivateNetworksCustomFieldsInput,
)
from ..utils import handle_api_error, format_response


def register_customFields_tools(mcp: FastMCP) -> None:
    """Register customFields tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_custom_fields",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_custom_fields(params: GetNetworksCustomFieldsInput) -> str:
        """
        API to retrieve a `CustomField` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_custom_fields(params.network_code, params.custom_fields_id)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_custom_fields",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_custom_fields(params: ListNetworksCustomFieldsInput) -> str:
        """
        API to retrieve a list of `CustomField` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_custom_fields(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_custom_fields(params: CreateNetworksCustomFieldsInput) -> str:
        """
        API to create a `CustomField` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_custom_fields(params.network_code, params.data)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_custom_fields(params: BatchCreateNetworksCustomFieldsInput) -> str:
        """
        API to batch create `CustomField` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_custom_fields(params.network_code, params.data)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_custom_fields(params: PatchNetworksCustomFieldsInput) -> str:
        """
        API to update a `CustomField` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_custom_fields(params.network_code, params.custom_fields_id, params.data, params.update_mask)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_custom_fields(params: BatchUpdateNetworksCustomFieldsInput) -> str:
        """
        API to batch update `CustomField` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_custom_fields(params.network_code, params.data)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_activate_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_activate_networks_custom_fields(params: BatchActivateNetworksCustomFieldsInput) -> str:
        """
        Activates a list of `CustomField` objects.
        """
        try:
            client = get_client()
            response = await client.batch_activate_networks_custom_fields(params.network_code, params.data)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_custom_fields",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_custom_fields(params: BatchDeactivateNetworksCustomFieldsInput) -> str:
        """
        Deactivates a list of `CustomField` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_custom_fields(params.network_code, params.data)
            return format_response(response, "customFields", params.response_format)
        except Exception as e:
            return handle_api_error(e)

