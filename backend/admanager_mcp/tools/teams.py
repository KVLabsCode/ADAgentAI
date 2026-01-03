"""
Google Ad Manager Teams Tools

Auto-generated MCP tools for teams endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksTeamsInput,
    ListNetworksTeamsInput,
    CreateNetworksTeamsInput,
    BatchCreateNetworksTeamsInput,
    PatchNetworksTeamsInput,
    BatchUpdateNetworksTeamsInput,
    BatchActivateNetworksTeamsInput,
    BatchDeactivateNetworksTeamsInput,
)
from ..utils import handle_api_error, format_response


def register_teams_tools(mcp: FastMCP) -> None:
    """Register teams tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_teams",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_teams(params: GetNetworksTeamsInput) -> str:
        """
        API to retrieve a `Team` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_teams(params.network_code, params.teams_id)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_teams",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_teams(params: ListNetworksTeamsInput) -> str:
        """
        API to retrieve a list of `Team` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_teams(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_teams(params: CreateNetworksTeamsInput) -> str:
        """
        API to create a `Team` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_teams(params.network_code, params.data)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_create_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_create_networks_teams(params: BatchCreateNetworksTeamsInput) -> str:
        """
        API to batch create `Team` objects.
        """
        try:
            client = get_client()
            response = await client.batch_create_networks_teams(params.network_code, params.data)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_teams(params: PatchNetworksTeamsInput) -> str:
        """
        API to update a `Team` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_teams(params.network_code, params.teams_id, params.data, params.update_mask)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_update_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_update_networks_teams(params: BatchUpdateNetworksTeamsInput) -> str:
        """
        API to batch update `Team` objects.
        """
        try:
            client = get_client()
            response = await client.batch_update_networks_teams(params.network_code, params.data)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_activate_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_activate_networks_teams(params: BatchActivateNetworksTeamsInput) -> str:
        """
        API to batch activate `Team` objects.
        """
        try:
            client = get_client()
            response = await client.batch_activate_networks_teams(params.network_code, params.data)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_deactivate_networks_teams",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_deactivate_networks_teams(params: BatchDeactivateNetworksTeamsInput) -> str:
        """
        API to batch deactivate `Team` objects.
        """
        try:
            client = get_client()
            response = await client.batch_deactivate_networks_teams(params.network_code, params.data)
            return format_response(response, "teams", params.response_format)
        except Exception as e:
            return handle_api_error(e)

