"""
Pydantic models for AdMob MCP Server input validation.

All input models for the complete v1beta API.
"""

from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict, field_validator


# =============================================================================
# Common Enums
# =============================================================================

class ResponseFormat(str, Enum):
    """Output format options."""
    MARKDOWN = "markdown"
    JSON = "json"


class Platform(str, Enum):
    """Mobile platform types."""
    IOS = "IOS"
    ANDROID = "ANDROID"


class AdFormat(str, Enum):
    """Ad unit format types."""
    APP_OPEN = "APP_OPEN"
    BANNER = "BANNER"
    INTERSTITIAL = "INTERSTITIAL"
    NATIVE = "NATIVE"
    REWARDED = "REWARDED"
    REWARDED_INTERSTITIAL = "REWARDED_INTERSTITIAL"


class MediationGroupState(str, Enum):
    """Mediation group state."""
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class ExperimentVariant(str, Enum):
    """A/B experiment variant choice for stopping experiments."""
    ORIGINAL = "MEDIATION_GROUP_VARIANT_ORIGINAL"
    EXPERIMENT = "MEDIATION_GROUP_VARIANT_EXPERIMENT"


class MediationGroupLineExperimentVariant(str, Enum):
    """Experiment variant assignment for individual mediation group lines."""
    VARIANT_A = "VARIANT_A"
    VARIANT_B = "VARIANT_B"
    ORIGINAL = "ORIGINAL"


class CpmMode(str, Enum):
    """CPM mode for mediation group lines."""
    MANUAL = "MANUAL"
    LIVE = "LIVE"
    ANO = "ANO"  # Ad Network Optimized - network retrieves CPM dynamically


class MediationGroupLineState(str, Enum):
    """State for individual mediation group lines."""
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"
    REMOVED = "REMOVED"


class IdfaTargeting(str, Enum):
    """IDFA targeting options for iOS."""
    ALL = "ALL"
    OPTED_IN_USERS = "OPTED_IN_USERS"
    NOT_OPTED_IN_USERS = "NOT_OPTED_IN_USERS"


class AdUnitMappingState(str, Enum):
    """State for ad unit mappings."""
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class AndroidAppStore(str, Enum):
    """Android app store options."""
    GOOGLE_PLAY = "GOOGLE_PLAY"
    AMAZON_APPSTORE = "AMAZON_APPSTORE"
    OPPO = "OPPO"
    SAMSUNG = "SAMSUNG"
    VIVO = "VIVO"
    XIAOMI = "XIAOMI"


class SortOrder(str, Enum):
    """Sort order for reports."""
    ASCENDING = "ASCENDING"
    DESCENDING = "DESCENDING"


# =============================================================================
# Common Validators
# =============================================================================

def normalize_account_id(v: str) -> str:
    """Normalize account ID to include 'pub-' prefix."""
    v = v.strip()
    if not v.startswith("pub-"):
        v = f"pub-{v}"
    return v


# =============================================================================
# Date Model
# =============================================================================

class DateInput(BaseModel):
    """Date input for reports."""
    model_config = ConfigDict(extra='forbid')

    year: int = Field(..., description="Year (e.g., 2024)", ge=2000, le=2100)
    month: int = Field(..., description="Month (1-12)", ge=1, le=12)
    day: int = Field(..., description="Day (1-31)", ge=1, le=31)


# =============================================================================
# Mediation Group Line Models (for waterfall configuration)
# =============================================================================

class MediationGroupLine(BaseModel):
    """A single mediation group line in the waterfall."""
    model_config = ConfigDict(extra='forbid')

    line_id: Optional[str] = Field(default=None, description="Line identifier (auto-generated if not provided)")
    display_name: str = Field(..., description="Display name for this line")
    ad_source_id: str = Field(..., description="Ad network source ID")
    cpm_mode: CpmMode = Field(default=CpmMode.LIVE, description="CPM mode: LIVE (bidding), MANUAL (fixed), or ANO (network-optimized)")
    cpm_micros: Optional[int] = Field(default=None, description="CPM value in micros (e.g., 1500000 = $1.50). Required for MANUAL mode.")
    ad_unit_mappings: Optional[Dict[str, str]] = Field(default=None, description="Map of ad unit ID to mapping ID")
    state: MediationGroupLineState = Field(default=MediationGroupLineState.ENABLED, description="Line state")
    experiment_variant: Optional[MediationGroupLineExperimentVariant] = Field(default=None, description="A/B experiment variant: VARIANT_A, VARIANT_B, or ORIGINAL")


