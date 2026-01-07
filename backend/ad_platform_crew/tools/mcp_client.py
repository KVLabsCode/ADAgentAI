"""
MCP Client for communicating with the AdMob MCP server.

This module provides a client that can invoke MCP tools either by:
1. Direct import (when running in same process)
2. Subprocess communication (for isolated execution)
"""

import json
import sys
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Add parent directory to path for imports
ADMOB_MCP_PATH = Path(__file__).parent.parent.parent / "admob_mcp"
if str(ADMOB_MCP_PATH.parent) not in sys.path:
    sys.path.insert(0, str(ADMOB_MCP_PATH.parent))

# Load AdMob MCP environment variables
admob_env_path = ADMOB_MCP_PATH / ".env"
if admob_env_path.exists():
    load_dotenv(admob_env_path)


@dataclass
class MCPResponse:
    """Response from MCP tool execution."""

    success: bool
    data: Any
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {"success": self.success, "data": self.data, "error": self.error}


class MCPClient:
    """
    Client for invoking AdMob MCP tools.

    Uses direct imports for efficiency when possible.
    """

    def __init__(self):
        self._AdMobClient = None
        self._initialized = False

    def _ensure_initialized(self) -> None:
        """Lazy initialization - imports the client class."""
        if self._initialized:
            return

        try:
            from admob_mcp.api_client import AdMobClient
            self._AdMobClient = AdMobClient
            self._initialized = True
        except ImportError as e:
            raise RuntimeError(
                f"Failed to import AdMob MCP. Ensure admob_mcp is in the path: {e}"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize AdMob API client: {e}")

    def _get_api_client(self):
        """
        Get an API client with current user context.

        Reads CURRENT_USER_ID at request time (not init time) so the
        user's OAuth token can be fetched from the database.
        """
        import os
        self._ensure_initialized()

        user_id = os.environ.get("CURRENT_USER_ID")
        if user_id:
            print(f"[MCPClient] Creating AdMobClient with user_id: {user_id}")
            return self._AdMobClient(user_id=user_id)
        else:
            print("[MCPClient] WARNING: No CURRENT_USER_ID set, using default client")
            return self._AdMobClient()

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> MCPResponse:
        """
        Call an AdMob API operation.

        Args:
            tool_name: Name of the operation to call
            arguments: Dictionary of arguments

        Returns:
            MCPResponse with the result or error
        """
        # Check if tool was blocked by user (denied approval)
        try:
            from chat.approval.handlers import is_tool_blocked
            blocked, reason = is_tool_blocked(tool_name)
            if blocked:
                print(f"[MCPClient] Tool '{tool_name}' was blocked: {reason}")
                return MCPResponse(
                    success=False,
                    data=None,
                    error=f"USER DENIED: The user explicitly chose to BLOCK execution of '{tool_name}'. "
                          f"This is NOT a technical error or API permission issue - the human user reviewed "
                          f"this tool request and decided NOT to allow it. Reason: {reason}. "
                          f"Acknowledge the user's decision and do NOT retry or work around this denial."
                )
        except ImportError:
            pass  # Approval module not available, proceed normally

        # Get a client with current user context (reads CURRENT_USER_ID env var)
        api_client = self._get_api_client()

        try:
            # Map tool names to API endpoints
            if tool_name == "admob_list_accounts":
                page_size = arguments.get("page_size", 20)
                page_token = arguments.get("page_token")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token

                result = await api_client.request("GET", "accounts", params=params)
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_get_account":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                result = await api_client.request("GET", f"accounts/{account_id}")
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_apps":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                page_size = arguments.get("page_size", 20)
                page_token = arguments.get("page_token")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token

                result = await api_client.request("GET", f"accounts/{account_id}/apps", params=params)
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_ad_units":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                page_size = arguments.get("page_size", 20)
                page_token = arguments.get("page_token")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token

                result = await api_client.request("GET", f"accounts/{account_id}/adUnits", params=params)
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_create_app":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                app_data = {
                    "linkedAppInfo": {
                        "appStoreId": arguments["app_store_id"],
                    }
                }
                if arguments.get("display_name"):
                    app_data["displayName"] = arguments["display_name"]

                result = await api_client.request(
                    "POST", f"accounts/{account_id}/apps", json_data=app_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_create_ad_unit":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                ad_unit_data = {
                    "appId": arguments["app_id"],
                    "displayName": arguments["display_name"],
                    "adFormat": arguments["ad_format"],
                }
                if arguments.get("ad_types"):
                    ad_unit_data["adTypes"] = arguments["ad_types"]

                result = await api_client.request(
                    "POST", f"accounts/{account_id}/adUnits", json_data=ad_unit_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_ad_unit_mappings":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                ad_unit_id = arguments["ad_unit_id"]

                page_size = arguments.get("page_size", 20)
                page_token = arguments.get("page_token")
                filter_str = arguments.get("filter")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token
                if filter_str:
                    params["filter"] = filter_str

                result = await api_client.request(
                    "GET", f"accounts/{account_id}/adUnits/{ad_unit_id}/adUnitMappings", params=params
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_create_ad_unit_mapping":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                ad_unit_id = arguments["ad_unit_id"]

                mapping_data = {
                    "adSourceId": arguments["ad_source_id"],
                    "displayName": arguments["display_name"],
                }
                if arguments.get("ad_unit_configurations"):
                    mapping_data["adUnitConfigurations"] = arguments["ad_unit_configurations"]

                result = await api_client.request(
                    "POST", f"accounts/{account_id}/adUnits/{ad_unit_id}/adUnitMappings", json_data=mapping_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_batch_create_ad_unit_mappings":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                result = await api_client.request(
                    "POST", f"accounts/{account_id}/adUnitMappings:batchCreate",
                    json_data={"requests": arguments["mappings"]}
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_ad_sources":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                page_size = arguments.get("page_size", 100)
                page_token = arguments.get("page_token")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token

                result = await api_client.request("GET", f"accounts/{account_id}/adSources", params=params)
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_adapters":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                ad_source_id = arguments["ad_source_id"]

                page_size = arguments.get("page_size", 100)
                page_token = arguments.get("page_token")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token

                result = await api_client.request(
                    "GET", f"accounts/{account_id}/adSources/{ad_source_id}/adapters", params=params
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_list_mediation_groups":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                page_size = arguments.get("page_size", 20)
                page_token = arguments.get("page_token")
                filter_str = arguments.get("filter")

                params = {"pageSize": page_size}
                if page_token:
                    params["pageToken"] = page_token
                if filter_str:
                    params["filter"] = filter_str

                result = await api_client.request(
                    "GET", f"accounts/{account_id}/mediationGroups", params=params
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_create_mediation_group":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                mediation_group_data = {
                    "displayName": arguments["display_name"],
                    "state": arguments.get("state", "ENABLED"),
                    "targeting": arguments["targeting"],
                }

                result = await api_client.request(
                    "POST", f"accounts/{account_id}/mediationGroups", json_data=mediation_group_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_update_mediation_group":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                mediation_group_id = arguments["mediation_group_id"]
                update_mask = arguments["update_mask"]

                mediation_group_data = arguments["mediation_group_data"]

                result = await api_client.request(
                    "PATCH",
                    f"accounts/{account_id}/mediationGroups/{mediation_group_id}",
                    params={"updateMask": update_mask},
                    json_data=mediation_group_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_create_mediation_ab_experiment":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                mediation_group_id = arguments["mediation_group_id"]

                experiment_data = {
                    "displayName": arguments["display_name"],
                    "trafficPercentage": arguments["traffic_percentage"],
                }

                result = await api_client.request(
                    "POST",
                    f"accounts/{account_id}/mediationGroups/{mediation_group_id}/mediationAbExperiment",
                    json_data=experiment_data
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_stop_mediation_ab_experiment":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"
                mediation_group_id = arguments["mediation_group_id"]
                variant_choice = arguments["variant_choice"]

                result = await api_client.request(
                    "POST",
                    f"accounts/{account_id}/mediationGroups/{mediation_group_id}/mediationAbExperiment:stop",
                    json_data={"variantChoice": variant_choice}
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_generate_mediation_report":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                report_spec = {
                    "dateRange": {
                        "startDate": arguments["start_date"],
                        "endDate": arguments["end_date"],
                    },
                    "dimensions": arguments["dimensions"],
                    "metrics": arguments["metrics"],
                    "maxReportRows": arguments.get("max_report_rows", 1000),
                }

                result = await api_client.request(
                    "POST",
                    f"accounts/{account_id}/mediationReport:generate",
                    json_data={"reportSpec": report_spec}
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_generate_network_report":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                report_spec = {
                    "dateRange": {
                        "startDate": arguments["start_date"],
                        "endDate": arguments["end_date"],
                    },
                    "dimensions": arguments["dimensions"],
                    "metrics": arguments["metrics"],
                    "maxReportRows": arguments.get("max_report_rows", 1000),
                }

                result = await api_client.request(
                    "POST",
                    f"accounts/{account_id}/networkReport:generate",
                    json_data={"reportSpec": report_spec}
                )
                return MCPResponse(success=True, data=result)

            elif tool_name == "admob_generate_campaign_report":
                account_id = arguments["account_id"]
                if not account_id.startswith("pub-"):
                    account_id = f"pub-{account_id}"

                report_spec = {
                    "dateRange": {
                        "startDate": arguments["start_date"],
                        "endDate": arguments["end_date"],
                    },
                    "dimensions": arguments["dimensions"],
                    "metrics": arguments["metrics"],
                    "languageCode": arguments.get("language_code", "en-US"),
                }

                result = await api_client.request(
                    "POST",
                    f"accounts/{account_id}/campaignReport:generate",
                    json_data={"reportSpec": report_spec}
                )
                return MCPResponse(success=True, data=result)

            else:
                return MCPResponse(
                    success=False,
                    data=None,
                    error=f"Unknown tool: {tool_name}",
                )

        except Exception as e:
            return MCPResponse(success=False, data=None, error=str(e))

    async def list_accounts(
        self, page_size: int = 20, page_token: Optional[str] = None
    ) -> MCPResponse:
        """List all AdMob accounts."""
        args = {"page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        return await self.call_tool("admob_list_accounts", args)

    async def get_account(self, account_id: str) -> MCPResponse:
        """Get details for a specific account."""
        return await self.call_tool("admob_get_account", {"account_id": account_id})

    async def list_apps(
        self, account_id: str, page_size: int = 20, page_token: Optional[str] = None
    ) -> MCPResponse:
        """List all apps for an account."""
        args = {"account_id": account_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        return await self.call_tool("admob_list_apps", args)

    async def list_ad_units(
        self, account_id: str, page_size: int = 20, page_token: Optional[str] = None
    ) -> MCPResponse:
        """List all ad units for an account."""
        args = {"account_id": account_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        return await self.call_tool("admob_list_ad_units", args)

    async def list_ad_sources(
        self, account_id: str, page_size: int = 100, page_token: Optional[str] = None
    ) -> MCPResponse:
        """
        List all mediation ad sources (ad networks) for an account.

        This is a v1beta feature that returns available ad networks like
        AdMob, Facebook Audience Network, AppLovin, Unity Ads, etc.
        """
        args = {"account_id": account_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        return await self.call_tool("admob_list_ad_sources", args)

    async def generate_mediation_report(
        self,
        account_id: str,
        start_date: dict,
        end_date: dict,
        dimensions: list[str],
        metrics: list[str],
        max_report_rows: int = 1000,
    ) -> MCPResponse:
        """Generate a mediation performance report."""
        return await self.call_tool(
            "admob_generate_mediation_report",
            {
                "account_id": account_id,
                "start_date": start_date,
                "end_date": end_date,
                "dimensions": dimensions,
                "metrics": metrics,
                "max_report_rows": max_report_rows,
            },
        )

    async def generate_network_report(
        self,
        account_id: str,
        start_date: dict,
        end_date: dict,
        dimensions: list[str],
        metrics: list[str],
        max_report_rows: int = 1000,
    ) -> MCPResponse:
        """Generate a network performance report."""
        return await self.call_tool(
            "admob_generate_network_report",
            {
                "account_id": account_id,
                "start_date": start_date,
                "end_date": end_date,
                "dimensions": dimensions,
                "metrics": metrics,
                "max_report_rows": max_report_rows,
            },
        )

    async def create_app(
        self, account_id: str, app_store_id: str, display_name: Optional[str] = None
    ) -> MCPResponse:
        """Create a new app in AdMob."""
        args = {"account_id": account_id, "app_store_id": app_store_id}
        if display_name:
            args["display_name"] = display_name
        return await self.call_tool("admob_create_app", args)

    async def create_ad_unit(
        self,
        account_id: str,
        app_id: str,
        display_name: str,
        ad_format: str,
        ad_types: Optional[list[str]] = None,
    ) -> MCPResponse:
        """Create a new ad unit."""
        args = {
            "account_id": account_id,
            "app_id": app_id,
            "display_name": display_name,
            "ad_format": ad_format,
        }
        if ad_types:
            args["ad_types"] = ad_types
        return await self.call_tool("admob_create_ad_unit", args)

    async def list_ad_unit_mappings(
        self,
        account_id: str,
        ad_unit_id: str,
        page_size: int = 20,
        page_token: Optional[str] = None,
        filter_str: Optional[str] = None,
    ) -> MCPResponse:
        """List ad unit mappings for an ad unit."""
        args = {"account_id": account_id, "ad_unit_id": ad_unit_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        if filter_str:
            args["filter"] = filter_str
        return await self.call_tool("admob_list_ad_unit_mappings", args)

    async def create_ad_unit_mapping(
        self,
        account_id: str,
        ad_unit_id: str,
        ad_source_id: str,
        display_name: str,
        ad_unit_configurations: Optional[dict] = None,
    ) -> MCPResponse:
        """Create an ad unit mapping to connect ad unit to ad source."""
        args = {
            "account_id": account_id,
            "ad_unit_id": ad_unit_id,
            "ad_source_id": ad_source_id,
            "display_name": display_name,
        }
        if ad_unit_configurations:
            args["ad_unit_configurations"] = ad_unit_configurations
        return await self.call_tool("admob_create_ad_unit_mapping", args)

    async def batch_create_ad_unit_mappings(
        self,
        account_id: str,
        mappings: list[dict],
    ) -> MCPResponse:
        """Batch create ad unit mappings (up to 100 at once)."""
        return await self.call_tool(
            "admob_batch_create_ad_unit_mappings",
            {"account_id": account_id, "mappings": mappings},
        )

    async def list_adapters(
        self,
        account_id: str,
        ad_source_id: str,
        page_size: int = 100,
        page_token: Optional[str] = None,
    ) -> MCPResponse:
        """List adapters for an ad source."""
        args = {"account_id": account_id, "ad_source_id": ad_source_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        return await self.call_tool("admob_list_adapters", args)

    async def list_mediation_groups(
        self,
        account_id: str,
        page_size: int = 20,
        page_token: Optional[str] = None,
        filter_str: Optional[str] = None,
    ) -> MCPResponse:
        """List mediation groups for an account."""
        args = {"account_id": account_id, "page_size": page_size}
        if page_token:
            args["page_token"] = page_token
        if filter_str:
            args["filter"] = filter_str
        return await self.call_tool("admob_list_mediation_groups", args)

    async def create_mediation_group(
        self,
        account_id: str,
        display_name: str,
        targeting: dict,
        state: str = "ENABLED",
    ) -> MCPResponse:
        """Create a new mediation group."""
        return await self.call_tool(
            "admob_create_mediation_group",
            {
                "account_id": account_id,
                "display_name": display_name,
                "targeting": targeting,
                "state": state,
            },
        )

    async def update_mediation_group(
        self,
        account_id: str,
        mediation_group_id: str,
        mediation_group_data: dict,
        update_mask: str,
    ) -> MCPResponse:
        """Update an existing mediation group."""
        return await self.call_tool(
            "admob_update_mediation_group",
            {
                "account_id": account_id,
                "mediation_group_id": mediation_group_id,
                "mediation_group_data": mediation_group_data,
                "update_mask": update_mask,
            },
        )

    async def create_mediation_ab_experiment(
        self,
        account_id: str,
        mediation_group_id: str,
        display_name: str,
        traffic_percentage: int,
    ) -> MCPResponse:
        """Create an A/B experiment for a mediation group."""
        return await self.call_tool(
            "admob_create_mediation_ab_experiment",
            {
                "account_id": account_id,
                "mediation_group_id": mediation_group_id,
                "display_name": display_name,
                "traffic_percentage": traffic_percentage,
            },
        )

    async def stop_mediation_ab_experiment(
        self,
        account_id: str,
        mediation_group_id: str,
        variant_choice: str,
    ) -> MCPResponse:
        """Stop an A/B experiment and apply the chosen variant."""
        return await self.call_tool(
            "admob_stop_mediation_ab_experiment",
            {
                "account_id": account_id,
                "mediation_group_id": mediation_group_id,
                "variant_choice": variant_choice,
            },
        )

    async def generate_campaign_report(
        self,
        account_id: str,
        start_date: dict,
        end_date: dict,
        dimensions: list[str],
        metrics: list[str],
        language_code: str = "en-US",
    ) -> MCPResponse:
        """Generate a campaign performance report."""
        return await self.call_tool(
            "admob_generate_campaign_report",
            {
                "account_id": account_id,
                "start_date": start_date,
                "end_date": end_date,
                "dimensions": dimensions,
                "metrics": metrics,
                "language_code": language_code,
            },
        )


# Global client instance
_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get or create the global MCP client instance."""
    global _client
    if _client is None:
        _client = MCPClient()
    return _client
