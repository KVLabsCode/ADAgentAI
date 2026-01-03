"""
Google Ad Manager Audiencesegments Tools

Auto-generated MCP tools for audienceSegments endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksAudienceSegmentsInput,
    ListNetworksAudienceSegmentsInput,
)
from ..utils import handle_api_error, format_response


def register_audienceSegments_tools(mcp: FastMCP) -> None:
    """Register audienceSegments tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_audience_segments",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_audience_segments(params: GetNetworksAudienceSegmentsInput) -> str:
        """
        API to retrieve an `AudienceSegment` object.
        """
        try:
            client = get_client()
            response = await client.get_networks_audience_segments(params.network_code, params.audience_segments_id)
            return format_response(response, "audienceSegments", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_audience_segments",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_audience_segments(params: ListNetworksAudienceSegmentsInput) -> str:
        """
        API to retrieve a list of `AudienceSegment` objects.
        """
        try:
            client = get_client()
            response = await client.list_networks_audience_segments(params.network_code, params.page_size, params.page_token, params.filter)
            return format_response(response, "audienceSegments", params.response_format)
        except Exception as e:
            return handle_api_error(e)

