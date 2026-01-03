"""
Google Ad Manager API Client with OAuth 2.0 authentication.

Complete v1 API client supporting ALL 154 endpoints.
Auto-generated from discovery document.
"""

import os
from typing import Optional, Dict, Any, List
import httpx

from .constants import API_BASE_URL, REQUEST_TIMEOUT, OAUTH_SCOPES, DEFAULT_PAGE_SIZE


class AdManagerAPIError(Exception):
    """Custom exception for Ad Manager API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AdManagerClient:
    """
    Async client for Google Ad Manager API v1 with OAuth 2.0 authentication.

    Supports ALL 154 API endpoints.
    """

    def __init__(self):
        self._access_token: Optional[str] = None
        self._credentials = None

    async def _get_access_token(self) -> str:
        """Get or refresh the OAuth 2.0 access token."""
        if os.environ.get("AD_MANAGER_ACCESS_TOKEN"):
            return os.environ["AD_MANAGER_ACCESS_TOKEN"]

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
                raise AdManagerAPIError(
                    "Google Auth library not installed. Run: pip install google-auth",
                    details={"fix": "pip install google-auth"}
                )
            except Exception as e:
                raise AdManagerAPIError(
                    f"Failed to authenticate with service account: {str(e)}",
                    details={"credentials_path": credentials_path}
                )

        raise AdManagerAPIError(
            "No authentication configured. Set AD_MANAGER_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS."
        )

    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated request to the Ad Manager API."""
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
                    return response.json() if response.text else {}

                error_body = {}
                try:
                    error_body = response.json()
                except Exception:
                    pass

                error_message = self._format_error(response.status_code, error_body)
                raise AdManagerAPIError(error_message, response.status_code, error_body)

            except httpx.TimeoutException:
                raise AdManagerAPIError("Request timed out. Please try again.")
            except httpx.ConnectError:
                raise AdManagerAPIError("Failed to connect to Ad Manager API.")

    def _format_error(self, status_code: int, error_body: dict) -> str:
        """Format API error into actionable message."""
        error_info = error_body.get("error", {})
        api_message = error_info.get("message", "Unknown error")

        if status_code == 401:
            return f"Authentication failed: {api_message}"
        elif status_code == 403:
            return f"Permission denied: {api_message}"
        elif status_code == 404:
            return f"Resource not found: {api_message}"
        elif status_code == 429:
            return "Rate limit exceeded. Please wait."
        elif status_code >= 500:
            return f"Server error ({status_code}). Try again later."
        else:
            return f"API error ({status_code}): {api_message}"


    # =========================================================================
    # Adunitsizes Methods (1 endpoints)
    # =========================================================================

    async def list_networks_ad_unit_sizes(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of AdUnitSize objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/adUnitSizes", params=params or None)

    # =========================================================================
    # Adunits Methods (9 endpoints)
    # =========================================================================

    async def get_networks_ad_units(self, network_code: str, ad_units_id: str) -> Dict[str, Any]:
        """API to retrieve an AdUnit object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/adUnits/{ad_units_id}", params=params or None)

    async def list_networks_ad_units(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of AdUnit objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/adUnits", params=params or None)

    async def create_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `AdUnit` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits", params=params or None, json_data=data)

    async def patch_networks_ad_units(self, network_code: str, ad_units_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update an `AdUnit` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/adUnits/{ad_units_id}", params=params or None, json_data=data)

    async def batch_create_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `AdUnit` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits:batchCreate", params=params or None, json_data=data)

    async def batch_update_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `AdUnit` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits:batchUpdate", params=params or None, json_data=data)

    async def batch_activate_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch activate `AdUnit` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits:batchActivate", params=params or None, json_data=data)

    async def batch_deactivate_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Deactivates a list of `AdUnit` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits:batchDeactivate", params=params or None, json_data=data)

    async def batch_archive_networks_ad_units(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Archives a list of `AdUnit` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/adUnits:batchArchive", params=params or None, json_data=data)

    # =========================================================================
    # Applications Methods (2 endpoints)
    # =========================================================================

    async def get_networks_applications(self, network_code: str, applications_id: str) -> Dict[str, Any]:
        """API to retrieve a `Application` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/applications/{applications_id}", params=params or None)

    async def list_networks_applications(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Application` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/applications", params=params or None)

    # =========================================================================
    # Audiencesegments Methods (2 endpoints)
    # =========================================================================

    async def get_networks_audience_segments(self, network_code: str, audience_segments_id: str) -> Dict[str, Any]:
        """API to retrieve an `AudienceSegment` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/audienceSegments/{audience_segments_id}", params=params or None)

    async def list_networks_audience_segments(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `AudienceSegment` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/audienceSegments", params=params or None)

    # =========================================================================
    # Bandwidthgroups Methods (2 endpoints)
    # =========================================================================

    async def get_networks_bandwidth_groups(self, network_code: str, bandwidth_groups_id: str) -> Dict[str, Any]:
        """API to retrieve a `BandwidthGroup` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/bandwidthGroups/{bandwidth_groups_id}", params=params or None)

    async def list_networks_bandwidth_groups(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `BandwidthGroup` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/bandwidthGroups", params=params or None)

    # =========================================================================
    # Browserlanguages Methods (2 endpoints)
    # =========================================================================

    async def get_networks_browser_languages(self, network_code: str, browser_languages_id: str) -> Dict[str, Any]:
        """API to retrieve a `BrowserLanguage` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/browserLanguages/{browser_languages_id}", params=params or None)

    async def list_networks_browser_languages(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `BrowserLanguage` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/browserLanguages", params=params or None)

    # =========================================================================
    # Browsers Methods (2 endpoints)
    # =========================================================================

    async def get_networks_browsers(self, network_code: str, browsers_id: str) -> Dict[str, Any]:
        """API to retrieve a `Browser` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/browsers/{browsers_id}", params=params or None)

    async def list_networks_browsers(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Browser` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/browsers", params=params or None)

    # =========================================================================
    # Cmsmetadatakeys Methods (2 endpoints)
    # =========================================================================

    async def get_networks_cms_metadata_keys(self, network_code: str, cms_metadata_keys_id: str) -> Dict[str, Any]:
        """API to retrieve a `CmsMetadataKey` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/cmsMetadataKeys/{cms_metadata_keys_id}", params=params or None)

    async def list_networks_cms_metadata_keys(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CmsMetadataKey` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/cmsMetadataKeys", params=params or None)

    # =========================================================================
    # Cmsmetadatavalues Methods (2 endpoints)
    # =========================================================================

    async def get_networks_cms_metadata_values(self, network_code: str, cms_metadata_values_id: str) -> Dict[str, Any]:
        """API to retrieve a `CmsMetadataValue` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/cmsMetadataValues/{cms_metadata_values_id}", params=params or None)

    async def list_networks_cms_metadata_values(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CmsMetadataValue` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/cmsMetadataValues", params=params or None)

    # =========================================================================
    # Companies Methods (2 endpoints)
    # =========================================================================

    async def get_networks_companies(self, network_code: str, companies_id: str) -> Dict[str, Any]:
        """API to retrieve a `Company` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/companies/{companies_id}", params=params or None)

    async def list_networks_companies(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Company` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/companies", params=params or None)

    # =========================================================================
    # Contacts Methods (6 endpoints)
    # =========================================================================

    async def get_networks_contacts(self, network_code: str, contacts_id: str) -> Dict[str, Any]:
        """API to retrieve a `Contact` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/contacts/{contacts_id}", params=params or None)

    async def list_networks_contacts(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Contact` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/contacts", params=params or None)

    async def create_networks_contacts(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `Contact` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/contacts", params=params or None, json_data=data)

    async def batch_create_networks_contacts(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `Contact` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/contacts:batchCreate", params=params or None, json_data=data)

    async def patch_networks_contacts(self, network_code: str, contacts_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `Contact` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/contacts/{contacts_id}", params=params or None, json_data=data)

    async def batch_update_networks_contacts(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `Contact` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/contacts:batchUpdate", params=params or None, json_data=data)

    # =========================================================================
    # Content Methods (2 endpoints)
    # =========================================================================

    async def get_networks_content(self, network_code: str, content_id: str) -> Dict[str, Any]:
        """API to retrieve a `Content` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/content/{content_id}", params=params or None)

    async def list_networks_content(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Content` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/content", params=params or None)

    # =========================================================================
    # Contentbundles Methods (2 endpoints)
    # =========================================================================

    async def get_networks_content_bundles(self, network_code: str, content_bundles_id: str) -> Dict[str, Any]:
        """API to retrieve a `ContentBundle` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/contentBundles/{content_bundles_id}", params=params or None)

    async def list_networks_content_bundles(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `ContentBundle` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/contentBundles", params=params or None)

    # =========================================================================
    # Contentlabels Methods (2 endpoints)
    # =========================================================================

    async def get_networks_content_labels(self, network_code: str, content_labels_id: str) -> Dict[str, Any]:
        """API to retrieve a `ContentLabel` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/contentLabels/{content_labels_id}", params=params or None)

    async def list_networks_content_labels(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `ContentLabel` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/contentLabels", params=params or None)

    # =========================================================================
    # Creativetemplates Methods (2 endpoints)
    # =========================================================================

    async def get_networks_creative_templates(self, network_code: str, creative_templates_id: str) -> Dict[str, Any]:
        """API to retrieve a `CreativeTemplate` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/creativeTemplates/{creative_templates_id}", params=params or None)

    async def list_networks_creative_templates(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CreativeTemplate` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/creativeTemplates", params=params or None)

    # =========================================================================
    # Customfields Methods (8 endpoints)
    # =========================================================================

    async def get_networks_custom_fields(self, network_code: str, custom_fields_id: str) -> Dict[str, Any]:
        """API to retrieve a `CustomField` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/customFields/{custom_fields_id}", params=params or None)

    async def list_networks_custom_fields(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CustomField` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/customFields", params=params or None)

    async def create_networks_custom_fields(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `CustomField` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customFields", params=params or None, json_data=data)

    async def batch_create_networks_custom_fields(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `CustomField` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customFields:batchCreate", params=params or None, json_data=data)

    async def patch_networks_custom_fields(self, network_code: str, custom_fields_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `CustomField` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/customFields/{custom_fields_id}", params=params or None, json_data=data)

    async def batch_update_networks_custom_fields(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `CustomField` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customFields:batchUpdate", params=params or None, json_data=data)

    async def batch_activate_networks_custom_fields(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Activates a list of `CustomField` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customFields:batchActivate", params=params or None, json_data=data)

    async def batch_deactivate_networks_custom_fields(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Deactivates a list of `CustomField` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customFields:batchDeactivate", params=params or None, json_data=data)

    # =========================================================================
    # Customtargetingkeys Methods (10 endpoints)
    # =========================================================================

    async def get_networks_custom_targeting_keys(self, network_code: str, custom_targeting_keys_id: str) -> Dict[str, Any]:
        """API to retrieve a `CustomTargetingKey` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/customTargetingKeys/{custom_targeting_keys_id}", params=params or None)

    async def list_networks_custom_targeting_keys(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CustomTargetingKey` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/customTargetingKeys", params=params or None)

    async def create_networks_custom_targeting_keys(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `CustomTargetingKey` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customTargetingKeys", params=params or None, json_data=data)

    async def batch_create_networks_custom_targeting_keys(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `CustomTargetingKey` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customTargetingKeys:batchCreate", params=params or None, json_data=data)

    async def patch_networks_custom_targeting_keys(self, network_code: str, custom_targeting_keys_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `CustomTargetingKey` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/customTargetingKeys/{custom_targeting_keys_id}", params=params or None, json_data=data)

    async def batch_update_networks_custom_targeting_keys(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `CustomTargetingKey` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customTargetingKeys:batchUpdate", params=params or None, json_data=data)

    async def batch_activate_networks_custom_targeting_keys(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch activate `CustomTargetingKey` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customTargetingKeys:batchActivate", params=params or None, json_data=data)

    async def batch_deactivate_networks_custom_targeting_keys(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Deactivates a list of `CustomTargetingKey` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/customTargetingKeys:batchDeactivate", params=params or None, json_data=data)

    async def get_networks_custom_targeting_keys_custom_targeting_values(self, network_code: str, custom_targeting_keys_id: str, custom_targeting_values_id: str) -> Dict[str, Any]:
        """API to retrieve a `CustomTargetingValue` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/customTargetingKeys/{custom_targeting_keys_id}/customTargetingValues/{custom_targeting_values_id}", params=params or None)

    async def list_networks_custom_targeting_keys_custom_targeting_values(self, network_code: str, custom_targeting_keys_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CustomTargetingValue` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/customTargetingKeys/{custom_targeting_keys_id}/customTargetingValues", params=params or None)

    # =========================================================================
    # Customtargetingvalues Methods (2 endpoints)
    # =========================================================================

    async def get_networks_custom_targeting_values(self, network_code: str, custom_targeting_values_id: str) -> Dict[str, Any]:
        """API to retrieve a `CustomTargetingValue` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/customTargetingValues/{custom_targeting_values_id}", params=params or None)

    async def list_networks_custom_targeting_values(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `CustomTargetingValue` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/customTargetingValues", params=params or None)

    # =========================================================================
    # Devicecapabilities Methods (2 endpoints)
    # =========================================================================

    async def get_networks_device_capabilities(self, network_code: str, device_capabilities_id: str) -> Dict[str, Any]:
        """API to retrieve a `DeviceCapability` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/deviceCapabilities/{device_capabilities_id}", params=params or None)

    async def list_networks_device_capabilities(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `DeviceCapability` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/deviceCapabilities", params=params or None)

    # =========================================================================
    # Devicecategories Methods (2 endpoints)
    # =========================================================================

    async def get_networks_device_categories(self, network_code: str, device_categories_id: str) -> Dict[str, Any]:
        """API to retrieve a `DeviceCategory` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/deviceCategories/{device_categories_id}", params=params or None)

    async def list_networks_device_categories(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `DeviceCategory` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/deviceCategories", params=params or None)

    # =========================================================================
    # Devicemanufacturers Methods (2 endpoints)
    # =========================================================================

    async def get_networks_device_manufacturers(self, network_code: str, device_manufacturers_id: str) -> Dict[str, Any]:
        """API to retrieve a `DeviceManufacturer` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/deviceManufacturers/{device_manufacturers_id}", params=params or None)

    async def list_networks_device_manufacturers(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `DeviceManufacturer` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/deviceManufacturers", params=params or None)

    # =========================================================================
    # Entitysignalsmappings Methods (6 endpoints)
    # =========================================================================

    async def get_networks_entity_signals_mappings(self, network_code: str, entity_signals_mappings_id: str) -> Dict[str, Any]:
        """API to retrieve a `EntitySignalsMapping` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/entitySignalsMappings/{entity_signals_mappings_id}", params=params or None)

    async def list_networks_entity_signals_mappings(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `EntitySignalsMapping` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/entitySignalsMappings", params=params or None)

    async def create_networks_entity_signals_mappings(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `EntitySignalsMapping` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/entitySignalsMappings", params=params or None, json_data=data)

    async def patch_networks_entity_signals_mappings(self, network_code: str, entity_signals_mappings_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update an `EntitySignalsMapping` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/entitySignalsMappings/{entity_signals_mappings_id}", params=params or None, json_data=data)

    async def batch_create_networks_entity_signals_mappings(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `EntitySignalsMapping` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/entitySignalsMappings:batchCreate", params=params or None, json_data=data)

    async def batch_update_networks_entity_signals_mappings(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `EntitySignalsMapping` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/entitySignalsMappings:batchUpdate", params=params or None, json_data=data)

    # =========================================================================
    # Geotargets Methods (2 endpoints)
    # =========================================================================

    async def get_networks_geo_targets(self, network_code: str, geo_targets_id: str) -> Dict[str, Any]:
        """API to retrieve a `GeoTarget` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/geoTargets/{geo_targets_id}", params=params or None)

    async def list_networks_geo_targets(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `GeoTarget` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/geoTargets", params=params or None)

    # =========================================================================
    # Get Methods (1 endpoints)
    # =========================================================================

    async def get_networks(self, network_code: str) -> Dict[str, Any]:
        """API to retrieve a Network object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}", params=params or None)

    # =========================================================================
    # Lineitems Methods (2 endpoints)
    # =========================================================================

    async def get_networks_line_items(self, network_code: str, line_items_id: str) -> Dict[str, Any]:
        """API to retrieve a `LineItem` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/lineItems/{line_items_id}", params=params or None)

    async def list_networks_line_items(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `LineItem` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/lineItems", params=params or None)

    # =========================================================================
    # List Methods (1 endpoints)
    # =========================================================================

    async def list_networks(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve all the networks the current user has access to."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks", params=params or None)

    # =========================================================================
    # Livestreamevents Methods (3 endpoints)
    # =========================================================================

    async def get_networks_live_stream_events_ad_breaks(self, network_code: str, live_stream_events_id: str, ad_breaks_id: str) -> Dict[str, Any]:
        """API to retrieve an `AdBreak` object. Query an ad break by its resource name or c"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/liveStreamEvents/{live_stream_events_id}/adBreaks/{ad_breaks_id}", params=params or None)

    async def list_networks_live_stream_events_ad_breaks(self, network_code: str, live_stream_events_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query"""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/liveStreamEvents/{live_stream_events_id}/adBreaks", params=params or None)

    async def create_networks_live_stream_events_ad_breaks(self, network_code: str, live_stream_events_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a liv"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/liveStreamEvents/{live_stream_events_id}/adBreaks", params=params or None, json_data=data)

    # =========================================================================
    # Livestreameventsbyassetkey Methods (5 endpoints)
    # =========================================================================

    async def get_networks_live_stream_events_by_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_asset_key_id: str, ad_breaks_id: str) -> Dict[str, Any]:
        """API to retrieve an `AdBreak` object. Query an ad break by its resource name or c"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/liveStreamEventsByAssetKey/{live_stream_events_by_asset_key_id}/adBreaks/{ad_breaks_id}", params=params or None)

    async def list_networks_live_stream_events_by_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_asset_key_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query"""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/liveStreamEventsByAssetKey/{live_stream_events_by_asset_key_id}/adBreaks", params=params or None)

    async def create_networks_live_stream_events_by_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_asset_key_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a liv"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/liveStreamEventsByAssetKey/{live_stream_events_by_asset_key_id}/adBreaks", params=params or None, json_data=data)

    async def patch_networks_live_stream_events_by_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_asset_key_id: str, ad_breaks_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update an `AdBreak` object. Modify an ad break when its state is `SCHEDUL"""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/liveStreamEventsByAssetKey/{live_stream_events_by_asset_key_id}/adBreaks/{ad_breaks_id}", params=params or None, json_data=data)

    async def delete_networks_live_stream_events_by_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_asset_key_id: str, ad_breaks_id: str) -> Dict[str, Any]:
        """API to delete an `AdBreak` object. Deletes and cancels an incomplete ad break, m"""
        params: Dict[str, Any] = {}
        return await self.request("DELETE", f"networks/{network_code}/liveStreamEventsByAssetKey/{live_stream_events_by_asset_key_id}/adBreaks/{ad_breaks_id}", params=params or None)

    # =========================================================================
    # Livestreameventsbycustomassetkey Methods (3 endpoints)
    # =========================================================================

    async def get_networks_live_stream_events_by_custom_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_custom_asset_key_id: str, ad_breaks_id: str) -> Dict[str, Any]:
        """API to retrieve an `AdBreak` object. Query an ad break by its resource name or c"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/liveStreamEventsByCustomAssetKey/{live_stream_events_by_custom_asset_key_id}/adBreaks/{ad_breaks_id}", params=params or None)

    async def list_networks_live_stream_events_by_custom_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_custom_asset_key_id: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query"""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/liveStreamEventsByCustomAssetKey/{live_stream_events_by_custom_asset_key_id}/adBreaks", params=params or None)

    async def create_networks_live_stream_events_by_custom_asset_key_ad_breaks(self, network_code: str, live_stream_events_by_custom_asset_key_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a liv"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/liveStreamEventsByCustomAssetKey/{live_stream_events_by_custom_asset_key_id}/adBreaks", params=params or None, json_data=data)

    # =========================================================================
    # Mobilecarriers Methods (2 endpoints)
    # =========================================================================

    async def get_networks_mobile_carriers(self, network_code: str, mobile_carriers_id: str) -> Dict[str, Any]:
        """API to retrieve a `MobileCarrier` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/mobileCarriers/{mobile_carriers_id}", params=params or None)

    async def list_networks_mobile_carriers(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `MobileCarrier` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/mobileCarriers", params=params or None)

    # =========================================================================
    # Mobiledevicesubmodels Methods (2 endpoints)
    # =========================================================================

    async def get_networks_mobile_device_submodels(self, network_code: str, mobile_device_submodels_id: str) -> Dict[str, Any]:
        """API to retrieve a `MobileDeviceSubmodel` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/mobileDeviceSubmodels/{mobile_device_submodels_id}", params=params or None)

    async def list_networks_mobile_device_submodels(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `MobileDeviceSubmodel` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/mobileDeviceSubmodels", params=params or None)

    # =========================================================================
    # Mobiledevices Methods (2 endpoints)
    # =========================================================================

    async def get_networks_mobile_devices(self, network_code: str, mobile_devices_id: str) -> Dict[str, Any]:
        """API to retrieve a `MobileDevice` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/mobileDevices/{mobile_devices_id}", params=params or None)

    async def list_networks_mobile_devices(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `MobileDevice` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/mobileDevices", params=params or None)

    # =========================================================================
    # Operatingsystemversions Methods (2 endpoints)
    # =========================================================================

    async def get_networks_operating_system_versions(self, network_code: str, operating_system_versions_id: str) -> Dict[str, Any]:
        """API to retrieve a `OperatingSystemVersion` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/operatingSystemVersions/{operating_system_versions_id}", params=params or None)

    async def list_networks_operating_system_versions(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `OperatingSystemVersion` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/operatingSystemVersions", params=params or None)

    # =========================================================================
    # Operatingsystems Methods (2 endpoints)
    # =========================================================================

    async def get_networks_operating_systems(self, network_code: str, operating_systems_id: str) -> Dict[str, Any]:
        """API to retrieve a `OperatingSystem` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/operatingSystems/{operating_systems_id}", params=params or None)

    async def list_networks_operating_systems(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `OperatingSystem` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/operatingSystems", params=params or None)

    # =========================================================================
    # Operations Methods (4 endpoints)
    # =========================================================================

    async def get_networks_operations_reports_runs(self, network_code: str, runs_id: str) -> Dict[str, Any]:
        """Gets the latest state of a long-running operation. Clients can use this method t"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/operations/reports/runs/{runs_id}", params=params or None)

    async def list_operations(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """Lists operations that match the specified filter in the request. If the server d"""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"operations", params=params or None)

    async def delete_operations(self, network_code: str, operations_id: str) -> Dict[str, Any]:
        """Deletes a long-running operation. This method indicates that the client is no lo"""
        params: Dict[str, Any] = {}
        return await self.request("DELETE", f"operations/{operations_id}", params=params or None)

    async def cancel_operations(self, network_code: str, operations_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Starts asynchronous cancellation on a long-running operation. The server makes a"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"operations/{operations_id}:cancel", params=params or None, json_data=data)

    # =========================================================================
    # Orders Methods (2 endpoints)
    # =========================================================================

    async def get_networks_orders(self, network_code: str, orders_id: str) -> Dict[str, Any]:
        """API to retrieve an Order object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/orders/{orders_id}", params=params or None)

    async def list_networks_orders(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Order` objects. Fields used for literal matching in f"""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/orders", params=params or None)

    # =========================================================================
    # Placements Methods (9 endpoints)
    # =========================================================================

    async def get_networks_placements(self, network_code: str, placements_id: str) -> Dict[str, Any]:
        """API to retrieve a `Placement` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/placements/{placements_id}", params=params or None)

    async def list_networks_placements(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Placement` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/placements", params=params or None)

    async def create_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create an `Placement` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements", params=params or None, json_data=data)

    async def patch_networks_placements(self, network_code: str, placements_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update an `Placement` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/placements/{placements_id}", params=params or None, json_data=data)

    async def batch_create_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `Placement` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements:batchCreate", params=params or None, json_data=data)

    async def batch_update_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `Placement` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements:batchUpdate", params=params or None, json_data=data)

    async def batch_activate_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Activates a list of `Placement` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements:batchActivate", params=params or None, json_data=data)

    async def batch_deactivate_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Deactivates a list of `Placement` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements:batchDeactivate", params=params or None, json_data=data)

    async def batch_archive_networks_placements(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Archives a list of `Placement` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/placements:batchArchive", params=params or None, json_data=data)

    # =========================================================================
    # Privateauctiondeals Methods (4 endpoints)
    # =========================================================================

    async def get_networks_private_auction_deals(self, network_code: str, private_auction_deals_id: str) -> Dict[str, Any]:
        """API to retrieve a `PrivateAuctionDeal` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/privateAuctionDeals/{private_auction_deals_id}", params=params or None)

    async def list_networks_private_auction_deals(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `PrivateAuctionDeal` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/privateAuctionDeals", params=params or None)

    async def create_networks_private_auction_deals(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `PrivateAuctionDeal` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/privateAuctionDeals", params=params or None, json_data=data)

    async def patch_networks_private_auction_deals(self, network_code: str, private_auction_deals_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `PrivateAuctionDeal` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/privateAuctionDeals/{private_auction_deals_id}", params=params or None, json_data=data)

    # =========================================================================
    # Privateauctions Methods (4 endpoints)
    # =========================================================================

    async def get_networks_private_auctions(self, network_code: str, private_auctions_id: str) -> Dict[str, Any]:
        """API to retrieve a `PrivateAuction` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/privateAuctions/{private_auctions_id}", params=params or None)

    async def list_networks_private_auctions(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `PrivateAuction` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/privateAuctions", params=params or None)

    async def create_networks_private_auctions(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `PrivateAuction` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/privateAuctions", params=params or None, json_data=data)

    async def patch_networks_private_auctions(self, network_code: str, private_auctions_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `PrivateAuction` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/privateAuctions/{private_auctions_id}", params=params or None, json_data=data)

    # =========================================================================
    # Programmaticbuyers Methods (2 endpoints)
    # =========================================================================

    async def get_networks_programmatic_buyers(self, network_code: str, programmatic_buyers_id: str) -> Dict[str, Any]:
        """API to retrieve a `ProgrammaticBuyer` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/programmaticBuyers/{programmatic_buyers_id}", params=params or None)

    async def list_networks_programmatic_buyers(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `ProgrammaticBuyer` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/programmaticBuyers", params=params or None)

    # =========================================================================
    # Reports Methods (6 endpoints)
    # =========================================================================

    async def get_networks_reports(self, network_code: str, reports_id: str) -> Dict[str, Any]:
        """API to retrieve a `Report` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/reports/{reports_id}", params=params or None)

    async def list_networks_reports(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Report` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/reports", params=params or None)

    async def create_networks_reports(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `Report` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/reports", params=params or None, json_data=data)

    async def patch_networks_reports(self, network_code: str, reports_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `Report` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/reports/{reports_id}", params=params or None, json_data=data)

    async def run_networks_reports(self, network_code: str, reports_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Initiates the execution of an existing report asynchronously. Users can get the """
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/reports/{reports_id}:run", params=params or None, json_data=data)

    async def fetch_rows_networks_reports_results(self, network_code: str, reports_id: str, results_id: str) -> Dict[str, Any]:
        """Returns the result rows from a completed report. The caller must have previously"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/reports/{reports_id}/results/{results_id}:fetchRows", params=params or None)

    # =========================================================================
    # Roles Methods (2 endpoints)
    # =========================================================================

    async def get_networks_roles(self, network_code: str, roles_id: str) -> Dict[str, Any]:
        """API to retrieve a `Role` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/roles/{roles_id}", params=params or None)

    async def list_networks_roles(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Role` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/roles", params=params or None)

    # =========================================================================
    # Sites Methods (8 endpoints)
    # =========================================================================

    async def get_networks_sites(self, network_code: str, sites_id: str) -> Dict[str, Any]:
        """API to retrieve a `Site` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/sites/{sites_id}", params=params or None)

    async def list_networks_sites(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Site` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/sites", params=params or None)

    async def create_networks_sites(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `Site` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/sites", params=params or None, json_data=data)

    async def batch_create_networks_sites(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `Site` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/sites:batchCreate", params=params or None, json_data=data)

    async def patch_networks_sites(self, network_code: str, sites_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `Site` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/sites/{sites_id}", params=params or None, json_data=data)

    async def batch_update_networks_sites(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `Site` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/sites:batchUpdate", params=params or None, json_data=data)

    async def batch_deactivate_networks_sites(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Deactivates a list of `Site` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/sites:batchDeactivate", params=params or None, json_data=data)

    async def batch_submit_for_approval_networks_sites(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Submits a list of `Site` objects for approval."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/sites:batchSubmitForApproval", params=params or None, json_data=data)

    # =========================================================================
    # Taxonomycategories Methods (2 endpoints)
    # =========================================================================

    async def get_networks_taxonomy_categories(self, network_code: str, taxonomy_categories_id: str) -> Dict[str, Any]:
        """API to retrieve a `TaxonomyCategory` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/taxonomyCategories/{taxonomy_categories_id}", params=params or None)

    async def list_networks_taxonomy_categories(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `TaxonomyCategory` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/taxonomyCategories", params=params or None)

    # =========================================================================
    # Teams Methods (8 endpoints)
    # =========================================================================

    async def get_networks_teams(self, network_code: str, teams_id: str) -> Dict[str, Any]:
        """API to retrieve a `Team` object."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/teams/{teams_id}", params=params or None)

    async def list_networks_teams(self, network_code: str, page_size: int = DEFAULT_PAGE_SIZE, page_token: Optional[str] = None, filter_str: Optional[str] = None) -> Dict[str, Any]:
        """API to retrieve a list of `Team` objects."""
        params: Dict[str, Any] = {}
        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
        return await self.request("GET", f"networks/{network_code}/teams", params=params or None)

    async def create_networks_teams(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to create a `Team` object."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/teams", params=params or None, json_data=data)

    async def batch_create_networks_teams(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch create `Team` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/teams:batchCreate", params=params or None, json_data=data)

    async def patch_networks_teams(self, network_code: str, teams_id: str, data: Dict[str, Any], update_mask: Optional[str] = None) -> Dict[str, Any]:
        """API to update a `Team` object."""
        params: Dict[str, Any] = {}
        if update_mask:
            params["updateMask"] = update_mask
        return await self.request("PATCH", f"networks/{network_code}/teams/{teams_id}", params=params or None, json_data=data)

    async def batch_update_networks_teams(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch update `Team` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/teams:batchUpdate", params=params or None, json_data=data)

    async def batch_activate_networks_teams(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch activate `Team` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/teams:batchActivate", params=params or None, json_data=data)

    async def batch_deactivate_networks_teams(self, network_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch deactivate `Team` objects."""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/teams:batchDeactivate", params=params or None, json_data=data)

    # =========================================================================
    # Users Methods (1 endpoints)
    # =========================================================================

    async def get_networks_users(self, network_code: str, users_id: str) -> Dict[str, Any]:
        """API to retrieve a User object. To get the current user, the resource name `netwo"""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/users/{users_id}", params=params or None)

    # =========================================================================
    # Webproperties Methods (3 endpoints)
    # =========================================================================

    async def search_networks_web_properties_ad_review_center_ads(self, network_code: str, web_properties_id: str) -> Dict[str, Any]:
        """API to search for AdReviewCenterAds."""
        params: Dict[str, Any] = {}
        return await self.request("GET", f"networks/{network_code}/webProperties/{web_properties_id}/adReviewCenterAds:search", params=params or None)

    async def batch_allow_networks_web_properties_ad_review_center_ads(self, network_code: str, web_properties_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch allow AdReviewCenterAds. This method supports partial success. Some"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/webProperties/{web_properties_id}/adReviewCenterAds:batchAllow", params=params or None, json_data=data)

    async def batch_block_networks_web_properties_ad_review_center_ads(self, network_code: str, web_properties_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """API to batch block AdReviewCenterAds. This method supports partial success. Some"""
        params: Dict[str, Any] = {}
        return await self.request("POST", f"networks/{network_code}/webProperties/{web_properties_id}/adReviewCenterAds:batchBlock", params=params or None, json_data=data)


# Global client instance
_client: Optional[AdManagerClient] = None


def get_client() -> AdManagerClient:
    """Get or create the global Ad Manager client instance."""
    global _client
    if _client is None:
        _client = AdManagerClient()
    return _client
