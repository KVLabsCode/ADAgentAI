"""
Google Ad Manager MCP Input Models

Auto-generated Pydantic models for all 154 API endpoints.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ResponseFormat(str, Enum):
    """Response format options."""
    MARKDOWN = "markdown"
    JSON = "json"


# =============================================================================
# Base Input Models
# =============================================================================

class BaseInput(BaseModel):
    """Base input with common fields."""
    response_format: ResponseFormat = Field(
        default=ResponseFormat.JSON,
        description="Output format: 'json' for structured data, 'markdown' for human-readable"
    )


class NetworkInput(BaseInput):
    """Base input requiring network_code."""
    network_code: str = Field(..., description="Ad Manager network code (e.g., '123456789')")


class PaginatedInput(NetworkInput):
    """Input for paginated list operations."""
    page_size: int = Field(default=50, description="Maximum results per page", ge=1, le=1000)
    page_token: Optional[str] = Field(default=None, description="Token for next page")
    filter: Optional[str] = Field(default=None, description="Filter expression")



# =============================================================================
# Adunitsizes Models
# =============================================================================

class ListNetworksAdUnitSizesInput(PaginatedInput):
    """API to retrieve a list of AdUnitSize objects."""
    pass


# =============================================================================
# Adunits Models
# =============================================================================

class GetNetworksAdUnitsInput(NetworkInput):
    """API to retrieve an AdUnit object."""
    ad_units_id: str = Field(..., description="adUnitsId identifier")

class ListNetworksAdUnitsInput(PaginatedInput):
    """API to retrieve a list of AdUnit objects."""
    pass

class CreateNetworksAdUnitsInput(NetworkInput):
    """API to create an `AdUnit` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksAdUnitsInput(NetworkInput):
    """API to update an `AdUnit` object."""
    ad_units_id: str = Field(..., description="adUnitsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchCreateNetworksAdUnitsInput(NetworkInput):
    """API to batch create `AdUnit` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchUpdateNetworksAdUnitsInput(NetworkInput):
    """API to batch update `AdUnit` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchActivateNetworksAdUnitsInput(NetworkInput):
    """API to batch activate `AdUnit` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksAdUnitsInput(NetworkInput):
    """Deactivates a list of `AdUnit` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchArchiveNetworksAdUnitsInput(NetworkInput):
    """Archives a list of `AdUnit` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Applications Models
# =============================================================================

class GetNetworksApplicationsInput(NetworkInput):
    """API to retrieve a `Application` object."""
    applications_id: str = Field(..., description="applicationsId identifier")

class ListNetworksApplicationsInput(PaginatedInput):
    """API to retrieve a list of `Application` objects."""
    pass


# =============================================================================
# Audiencesegments Models
# =============================================================================

class GetNetworksAudienceSegmentsInput(NetworkInput):
    """API to retrieve an `AudienceSegment` object."""
    audience_segments_id: str = Field(..., description="audienceSegmentsId identifier")

class ListNetworksAudienceSegmentsInput(PaginatedInput):
    """API to retrieve a list of `AudienceSegment` objects."""
    pass


# =============================================================================
# Bandwidthgroups Models
# =============================================================================

class GetNetworksBandwidthGroupsInput(NetworkInput):
    """API to retrieve a `BandwidthGroup` object."""
    bandwidth_groups_id: str = Field(..., description="bandwidthGroupsId identifier")

class ListNetworksBandwidthGroupsInput(PaginatedInput):
    """API to retrieve a list of `BandwidthGroup` objects."""
    pass


# =============================================================================
# Browserlanguages Models
# =============================================================================

class GetNetworksBrowserLanguagesInput(NetworkInput):
    """API to retrieve a `BrowserLanguage` object."""
    browser_languages_id: str = Field(..., description="browserLanguagesId identifier")

class ListNetworksBrowserLanguagesInput(PaginatedInput):
    """API to retrieve a list of `BrowserLanguage` objects."""
    pass


# =============================================================================
# Browsers Models
# =============================================================================

class GetNetworksBrowsersInput(NetworkInput):
    """API to retrieve a `Browser` object."""
    browsers_id: str = Field(..., description="browsersId identifier")

class ListNetworksBrowsersInput(PaginatedInput):
    """API to retrieve a list of `Browser` objects."""
    pass


# =============================================================================
# Cmsmetadatakeys Models
# =============================================================================

class GetNetworksCmsMetadataKeysInput(NetworkInput):
    """API to retrieve a `CmsMetadataKey` object."""
    cms_metadata_keys_id: str = Field(..., description="cmsMetadataKeysId identifier")

class ListNetworksCmsMetadataKeysInput(PaginatedInput):
    """API to retrieve a list of `CmsMetadataKey` objects."""
    pass


# =============================================================================
# Cmsmetadatavalues Models
# =============================================================================

class GetNetworksCmsMetadataValuesInput(NetworkInput):
    """API to retrieve a `CmsMetadataValue` object."""
    cms_metadata_values_id: str = Field(..., description="cmsMetadataValuesId identifier")

class ListNetworksCmsMetadataValuesInput(PaginatedInput):
    """API to retrieve a list of `CmsMetadataValue` objects."""
    pass


# =============================================================================
# Companies Models
# =============================================================================

class GetNetworksCompaniesInput(NetworkInput):
    """API to retrieve a `Company` object."""
    companies_id: str = Field(..., description="companiesId identifier")

class ListNetworksCompaniesInput(PaginatedInput):
    """API to retrieve a list of `Company` objects."""
    pass


# =============================================================================
# Contacts Models
# =============================================================================

class GetNetworksContactsInput(NetworkInput):
    """API to retrieve a `Contact` object."""
    contacts_id: str = Field(..., description="contactsId identifier")

class ListNetworksContactsInput(PaginatedInput):
    """API to retrieve a list of `Contact` objects."""
    pass

class CreateNetworksContactsInput(NetworkInput):
    """API to create a `Contact` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchCreateNetworksContactsInput(NetworkInput):
    """API to batch create `Contact` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksContactsInput(NetworkInput):
    """API to update a `Contact` object."""
    contacts_id: str = Field(..., description="contactsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchUpdateNetworksContactsInput(NetworkInput):
    """API to batch update `Contact` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Content Models
# =============================================================================

class GetNetworksContentInput(NetworkInput):
    """API to retrieve a `Content` object."""
    content_id: str = Field(..., description="contentId identifier")

class ListNetworksContentInput(PaginatedInput):
    """API to retrieve a list of `Content` objects."""
    pass


# =============================================================================
# Contentbundles Models
# =============================================================================

class GetNetworksContentBundlesInput(NetworkInput):
    """API to retrieve a `ContentBundle` object."""
    content_bundles_id: str = Field(..., description="contentBundlesId identifier")

class ListNetworksContentBundlesInput(PaginatedInput):
    """API to retrieve a list of `ContentBundle` objects."""
    pass


# =============================================================================
# Contentlabels Models
# =============================================================================

class GetNetworksContentLabelsInput(NetworkInput):
    """API to retrieve a `ContentLabel` object."""
    content_labels_id: str = Field(..., description="contentLabelsId identifier")

class ListNetworksContentLabelsInput(PaginatedInput):
    """API to retrieve a list of `ContentLabel` objects."""
    pass


# =============================================================================
# Creativetemplates Models
# =============================================================================

class GetNetworksCreativeTemplatesInput(NetworkInput):
    """API to retrieve a `CreativeTemplate` object."""
    creative_templates_id: str = Field(..., description="creativeTemplatesId identifier")

class ListNetworksCreativeTemplatesInput(PaginatedInput):
    """API to retrieve a list of `CreativeTemplate` objects."""
    pass


# =============================================================================
# Customfields Models
# =============================================================================

class GetNetworksCustomFieldsInput(NetworkInput):
    """API to retrieve a `CustomField` object."""
    custom_fields_id: str = Field(..., description="customFieldsId identifier")

class ListNetworksCustomFieldsInput(PaginatedInput):
    """API to retrieve a list of `CustomField` objects."""
    pass

class CreateNetworksCustomFieldsInput(NetworkInput):
    """API to create a `CustomField` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchCreateNetworksCustomFieldsInput(NetworkInput):
    """API to batch create `CustomField` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksCustomFieldsInput(NetworkInput):
    """API to update a `CustomField` object."""
    custom_fields_id: str = Field(..., description="customFieldsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchUpdateNetworksCustomFieldsInput(NetworkInput):
    """API to batch update `CustomField` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchActivateNetworksCustomFieldsInput(NetworkInput):
    """Activates a list of `CustomField` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksCustomFieldsInput(NetworkInput):
    """Deactivates a list of `CustomField` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Customtargetingkeys Models
# =============================================================================

class GetNetworksCustomTargetingKeysInput(NetworkInput):
    """API to retrieve a `CustomTargetingKey` object."""
    custom_targeting_keys_id: str = Field(..., description="customTargetingKeysId identifier")

class ListNetworksCustomTargetingKeysInput(PaginatedInput):
    """API to retrieve a list of `CustomTargetingKey` objects."""
    pass

class CreateNetworksCustomTargetingKeysInput(NetworkInput):
    """API to create a `CustomTargetingKey` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchCreateNetworksCustomTargetingKeysInput(NetworkInput):
    """API to batch create `CustomTargetingKey` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksCustomTargetingKeysInput(NetworkInput):
    """API to update a `CustomTargetingKey` object."""
    custom_targeting_keys_id: str = Field(..., description="customTargetingKeysId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchUpdateNetworksCustomTargetingKeysInput(NetworkInput):
    """API to batch update `CustomTargetingKey` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchActivateNetworksCustomTargetingKeysInput(NetworkInput):
    """API to batch activate `CustomTargetingKey` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksCustomTargetingKeysInput(NetworkInput):
    """Deactivates a list of `CustomTargetingKey` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class GetNetworksCustomTargetingKeysCustomTargetingValuesInput(NetworkInput):
    """API to retrieve a `CustomTargetingValue` object."""
    custom_targeting_keys_id: str = Field(..., description="customTargetingKeysId identifier")
    custom_targeting_values_id: str = Field(..., description="customTargetingValuesId identifier")

class ListNetworksCustomTargetingKeysCustomTargetingValuesInput(PaginatedInput):
    """API to retrieve a list of `CustomTargetingValue` objects."""
    custom_targeting_keys_id: str = Field(..., description="customTargetingKeysId identifier")


# =============================================================================
# Customtargetingvalues Models
# =============================================================================

class GetNetworksCustomTargetingValuesInput(NetworkInput):
    """API to retrieve a `CustomTargetingValue` object."""
    custom_targeting_values_id: str = Field(..., description="customTargetingValuesId identifier")

class ListNetworksCustomTargetingValuesInput(PaginatedInput):
    """API to retrieve a list of `CustomTargetingValue` objects."""
    pass


# =============================================================================
# Devicecapabilities Models
# =============================================================================

class GetNetworksDeviceCapabilitiesInput(NetworkInput):
    """API to retrieve a `DeviceCapability` object."""
    device_capabilities_id: str = Field(..., description="deviceCapabilitiesId identifier")

class ListNetworksDeviceCapabilitiesInput(PaginatedInput):
    """API to retrieve a list of `DeviceCapability` objects."""
    pass


# =============================================================================
# Devicecategories Models
# =============================================================================

class GetNetworksDeviceCategoriesInput(NetworkInput):
    """API to retrieve a `DeviceCategory` object."""
    device_categories_id: str = Field(..., description="deviceCategoriesId identifier")

class ListNetworksDeviceCategoriesInput(PaginatedInput):
    """API to retrieve a list of `DeviceCategory` objects."""
    pass


# =============================================================================
# Devicemanufacturers Models
# =============================================================================

class GetNetworksDeviceManufacturersInput(NetworkInput):
    """API to retrieve a `DeviceManufacturer` object."""
    device_manufacturers_id: str = Field(..., description="deviceManufacturersId identifier")

class ListNetworksDeviceManufacturersInput(PaginatedInput):
    """API to retrieve a list of `DeviceManufacturer` objects."""
    pass


# =============================================================================
# Entitysignalsmappings Models
# =============================================================================

class GetNetworksEntitySignalsMappingsInput(NetworkInput):
    """API to retrieve a `EntitySignalsMapping` object."""
    entity_signals_mappings_id: str = Field(..., description="entitySignalsMappingsId identifier")

class ListNetworksEntitySignalsMappingsInput(PaginatedInput):
    """API to retrieve a list of `EntitySignalsMapping` objects."""
    pass

class CreateNetworksEntitySignalsMappingsInput(NetworkInput):
    """API to create an `EntitySignalsMapping` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksEntitySignalsMappingsInput(NetworkInput):
    """API to update an `EntitySignalsMapping` object."""
    entity_signals_mappings_id: str = Field(..., description="entitySignalsMappingsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchCreateNetworksEntitySignalsMappingsInput(NetworkInput):
    """API to batch create `EntitySignalsMapping` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchUpdateNetworksEntitySignalsMappingsInput(NetworkInput):
    """API to batch update `EntitySignalsMapping` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Geotargets Models
# =============================================================================

class GetNetworksGeoTargetsInput(NetworkInput):
    """API to retrieve a `GeoTarget` object."""
    geo_targets_id: str = Field(..., description="geoTargetsId identifier")

class ListNetworksGeoTargetsInput(PaginatedInput):
    """API to retrieve a list of `GeoTarget` objects."""
    pass


# =============================================================================
# Get Models
# =============================================================================

class GetNetworksInput(NetworkInput):
    """API to retrieve a Network object."""
    pass


# =============================================================================
# Lineitems Models
# =============================================================================

class GetNetworksLineItemsInput(NetworkInput):
    """API to retrieve a `LineItem` object."""
    line_items_id: str = Field(..., description="lineItemsId identifier")

class ListNetworksLineItemsInput(PaginatedInput):
    """API to retrieve a list of `LineItem` objects."""
    pass


# =============================================================================
# List Models
# =============================================================================

class ListNetworksInput(PaginatedInput):
    """API to retrieve all the networks the current user has access to."""
    pass


# =============================================================================
# Livestreamevents Models
# =============================================================================

class GetNetworksLiveStreamEventsAdBreaksInput(NetworkInput):
    """API to retrieve an `AdBreak` object. Query an ad break by its resource name or custom asset key. Che"""
    live_stream_events_id: str = Field(..., description="liveStreamEventsId identifier")
    ad_breaks_id: str = Field(..., description="adBreaksId identifier")

class ListNetworksLiveStreamEventsAdBreaksInput(PaginatedInput):
    """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query parameter is specif"""
    live_stream_events_id: str = Field(..., description="liveStreamEventsId identifier")

class CreateNetworksLiveStreamEventsAdBreaksInput(NetworkInput):
    """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a live stream event, with"""
    live_stream_events_id: str = Field(..., description="liveStreamEventsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Livestreameventsbyassetkey Models
# =============================================================================

class GetNetworksLiveStreamEventsByAssetKeyAdBreaksInput(NetworkInput):
    """API to retrieve an `AdBreak` object. Query an ad break by its resource name or custom asset key. Che"""
    live_stream_events_by_asset_key_id: str = Field(..., description="liveStreamEventsByAssetKeyId identifier")
    ad_breaks_id: str = Field(..., description="adBreaksId identifier")

class ListNetworksLiveStreamEventsByAssetKeyAdBreaksInput(PaginatedInput):
    """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query parameter is specif"""
    live_stream_events_by_asset_key_id: str = Field(..., description="liveStreamEventsByAssetKeyId identifier")

class CreateNetworksLiveStreamEventsByAssetKeyAdBreaksInput(NetworkInput):
    """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a live stream event, with"""
    live_stream_events_by_asset_key_id: str = Field(..., description="liveStreamEventsByAssetKeyId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksLiveStreamEventsByAssetKeyAdBreaksInput(NetworkInput):
    """API to update an `AdBreak` object. Modify an ad break when its state is `SCHEDULED`."""
    live_stream_events_by_asset_key_id: str = Field(..., description="liveStreamEventsByAssetKeyId identifier")
    ad_breaks_id: str = Field(..., description="adBreaksId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class DeleteNetworksLiveStreamEventsByAssetKeyAdBreaksInput(NetworkInput):
    """API to delete an `AdBreak` object. Deletes and cancels an incomplete ad break, mitigating the need t"""
    live_stream_events_by_asset_key_id: str = Field(..., description="liveStreamEventsByAssetKeyId identifier")
    ad_breaks_id: str = Field(..., description="adBreaksId identifier")


# =============================================================================
# Livestreameventsbycustomassetkey Models
# =============================================================================

class GetNetworksLiveStreamEventsByCustomAssetKeyAdBreaksInput(NetworkInput):
    """API to retrieve an `AdBreak` object. Query an ad break by its resource name or custom asset key. Che"""
    live_stream_events_by_custom_asset_key_id: str = Field(..., description="liveStreamEventsByCustomAssetKeyId identifier")
    ad_breaks_id: str = Field(..., description="adBreaksId identifier")

class ListNetworksLiveStreamEventsByCustomAssetKeyAdBreaksInput(PaginatedInput):
    """API to retrieve a list of `AdBreak` objects. By default, when no `orderBy` query parameter is specif"""
    live_stream_events_by_custom_asset_key_id: str = Field(..., description="liveStreamEventsByCustomAssetKeyId identifier")

class CreateNetworksLiveStreamEventsByCustomAssetKeyAdBreaksInput(NetworkInput):
    """API to create an `AdBreak` object. Informs DAI of an upcoming ad break for a live stream event, with"""
    live_stream_events_by_custom_asset_key_id: str = Field(..., description="liveStreamEventsByCustomAssetKeyId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Mobilecarriers Models
# =============================================================================

class GetNetworksMobileCarriersInput(NetworkInput):
    """API to retrieve a `MobileCarrier` object."""
    mobile_carriers_id: str = Field(..., description="mobileCarriersId identifier")

class ListNetworksMobileCarriersInput(PaginatedInput):
    """API to retrieve a list of `MobileCarrier` objects."""
    pass


# =============================================================================
# Mobiledevicesubmodels Models
# =============================================================================

class GetNetworksMobileDeviceSubmodelsInput(NetworkInput):
    """API to retrieve a `MobileDeviceSubmodel` object."""
    mobile_device_submodels_id: str = Field(..., description="mobileDeviceSubmodelsId identifier")

class ListNetworksMobileDeviceSubmodelsInput(PaginatedInput):
    """API to retrieve a list of `MobileDeviceSubmodel` objects."""
    pass


# =============================================================================
# Mobiledevices Models
# =============================================================================

class GetNetworksMobileDevicesInput(NetworkInput):
    """API to retrieve a `MobileDevice` object."""
    mobile_devices_id: str = Field(..., description="mobileDevicesId identifier")

class ListNetworksMobileDevicesInput(PaginatedInput):
    """API to retrieve a list of `MobileDevice` objects."""
    pass


# =============================================================================
# Operatingsystemversions Models
# =============================================================================

class GetNetworksOperatingSystemVersionsInput(NetworkInput):
    """API to retrieve a `OperatingSystemVersion` object."""
    operating_system_versions_id: str = Field(..., description="operatingSystemVersionsId identifier")

class ListNetworksOperatingSystemVersionsInput(PaginatedInput):
    """API to retrieve a list of `OperatingSystemVersion` objects."""
    pass


# =============================================================================
# Operatingsystems Models
# =============================================================================

class GetNetworksOperatingSystemsInput(NetworkInput):
    """API to retrieve a `OperatingSystem` object."""
    operating_systems_id: str = Field(..., description="operatingSystemsId identifier")

class ListNetworksOperatingSystemsInput(PaginatedInput):
    """API to retrieve a list of `OperatingSystem` objects."""
    pass


# =============================================================================
# Operations Models
# =============================================================================

class GetNetworksOperationsReportsRunsInput(NetworkInput):
    """Gets the latest state of a long-running operation. Clients can use this method to poll the operation"""
    runs_id: str = Field(..., description="runsId identifier")

class ListOperationsInput(PaginatedInput):
    """Lists operations that match the specified filter in the request. If the server doesn't support this """
    pass

class DeleteOperationsInput(NetworkInput):
    """Deletes a long-running operation. This method indicates that the client is no longer interested in t"""
    operations_id: str = Field(..., description="operationsId identifier")

class CancelOperationsInput(NetworkInput):
    """Starts asynchronous cancellation on a long-running operation. The server makes a best effort to canc"""
    operations_id: str = Field(..., description="operationsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Orders Models
# =============================================================================

class GetNetworksOrdersInput(NetworkInput):
    """API to retrieve an Order object."""
    orders_id: str = Field(..., description="ordersId identifier")

class ListNetworksOrdersInput(PaginatedInput):
    """API to retrieve a list of `Order` objects. Fields used for literal matching in filter string: * `ord"""
    pass


# =============================================================================
# Placements Models
# =============================================================================

class GetNetworksPlacementsInput(NetworkInput):
    """API to retrieve a `Placement` object."""
    placements_id: str = Field(..., description="placementsId identifier")

class ListNetworksPlacementsInput(PaginatedInput):
    """API to retrieve a list of `Placement` objects."""
    pass

class CreateNetworksPlacementsInput(NetworkInput):
    """API to create an `Placement` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksPlacementsInput(NetworkInput):
    """API to update an `Placement` object."""
    placements_id: str = Field(..., description="placementsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchCreateNetworksPlacementsInput(NetworkInput):
    """API to batch create `Placement` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchUpdateNetworksPlacementsInput(NetworkInput):
    """API to batch update `Placement` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchActivateNetworksPlacementsInput(NetworkInput):
    """Activates a list of `Placement` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksPlacementsInput(NetworkInput):
    """Deactivates a list of `Placement` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchArchiveNetworksPlacementsInput(NetworkInput):
    """Archives a list of `Placement` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Privateauctiondeals Models
# =============================================================================

class GetNetworksPrivateAuctionDealsInput(NetworkInput):
    """API to retrieve a `PrivateAuctionDeal` object."""
    private_auction_deals_id: str = Field(..., description="privateAuctionDealsId identifier")

class ListNetworksPrivateAuctionDealsInput(PaginatedInput):
    """API to retrieve a list of `PrivateAuctionDeal` objects."""
    pass

class CreateNetworksPrivateAuctionDealsInput(NetworkInput):
    """API to create a `PrivateAuctionDeal` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksPrivateAuctionDealsInput(NetworkInput):
    """API to update a `PrivateAuctionDeal` object."""
    private_auction_deals_id: str = Field(..., description="privateAuctionDealsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")


# =============================================================================
# Privateauctions Models
# =============================================================================

class GetNetworksPrivateAuctionsInput(NetworkInput):
    """API to retrieve a `PrivateAuction` object."""
    private_auctions_id: str = Field(..., description="privateAuctionsId identifier")

class ListNetworksPrivateAuctionsInput(PaginatedInput):
    """API to retrieve a list of `PrivateAuction` objects."""
    pass

class CreateNetworksPrivateAuctionsInput(NetworkInput):
    """API to create a `PrivateAuction` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksPrivateAuctionsInput(NetworkInput):
    """API to update a `PrivateAuction` object."""
    private_auctions_id: str = Field(..., description="privateAuctionsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")


# =============================================================================
# Programmaticbuyers Models
# =============================================================================

class GetNetworksProgrammaticBuyersInput(NetworkInput):
    """API to retrieve a `ProgrammaticBuyer` object."""
    programmatic_buyers_id: str = Field(..., description="programmaticBuyersId identifier")

class ListNetworksProgrammaticBuyersInput(PaginatedInput):
    """API to retrieve a list of `ProgrammaticBuyer` objects."""
    pass


# =============================================================================
# Reports Models
# =============================================================================

class GetNetworksReportsInput(NetworkInput):
    """API to retrieve a `Report` object."""
    reports_id: str = Field(..., description="reportsId identifier")

class ListNetworksReportsInput(PaginatedInput):
    """API to retrieve a list of `Report` objects."""
    pass

class CreateNetworksReportsInput(NetworkInput):
    """API to create a `Report` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksReportsInput(NetworkInput):
    """API to update a `Report` object."""
    reports_id: str = Field(..., description="reportsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class RunNetworksReportsInput(NetworkInput):
    """Initiates the execution of an existing report asynchronously. Users can get the report by polling th"""
    reports_id: str = Field(..., description="reportsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")

class FetchRowsNetworksReportsResultsInput(NetworkInput):
    """Returns the result rows from a completed report. The caller must have previously called `RunReport` """
    reports_id: str = Field(..., description="reportsId identifier")
    results_id: str = Field(..., description="resultsId identifier")


# =============================================================================
# Roles Models
# =============================================================================

class GetNetworksRolesInput(NetworkInput):
    """API to retrieve a `Role` object."""
    roles_id: str = Field(..., description="rolesId identifier")

class ListNetworksRolesInput(PaginatedInput):
    """API to retrieve a list of `Role` objects."""
    pass


# =============================================================================
# Sites Models
# =============================================================================

class GetNetworksSitesInput(NetworkInput):
    """API to retrieve a `Site` object."""
    sites_id: str = Field(..., description="sitesId identifier")

class ListNetworksSitesInput(PaginatedInput):
    """API to retrieve a list of `Site` objects."""
    pass

class CreateNetworksSitesInput(NetworkInput):
    """API to create a `Site` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchCreateNetworksSitesInput(NetworkInput):
    """API to batch create `Site` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksSitesInput(NetworkInput):
    """API to update a `Site` object."""
    sites_id: str = Field(..., description="sitesId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchUpdateNetworksSitesInput(NetworkInput):
    """API to batch update `Site` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksSitesInput(NetworkInput):
    """Deactivates a list of `Site` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchSubmitForApprovalNetworksSitesInput(NetworkInput):
    """Submits a list of `Site` objects for approval."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Taxonomycategories Models
# =============================================================================

class GetNetworksTaxonomyCategoriesInput(NetworkInput):
    """API to retrieve a `TaxonomyCategory` object."""
    taxonomy_categories_id: str = Field(..., description="taxonomyCategoriesId identifier")

class ListNetworksTaxonomyCategoriesInput(PaginatedInput):
    """API to retrieve a list of `TaxonomyCategory` objects."""
    pass


# =============================================================================
# Teams Models
# =============================================================================

class GetNetworksTeamsInput(NetworkInput):
    """API to retrieve a `Team` object."""
    teams_id: str = Field(..., description="teamsId identifier")

class ListNetworksTeamsInput(PaginatedInput):
    """API to retrieve a list of `Team` objects."""
    pass

class CreateNetworksTeamsInput(NetworkInput):
    """API to create a `Team` object."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchCreateNetworksTeamsInput(NetworkInput):
    """API to batch create `Team` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class PatchNetworksTeamsInput(NetworkInput):
    """API to update a `Team` object."""
    teams_id: str = Field(..., description="teamsId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")
    update_mask: Optional[str] = Field(default=None, description="Fields to update")

class BatchUpdateNetworksTeamsInput(NetworkInput):
    """API to batch update `Team` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchActivateNetworksTeamsInput(NetworkInput):
    """API to batch activate `Team` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchDeactivateNetworksTeamsInput(NetworkInput):
    """API to batch deactivate `Team` objects."""
    data: Dict[str, Any] = Field(..., description="Request body data")


# =============================================================================
# Users Models
# =============================================================================

class GetNetworksUsersInput(NetworkInput):
    """API to retrieve a User object. To get the current user, the resource name `networks/{networkCode}/us"""
    users_id: str = Field(..., description="usersId identifier")


# =============================================================================
# Webproperties Models
# =============================================================================

class SearchNetworksWebPropertiesAdReviewCenterAdsInput(NetworkInput):
    """API to search for AdReviewCenterAds."""
    web_properties_id: str = Field(..., description="webPropertiesId identifier")

class BatchAllowNetworksWebPropertiesAdReviewCenterAdsInput(NetworkInput):
    """API to batch allow AdReviewCenterAds. This method supports partial success. Some operations may succ"""
    web_properties_id: str = Field(..., description="webPropertiesId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")

class BatchBlockNetworksWebPropertiesAdReviewCenterAdsInput(NetworkInput):
    """API to batch block AdReviewCenterAds. This method supports partial success. Some operations may succ"""
    web_properties_id: str = Field(..., description="webPropertiesId identifier")
    data: Dict[str, Any] = Field(..., description="Request body data")

