"""
Google Ad Manager Livestreameventsbyassetkey Tools

Auto-generated MCP tools for liveStreamEventsByAssetKey endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    GetNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    ListNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    CreateNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    PatchNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    DeleteNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
)
from ..utils import handle_api_error, format_response


def register_liveStreamEventsByAssetKey_tools(mcp: FastMCP) -> None:
    """Register liveStreamEventsByAssetKey tools with the MCP server."""

    @mcp.tool(
        name="admanager_get_networks_live_stream_events_by_asset_key_ad_breaks",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_get_networks_live_stream_events_by_asset_key_ad_breaks(params: GetNetworksLiveStreamEventsByAssetKeyAdBreaksInput) -> str:
        """
        API to retrieve an `AdBreak` object. Query an ad break by its resource name or custom asset key. Check the resource's `breakState` field to determine its state.
        """
        try:
            client = get_client()
            response = await client.get_networks_live_stream_events_by_asset_key_ad_breaks(params.network_code, params.live_stream_events_by_asset_key_id, params.ad_breaks_id)
            return format_response(response, "liveStreamEventsByAssetKey", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_list_networks_live_stream_events_by_asset_key_ad_breaks",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_list_networks_live_stream_events_by_asset_key_ad_breaks(params: ListNetworksLiveStreamEventsByAssetKeyAdBreaksInput) -> str:
        """
        API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query parameter is specified, ad breaks are ordered reverse chronologically. However, ad breaks with a 'breakState' of 'SCHED
        """
        try:
            client = get_client()
            response = await client.list_networks_live_stream_events_by_asset_key_ad_breaks(params.network_code, params.live_stream_events_by_asset_key_id, params.page_size, params.page_token, params.filter)
            return format_response(response, "liveStreamEventsByAssetKey", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_create_networks_live_stream_events_by_asset_key_ad_breaks",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_create_networks_live_stream_events_by_asset_key_ad_breaks(params: CreateNetworksLiveStreamEventsByAssetKeyAdBreaksInput) -> str:
        """
        API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a live stream event, with an optional expected start time. DAI will begin decisioning ads for the break shortly before the ex
        """
        try:
            client = get_client()
            response = await client.create_networks_live_stream_events_by_asset_key_ad_breaks(params.network_code, params.live_stream_events_by_asset_key_id, params.data)
            return format_response(response, "liveStreamEventsByAssetKey", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_patch_networks_live_stream_events_by_asset_key_ad_breaks",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_patch_networks_live_stream_events_by_asset_key_ad_breaks(params: PatchNetworksLiveStreamEventsByAssetKeyAdBreaksInput) -> str:
        """
        API to update an `AdBreak` object. Modify an ad break when its state is `SCHEDULED`.
        """
        try:
            client = get_client()
            response = await client.patch_networks_live_stream_events_by_asset_key_ad_breaks(params.network_code, params.live_stream_events_by_asset_key_id, params.ad_breaks_id, params.data, params.update_mask)
            return format_response(response, "liveStreamEventsByAssetKey", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_delete_networks_live_stream_events_by_asset_key_ad_breaks",
        annotations={"readOnlyHint": False, "destructiveHint": True, "idempotentHint": True}
    )
    async def admanager_delete_networks_live_stream_events_by_asset_key_ad_breaks(params: DeleteNetworksLiveStreamEventsByAssetKeyAdBreaksInput) -> str:
        """
        API to delete an `AdBreak` object. Deletes and cancels an incomplete ad break, mitigating the need to wait for the current break to serve before recreating an ad break. You can delete an ad break that
        """
        try:
            client = get_client()
            response = await client.delete_networks_live_stream_events_by_asset_key_ad_breaks(params.network_code, params.live_stream_events_by_asset_key_id, params.ad_breaks_id)
            return format_response(response, "liveStreamEventsByAssetKey", params.response_format)
        except Exception as e:
            return handle_api_error(e)

