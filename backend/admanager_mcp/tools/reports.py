"""
Google Ad Manager Reports Tools

Auto-generated MCP tools for reports endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksReportsInput,
    ListNetworksReportsInput,
    CreateNetworksReportsInput,
    PatchNetworksReportsInput,
    RunNetworksReportsInput,
    FetchRowsNetworksReportsResultsInput,
)
from ..utils import handle_api_error, format_response


def register_reports_tools(mcp: FastMCP) -> None:
    """Register reports tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_reports",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_reports(params: GetNetworksReportsInput) -> str:
        """
        API to retrieve a `Report` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_reports(params.network_code, params.reports_id)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_reports",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_reports(params: ListNetworksReportsInput) -> str:
        """
        API to retrieve a list of `Report` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_reports(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_reports",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_reports(params: CreateNetworksReportsInput) -> str:
        """
        API to create a `Report` object.
        """
        try:
            client = get_client()
            response = await client.create_networks_reports(params.network_code, params.data)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_reports",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_reports(params: PatchNetworksReportsInput) -> str:
        """
        API to update a `Report` object.
        """
        try:
            client = get_client()
            response = await client.patch_networks_reports(params.network_code, params.reports_id, params.data, params.update_mask)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_run_networks_reports",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_run_networks_reports(params: RunNetworksReportsInput) -> str:
        """
        Initiates the execution of an existing report asynchronously. Users can get the report by polling this operation using `OperationsService.GetOperation`. Poll every 5 seconds initially, with an exponen
        """
        try:
            client = get_client()
            response = await client.run_networks_reports(params.network_code, params.reports_id, params.data)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_fetch_rows_networks_reports_results",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_fetch_rows_networks_reports_results(params: FetchRowsNetworksReportsResultsInput) -> str:
        """
        Returns the result rows from a completed report. The caller must have previously called `RunReport` and waited for that operation to complete. The rows will be returned according to the order specifie
        """
        try:
            client = get_client()
            response = await client.fetch_rows_networks_reports_results(params.network_code, params.reports_id, params.results_id)
            return format_response(response, "reports", params.response_format)
        except Exception as e:
            return handle_api_error(e)