# =============================================================================
# Reward Settings Model (for rewarded ad units)
# =============================================================================

class RewardSettings(BaseModel):
    """Reward configuration for rewarded ad units."""
    model_config = ConfigDict(extra='forbid')

    unit_amount: int = Field(..., description="Reward amount (e.g., 100)", ge=1)
    unit_type: str = Field(..., description="Reward type label (e.g., 'coins', 'gems')", min_length=1)


# =============================================================================
# Report Filter and Sort Models
# =============================================================================

class DimensionFilter(BaseModel):
    """Filter for report dimensions."""
    model_config = ConfigDict(extra='forbid')

    dimension: str = Field(..., description="Dimension to filter (e.g., 'COUNTRY', 'APP')")
    values: List[str] = Field(..., description="Values to match", min_length=1)


class SortCondition(BaseModel):
    """Sort condition for reports."""
    model_config = ConfigDict(extra='forbid')

    dimension: Optional[str] = Field(default=None, description="Dimension to sort by")
    metric: Optional[str] = Field(default=None, description="Metric to sort by")
    order: SortOrder = Field(default=SortOrder.DESCENDING, description="Sort order")


class LocalizationSettings(BaseModel):
    """Localization settings for reports."""
    model_config = ConfigDict(extra='forbid')

    currency_code: Optional[str] = Field(default=None, description="Currency code (e.g., 'USD', 'EUR')")
    language_code: Optional[str] = Field(default=None, description="Language code (e.g., 'en-US')")


# =============================================================================
# Account Models
# =============================================================================

class ListAccountsInput(BaseModel):
    """Input for listing AdMob accounts."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    page_size: Optional[int] = Field(default=20, description="Max accounts to return (1-100)", ge=1, le=100)
    page_token: Optional[str] = Field(default=None, description="Pagination token")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)


class GetAccountInput(BaseModel):
    """Input for getting a specific account."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID (e.g., 'pub-1234567890123456')", min_length=1)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# App Models
# =============================================================================

class ListAppsInput(BaseModel):
    """Input for listing apps."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class CreateAppInput(BaseModel):
    """Input for creating an app. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    platform: Platform = Field(..., description="Platform: IOS or ANDROID")
    display_name: str = Field(..., description="Display name of the app", min_length=1, max_length=80)
    app_store_id: Optional[str] = Field(default=None, description="App store ID (bundle ID for iOS, package name for Android)")
    android_app_stores: Optional[List[AndroidAppStore]] = Field(
        default=None,
        description="Android app stores to link (only for ANDROID platform): GOOGLE_PLAY, AMAZON_APPSTORE, OPPO, SAMSUNG, VIVO, XIAOMI"
    )
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# Ad Unit Models
# =============================================================================

class ListAdUnitsInput(BaseModel):
    """Input for listing ad units."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class CreateAdUnitInput(BaseModel):
    """Input for creating an ad unit. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    app_id: str = Field(..., description="App ID this ad unit belongs to")
    display_name: str = Field(..., description="Display name", min_length=1, max_length=80)
    ad_format: AdFormat = Field(..., description="Ad format type")
    ad_types: Optional[List[str]] = Field(default=None, description="Ad types: RICH_MEDIA, VIDEO")
    reward_settings: Optional[RewardSettings] = Field(
        default=None,
        description="Reward configuration for REWARDED and REWARDED_INTERSTITIAL ad formats. Required for rewarded ads."
    )
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# Ad Unit Mappings Models
# =============================================================================

