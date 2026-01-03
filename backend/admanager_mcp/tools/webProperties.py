"""
Google Ad Manager Webproperties Tools

Auto-generated MCP tools for webProperties endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    SearchNetworksWebPropertiesAdReviewCenterAdsInput,
    BatchAllowNetworksWebPropertiesAdReviewCenterAdsInput,
    BatchBlockNetworksWebPropertiesAdReviewCenterAdsInput,
)
from ..utils import handle_api_error, format_response


def register_webProperties_tools(mcp: FastMCP) -> None:
    """Register webProperties tools with the MCP server."""

    @mcp.tool(
        name="admanager_search_networks_web_properties_ad_review_center_ads",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admanager_search_networks_web_properties_ad_review_center_ads(params: SearchNetworksWebPropertiesAdReviewCenterAdsInput) -> str:
        """
        API to search for AdReviewCenterAds.
        """
        try:
            client = get_client()
            response = await client.search_networks_web_properties_ad_review_center_ads(params.network_code, params.web_properties_id)
            return format_response(response, "webProperties", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_allow_networks_web_properties_ad_review_center_ads",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_allow_networks_web_properties_ad_review_center_ads(params: BatchAllowNetworksWebPropertiesAdReviewCenterAdsInput) -> str:
        """
        API to batch allow AdReviewCenterAds. This method supports partial success. Some operations may succeed while others fail. Callers should check the failedRequests field in the response to determine wh
        """
        try:
            client = get_client()
            response = await client.batch_allow_networks_web_properties_ad_review_center_ads(params.network_code, params.web_properties_id, params.data)
            return format_response(response, "webProperties", params.response_format)
        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admanager_batch_block_networks_web_properties_ad_review_center_ads",
        annotations={"readOnlyHint": False, "idempotentHint": False}
    )
    async def admanager_batch_block_networks_web_properties_ad_review_center_ads(params: BatchBlockNetworksWebPropertiesAdReviewCenterAdsInput) -> str:
        """
        API to batch block AdReviewCenterAds. This method supports partial success. Some operations may succeed while others fail. Callers should check the failedRequests field in the response to determine wh
        """
        try:
            client = get_client()
            response = await client.batch_block_networks_web_properties_ad_review_center_ads(params.network_code, params.web_properties_id, params.data)
            return format_response(response, "webProperties", params.response_format)
        except Exception as e:
            return handle_api_error(e)

