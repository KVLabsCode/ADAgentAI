"""
Google Ad Manager Operations Tools

Auto-generated MCP tools for operations endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksOperationsReportsRunsInput,
    ListOperationsInput,
    DeleteOperationsInput,
    CancelOperationsInput,
)
from ..utils import handle_api_error, format_response


def register_operations_tools(mcp: FastMCP) -> None:
    """Register operations tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_operations_reports_runs",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_operations_reports_runs(params: GetNetworksOperationsReportsRunsInput) -> str:
        """
        Gets the latest state of a long-running operation. Clients can use this method to poll the operation result at intervals as recommended by the API service.
        """
        try:
            client = get_client()
            response = await client.get_networks_operations_reports_runs(params.network_code, params.runs_id)
            return format_response(response, "operations", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_operations",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_operations(params: ListOperationsInput) -> str:
        """
        Lists operations that match the specified filter in the request. If the server doesn't support this method, it returns `UNIMPLEMENTED`.
        """
        try:
            client = get_client()
            response = await client.list_operations(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "operations", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_delete_operations",
        annotations={"readOnlyHint": False, "destructiveHint": True, "idempotentHint": True}
    )
    async def admanager_delete_operations(params: DeleteOperationsInput) -> str:
        """
        Deletes a long-running operation. This method indicates that the client is no longer interested in the operation result. It does not cancel the operation. If the server doesn't support this method, it
        """
        try:
            client = get_client()
            response = await client.delete_operations(params.network_code, params.operations_id)
            return format_response(response, "operations", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_cancel_operations",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_cancel_operations(params: CancelOperationsInput) -> str:
        """
        Starts asynchronous cancellation on a long-running operation. The server makes a best effort to cancel the operation, but success is not guaranteed. If the server doesn't support this method, it retur
        """
        try:
            client = get_client()
            response = await client.cancel_operations(params.network_code, params.operations_id, params.data)
            return format_response(response, "operations", params.response_format)
        except Exception as e:
            return handle_api_error(e)