class ListAdUnitMappingsInput(BaseModel):
    """Input for listing ad unit mappings."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    ad_unit_id: str = Field(..., description="Ad unit ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    filter: Optional[str] = Field(default=None, description="Filter by DISPLAY_NAME")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class CreateAdUnitMappingInput(BaseModel):
    """Input for creating an ad unit mapping. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    ad_unit_id: str = Field(..., description="Ad unit ID", min_length=1)
    ad_source_id: str = Field(..., description="Ad source ID")
    display_name: str = Field(..., description="Display name")
    ad_unit_configurations: Optional[dict] = Field(default=None, description="Ad source specific configurations")
    state: AdUnitMappingState = Field(default=AdUnitMappingState.ENABLED, description="Mapping state: ENABLED or DISABLED")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class AdUnitMappingRequest(BaseModel):
    """Single ad unit mapping request for batch create."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    ad_unit_id: str = Field(..., description="Ad unit ID")
    ad_source_id: str = Field(..., description="Ad source ID")
    display_name: str = Field(..., description="Display name")
    ad_unit_configurations: Optional[dict] = Field(default=None, description="Ad source specific configurations")
    state: AdUnitMappingState = Field(default=AdUnitMappingState.ENABLED, description="Mapping state: ENABLED or DISABLED")


class BatchCreateAdUnitMappingsInput(BaseModel):
    """Input for batch creating ad unit mappings. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    mappings: List[AdUnitMappingRequest] = Field(..., description="List of mappings to create (max 100)", max_length=100)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# Ad Sources Models
# =============================================================================

class ListAdSourcesInput(BaseModel):
    """Input for listing ad sources (ad networks)."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class ListAdaptersInput(BaseModel):
    """Input for listing adapters for an ad source."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    ad_source_id: str = Field(..., description="Ad source ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# Mediation Groups Models
# =============================================================================

class ListMediationGroupsInput(BaseModel):
    """Input for listing mediation groups. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    page_size: Optional[int] = Field(default=100, ge=1, le=20000)
    page_token: Optional[str] = Field(default=None)
    filter: Optional[str] = Field(default=None, description="Filter expression (EBNF syntax)")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class MediationGroupTargeting(BaseModel):
    """Targeting configuration for mediation group."""
    model_config = ConfigDict(extra='forbid')

    platform: Platform = Field(..., description="Target platform")
    format: AdFormat = Field(..., description="Target ad format")
    ad_unit_ids: List[str] = Field(..., description="List of ad unit IDs to target")
    targeted_region_codes: Optional[List[str]] = Field(default=None, description="ISO 3166-1 alpha-2 country codes to include")
    excluded_region_codes: Optional[List[str]] = Field(default=None, description="ISO 3166-1 alpha-2 country codes to exclude")
    idfa_targeting: Optional[IdfaTargeting] = Field(default=None, description="IDFA targeting for iOS: ALL, OPTED_IN_USERS, NOT_OPTED_IN_USERS")


class CreateMediationGroupInput(BaseModel):
    """Input for creating a mediation group. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    display_name: str = Field(..., description="Display name", min_length=1, max_length=120)
    targeting: MediationGroupTargeting = Field(..., description="Targeting configuration")
    state: MediationGroupState = Field(default=MediationGroupState.ENABLED)
    mediation_group_lines: Optional[List[MediationGroupLine]] = Field(
        default=None,
        description="Waterfall/bidding configuration. List of ad network lines with display_name, ad_source_id, cpm_mode, etc."
    )
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class UpdateMediationGroupTargeting(BaseModel):
    """Targeting updates for mediation group. All fields optional for partial updates."""
    model_config = ConfigDict(extra='forbid')

    ad_unit_ids: Optional[List[str]] = Field(default=None, description="Updated list of ad unit IDs to target")
    targeted_region_codes: Optional[List[str]] = Field(default=None, description="Updated ISO 3166-1 alpha-2 country codes to include")
    excluded_region_codes: Optional[List[str]] = Field(default=None, description="Updated ISO 3166-1 alpha-2 country codes to exclude")
    idfa_targeting: Optional[IdfaTargeting] = Field(default=None, description="Updated IDFA targeting for iOS")


