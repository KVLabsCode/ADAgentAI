"""
AdMob API Client with OAuth 2.0 authentication.

Complete v1beta API client supporting all endpoints:
- Accounts, Apps, Ad Units (read + write)
- Ad Sources, Adapters
- Mediation Groups (CRUD + A/B experiments)
- Reports (Mediation, Network, Campaign)
"""

import os
from typing import Optional, Dict, Any, List
import httpx

from .constants import API_BASE_URL, REQUEST_TIMEOUT, OAUTH_SCOPES, DEFAULT_PAGE_SIZE


class AdMobAPIError(Exception):
    """Custom exception for AdMob API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AdMobClient:
    """
    Async client for AdMob API v1beta with OAuth 2.0 authentication.

    Supports two authentication methods:
    1. Service Account (GOOGLE_APPLICATION_CREDENTIALS)
    2. Access Token (ADMOB_ACCESS_TOKEN)
    """

    def __init__(self):
        self._access_token: Optional[str] = None
        self._credentials = None

    async def _get_access_token(self) -> str:
        """Get or refresh the OAuth 2.0 access token."""
        # Method 1: Direct access token from environment
        if os.environ.get("ADMOB_ACCESS_TOKEN"):
            return os.environ["ADMOB_ACCESS_TOKEN"]

        # Method 2: Service account credentials
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path:
            try:
                from google.oauth2 import service_account
                from google.auth.transport.requests import Request

                if self._credentials is None:
                    self._credentials = service_account.Credentials.from_service_account_file(
                        credentials_path,
                        scopes=OAUTH_SCOPES
                    )

                if self._credentials.expired or not self._credentials.token:
                    self._credentials.refresh(Request())

                return self._credentials.token
            except ImportError:
                raise AdMobAPIError(
                    "Google Auth library not installed. Run: pip install google-auth",
                    details={"fix": "pip install google-auth"}
                )
            except Exception as e:
                raise AdMobAPIError(
                    f"Failed to authenticate with service account: {str(e)}",
                    details={"credentials_path": credentials_path}
                )

        raise AdMobAPIError(
            "No authentication configured. Set ADMOB_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS.",
            details={
                "options": [
                    "Set ADMOB_ACCESS_TOKEN with a valid OAuth 2.0 access token",
                    "Set GOOGLE_APPLICATION_CREDENTIALS with path to service account JSON"
                ]
            }
        )

    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated request to the AdMob API."""
        access_token = await self._get_access_token()

        url = f"{API_BASE_URL}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                )

                if response.status_code in (200, 201):
                    return response.json()

                error_body = {}
                try:
                    error_body = response.json()
                except Exception:
                    pass

                error_message = self._format_error(response.status_code, error_body)
                raise AdMobAPIError(error_message, response.status_code, error_body)

            except httpx.TimeoutException:
                raise AdMobAPIError(
                    "Request timed out. Please try again.",
                    details={"timeout_seconds": REQUEST_TIMEOUT}
                )
            except httpx.ConnectError:
                raise AdMobAPIError(
                    "Failed to connect to AdMob API. Check your network connection."
                )

    def _format_error(self, status_code: int, error_body: dict) -> str:
        """Format API error into actionable message."""
        error_info = error_body.get("error", {})
        api_message = error_info.get("message", "Unknown error")

        if status_code == 401:
            return f"Authentication failed: {api_message}. Check your access token or service account."
        elif status_code == 403:
            return f"Permission denied: {api_message}. This endpoint may require special access from your Google account manager."
        elif status_code == 404:
            return f"Resource not found: {api_message}. Verify the ID exists."
        elif status_code == 429:
            return "Rate limit exceeded. Please wait before making more requests."
        elif status_code >= 500:
            return f"AdMob API server error ({status_code}). Please try again later."
        else:
            return f"API error ({status_code}): {api_message}"

    # =========================================================================
    # Account Methods
    # =========================================================================

    async def list_accounts(self, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None) -> Dict[str, Any]:
        """List AdMob publisher accounts."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self.request("GET", "accounts", params=params)

    async def get_account(self, account_id: str) -> Dict[str, Any]:
        """Get a specific AdMob publisher account."""
        return await self.request("GET", f"accounts/{account_id}")

    # =========================================================================
    # App Methods
    # =========================================================================

    async def list_apps(self, account_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None) -> Dict[str, Any]:
        """List apps under an AdMob account."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self.request("GET", f"accounts/{account_id}/apps", params=params)

    async def create_app(self, account_id: str, app_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an app under an AdMob account. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/apps", json_data=app_data)

    # =========================================================================
    # Ad Unit Methods
    # =========================================================================

    async def list_ad_units(self, account_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None) -> Dict[str, Any]:
        """List ad units under an AdMob account."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self.request("GET", f"accounts/{account_id}/adUnits", params=params)

    async def create_ad_unit(self, account_id: str, ad_unit_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an ad unit. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/adUnits", json_data=ad_unit_data)

    # =========================================================================
    # Ad Unit Mappings Methods
    # =========================================================================

    async def list_ad_unit_mappings(
        self, account_id: str, ad_unit_id: str, page_size: int = DEFAULT_PAGE_SIZE,
        page_token: Optional[str] = None, filter_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """List ad unit mappings for a specific ad unit."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"accounts/{account_id}/adUnits/{ad_unit_id}/adUnitMappings", params=params)

    async def create_ad_unit_mapping(self, account_id: str, ad_unit_id: str, mapping_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an ad unit mapping. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/adUnits/{ad_unit_id}/adUnitMappings", json_data=mapping_data)

    async def batch_create_ad_unit_mappings(self, account_id: str, mappings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch create ad unit mappings (max 100). Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/adUnitMappings:batchCreate", json_data={"requests": mappings})

    # =========================================================================
    # Ad Sources Methods
    # =========================================================================

    async def list_ad_sources(self, account_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None) -> Dict[str, Any]:
        """List mediation ad sources (ad networks) available."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self.request("GET", f"accounts/{account_id}/adSources", params=params)

    async def list_adapters(self, account_id: str, ad_source_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None) -> Dict[str, Any]:
        """List adapters for a specific ad source."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self.request("GET", f"accounts/{account_id}/adSources/{ad_source_id}/adapters", params=params)

    # =========================================================================
    # Mediation Groups Methods
    # =========================================================================

    async def list_mediation_groups(
        self, account_id: str, page_size: int = DEFAULT_PAGE_SIZE,
        page_token: Optional[str] = None, filter_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """List mediation groups. Requires special access."""
        params = {"pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"accounts/{account_id}/mediationGroups", params=params)

    async def create_mediation_group(self, account_id: str, mediation_group_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a mediation group. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/mediationGroups", json_data=mediation_group_data)

    async def update_mediation_group(self, account_id: str, mediation_group_id: str, mediation_group_data: Dict[str, Any], update_mask: str) -> Dict[str, Any]:
        """Update a mediation group. Requires special access."""
        params = {"updateMask": update_mask}
        return await self.request("PATCH", f"accounts/{account_id}/mediationGroups/{mediation_group_id}", params=params, json_data=mediation_group_data)

    # =========================================================================
    # Mediation A/B Experiments Methods
    # =========================================================================

    async def create_mediation_ab_experiment(self, account_id: str, mediation_group_id: str, experiment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a mediation A/B experiment. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/mediationGroups/{mediation_group_id}/mediationAbExperiments", json_data=experiment_data)

    async def stop_mediation_ab_experiment(self, account_id: str, mediation_group_id: str, variant_choice: str) -> Dict[str, Any]:
        """Stop a mediation A/B experiment and choose a variant. Requires special access."""
        return await self.request("POST", f"accounts/{account_id}/mediationGroups/{mediation_group_id}/mediationAbExperiments:stop", json_data={"variantChoice": variant_choice})

    # =========================================================================
    # Report Methods
    # =========================================================================

    async def generate_mediation_report(self, account_id: str, report_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AdMob mediation report."""
        return await self.request("POST", f"accounts/{account_id}/mediationReport:generate", json_data={"reportSpec": report_spec})

    async def generate_network_report(self, account_id: str, report_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AdMob network report."""
        return await self.request("POST", f"accounts/{account_id}/networkReport:generate", json_data={"reportSpec": report_spec})

    async def generate_campaign_report(self, account_id: str, report_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AdMob campaign report."""
        return await self.request("POST", f"accounts/{account_id}/campaignReport:generate", json_data={"reportSpec": report_spec})


# Global client instance
_client: Optional[AdMobClient] = None


def get_client() -> AdMobClient:
    """Get or create the global AdMob client instance."""
    global _client
    if _client is None:
        _client = AdMobClient()
    return _client
