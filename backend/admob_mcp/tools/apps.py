"""
AdMob App Tools

Tools for listing and creating apps under AdMob accounts.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import ListAppsInput, CreateAppInput, ResponseFormat
from ..utils import (
    handle_api_error,
    format_apps_markdown,
    format_json_response,
    format_create_response_markdown,
    build_pagination_info,
)


def register_app_tools(mcp: FastMCP) -> None:
    """Register app-related tools with the MCP server."""

    @mcp.tool(
        name="admob_list_apps",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_apps(params: ListAppsInput) -> str:
        """
        List all apps registered under an AdMob account.

        Returns app ID, platform (iOS/Android), app store ID, display name,
        and approval state for each app.
        """
        try:
            client = get_client()
            response = await client.list_apps(
                account_id=params.account_id,
                page_size=params.page_size,
                page_token=params.page_token
            )

            apps = response.get("apps", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_apps_markdown(apps, pagination)
            else:
                return format_json_response({"apps": apps}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_create_app",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_create_app(params: CreateAppInput) -> str:
        """
        Create a new app under an AdMob account.

        NOTE: This endpoint requires special access. If you see a 403 permission
        denied error, contact your Google account manager for access.

        Args:
            account_id: Publisher account ID
            platform: IOS or ANDROID
            display_name: Display name for the app (max 80 chars)
            app_store_id: Optional app store ID (bundle ID for iOS, package name for Android)
        """
        try:
            client = get_client()

            app_data = {
                "platform": params.platform.value,
                "manualAppInfo": {
                    "displayName": params.display_name
                }
            }

            if params.app_store_id:
                app_data["linkedAppInfo"] = {
                    "appStoreId": params.app_store_id
                }

            response = await client.create_app(params.account_id, app_data)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_create_response_markdown("App", response)
            else:
                return format_json_response({"app": response})

        except Exception as e:
            return handle_api_error(e)
