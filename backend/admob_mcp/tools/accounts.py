"""
AdMob Account Tools

Tools for listing and retrieving AdMob publisher account information.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import ListAccountsInput, GetAccountInput, ResponseFormat
from ..utils import (
    handle_api_error,
    format_accounts_markdown,
    format_account_markdown,
    format_json_response,
    build_pagination_info,
)


def register_account_tools(mcp: FastMCP) -> None:
    """Register account-related tools with the MCP server."""

    @mcp.tool(
        name="admob_list_accounts",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_accounts(params: ListAccountsInput) -> str:
        """
        List all AdMob publisher accounts accessible with current credentials.

        Use this tool FIRST to discover available accounts. The account_id
        returned is required for all other AdMob operations.

        Returns publisher ID, currency code, and reporting timezone for each account.
        """
        try:
            client = get_client()
            response = await client.list_accounts(
                page_size=params.page_size,
                page_token=params.page_token
            )

            accounts = response.get("account", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_accounts_markdown(accounts, pagination)
            else:
                return format_json_response({"accounts": accounts}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_get_account",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_get_account(params: GetAccountInput) -> str:
        """
        Get detailed information for a specific AdMob publisher account.

        Returns the account's publisher ID, currency code, and reporting timezone.
        """
        try:
            client = get_client()
            response = await client.get_account(params.account_id)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_account_markdown(response)
            else:
                return format_json_response({"account": response})

        except Exception as e:
            return handle_api_error(e)
