"""
Google Ad Manager Sites Tools

Auto-generated MCP tools for sites endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksSitesInput,
    ListNetworksSitesInput,
    CreateNetworksSitesInput,
    BatchCreateNetworksSitesInput,
    PatchNetworksSitesInput,
    BatchUpdateNetworksSitesInput,
    BatchDeactivateNetworksSitesInput,
    BatchSubmitForApprovalNetworksSitesInput,
)
from ..utils import handle_api_error, format_response


def register_sites_tools(mcp: FastMCP) -> None:
    """Register sites tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_sites",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_sites(params: GetNetworksSitesInput) -> str:
        """
        API to retrieve a `Site` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_sites(params.network_code, params.sites_id)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_sites",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_sites(params: ListNetworksSitesInput) -> str:
        """
        API to retrieve a list of `Site` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_sites(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_sites(params: CreateNetworksSitesInput) -> str:
        """
        API to create a `Site` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_sites(params.network_code, params.data)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_sites(params: BatchCreateNetworksSitesInput) -> str:
        """
        API to batch create `Site` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_sites(params.network_code, params.data)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_sites(params: PatchNetworksSitesInput) -> str:
        """
        API to update a `Site` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_sites(params.network_code, params.sites_id, params.data, params.update_mask)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_sites(params: BatchUpdateNetworksSitesInput) -> str:
        """
        API to batch update `Site` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_sites(params.network_code, params.data)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_sites(params: BatchDeactivateNetworksSitesInput) -> str:
        """
        Deactivates a list of `Site` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_sites(params.network_code, params.data)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_submit_for_approval_networks_sites",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_submit_for_approval_networks_sites(params: BatchSubmitForApprovalNetworksSitesInput) -> str:
        """
        Submits a list of `Site` objects for approval.
        """
        try:
            client = get_client()
            response = await client.batch_submit_for_approval_networks_sites(params.network_code, params.data)
            return format_response(response, "sites", params.response_format)
        except Exception as e:
            return handle_api_error(e)

