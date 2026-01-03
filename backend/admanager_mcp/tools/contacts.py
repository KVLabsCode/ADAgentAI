"""
Google Ad Manager Contacts Tools

Auto-generated MCP tools for contacts endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksContactsInput,
    ListNetworksContactsInput,
    CreateNetworksContactsInput,
    BatchCreateNetworksContactsInput,
    PatchNetworksContactsInput,
    BatchUpdateNetworksContactsInput,
)
from ..utils import handle_api_error, format_response


def register_contacts_tools(mcp: FastMCP) -> None:
    """Register contacts tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_contacts",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_contacts(params: GetNetworksContactsInput) -> str:
        """
        API to retrieve a `Contact` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_contacts(params.network_code, params.contacts_id)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_contacts",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_contacts(params: ListNetworksContactsInput) -> str:
        """
        API to retrieve a list of `Contact` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_contacts(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_contacts",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_contacts(params: CreateNetworksContactsInput) -> str:
        """
        API to create a `Contact` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_contacts(params.network_code, params.data)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_contacts",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_contacts(params: BatchCreateNetworksContactsInput) -> str:
        """
        API to batch create `Contact` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_contacts(params.network_code, params.data)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_contacts",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_contacts(params: PatchNetworksContactsInput) -> str:
        """
        API to update a `Contact` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_contacts(params.network_code, params.contacts_id, params.data, params.update_mask)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_contacts",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_contacts(params: BatchUpdateNetworksContactsInput) -> str:
        """
        API to batch update `Contact` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_contacts(params.network_code, params.data)
            return format_response(response, "contacts", params.response_format)
        except Exception as e:
            return handle_api_error(e)