class UpdateMediationGroupInput(BaseModel):
    """Input for updating a mediation group. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    mediation_group_id: str = Field(..., description="Mediation group ID", min_length=1)
    display_name: Optional[str] = Field(default=None, description="New display name")
    state: Optional[MediationGroupState] = Field(default=None, description="New state")
    targeting_ad_unit_ids: Optional[List[str]] = Field(default=None, description="Updated ad unit IDs (shorthand for targeting.ad_unit_ids)")
    targeting: Optional[UpdateMediationGroupTargeting] = Field(default=None, description="Full targeting update (overrides targeting_ad_unit_ids if both provided)")
    mediation_group_lines: Optional[List[MediationGroupLine]] = Field(
        default=None,
        description="Updated waterfall/bidding configuration. List of ad network lines."
    )
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# A/B Experiment Models
# =============================================================================

class CreateMediationAbExperimentInput(BaseModel):
    """Input for creating a mediation A/B experiment. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    mediation_group_id: str = Field(..., description="Mediation group ID", min_length=1)
    display_name: str = Field(..., description="Experiment display name", min_length=1)
    traffic_percentage: int = Field(default=50, description="Traffic percentage for experiment variant (1-99)", ge=1, le=99)
    treatment_mediation_lines: Optional[List[MediationGroupLine]] = Field(
        default=None,
        description="Mediation lines for the experiment variant. If not provided, uses copy of control."
    )
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class StopMediationAbExperimentInput(BaseModel):
    """Input for stopping a mediation A/B experiment. Requires special access."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    mediation_group_id: str = Field(..., description="Mediation group ID", min_length=1)
    variant_choice: ExperimentVariant = Field(..., description="Which variant to keep: ORIGINAL or EXPERIMENT")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


# =============================================================================
# Report Models
# =============================================================================

class GenerateMediationReportInput(BaseModel):
    """Input for generating a mediation report."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    start_date: DateInput = Field(..., description="Report start date")
    end_date: DateInput = Field(..., description="Report end date")
    dimensions: List[str] = Field(default=["DATE"], description="Report dimensions")
    metrics: List[str] = Field(default=["IMPRESSIONS", "ESTIMATED_EARNINGS"], description="Report metrics")
    dimension_filters: Optional[List[DimensionFilter]] = Field(
        default=None,
        description="Filter report by dimension values (e.g., filter by specific countries or apps)"
    )
    sort_conditions: Optional[List[SortCondition]] = Field(
        default=None,
        description="Sort report results by dimension or metric"
    )
    localization_settings: Optional[LocalizationSettings] = Field(
        default=None,
        description="Localization settings for currency and language"
    )
    time_zone: Optional[str] = Field(default=None, description="Timezone for the report (e.g., 'America/New_York')")
    max_report_rows: Optional[int] = Field(default=1000, ge=1, le=100000)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class GenerateNetworkReportInput(BaseModel):
    """Input for generating a network report."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    start_date: DateInput = Field(..., description="Report start date")
    end_date: DateInput = Field(..., description="Report end date")
    dimensions: List[str] = Field(default=["DATE"], description="Report dimensions")
    metrics: List[str] = Field(default=["IMPRESSIONS", "ESTIMATED_EARNINGS"], description="Report metrics")
    dimension_filters: Optional[List[DimensionFilter]] = Field(
        default=None,
        description="Filter report by dimension values (e.g., filter by specific countries or apps)"
    )
    sort_conditions: Optional[List[SortCondition]] = Field(
        default=None,
        description="Sort report results by dimension or metric"
    )
    localization_settings: Optional[LocalizationSettings] = Field(
        default=None,
        description="Localization settings for currency and language"
    )
    time_zone: Optional[str] = Field(default=None, description="Timezone for the report (e.g., 'America/New_York')")
    max_report_rows: Optional[int] = Field(default=1000, ge=1, le=100000)
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)


class GenerateCampaignReportInput(BaseModel):
    """Input for generating a campaign report."""
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

    account_id: str = Field(..., description="Publisher account ID", min_length=1)
    start_date: DateInput = Field(..., description="Report start date")
    end_date: DateInput = Field(..., description="Report end date")
    dimensions: List[str] = Field(default=["DATE", "CAMPAIGN_ID"], description="Report dimensions")
    metrics: List[str] = Field(default=["IMPRESSIONS", "CLICKS"], description="Report metrics")
    dimension_filters: Optional[List[DimensionFilter]] = Field(
        default=None,
        description="Filter report by dimension values"
    )
    sort_conditions: Optional[List[SortCondition]] = Field(
        default=None,
        description="Sort report results by dimension or metric"
    )
    localization_settings: Optional[LocalizationSettings] = Field(
        default=None,
        description="Localization settings for currency and language"
    )
    time_zone: Optional[str] = Field(default=None, description="Timezone for the report (e.g., 'America/New_York')")
    language_code: Optional[str] = Field(default="en-US", description="Language code for localized text")
    response_format: ResponseFormat = Field(default=ResponseFormat.JSON)

    @field_validator('account_id')
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        return normalize_account_id(v)
