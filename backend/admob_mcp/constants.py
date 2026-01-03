"""
Constants and configuration for AdMob MCP Server.

Complete v1beta API support including:
- Accounts, Apps, Ad Units
- Ad Sources, Adapters
- Mediation Groups (CRUD)
- A/B Experiments
- Reports (Mediation, Network, Campaign)
"""

from enum import Enum


# =============================================================================
# API Configuration
# =============================================================================

API_VERSION = "v1beta"
API_BASE_URL = f"https://admob.googleapis.com/{API_VERSION}"

# OAuth Scopes
OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/admob.readonly",
    "https://www.googleapis.com/auth/admob.report",
    "https://www.googleapis.com/auth/admob.monetization",
]

# Request settings
REQUEST_TIMEOUT = 30.0
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 20000

# Response limits
CHARACTER_LIMIT = 25000


# =============================================================================
# Enums for API Values
# =============================================================================

class Platform(str, Enum):
    """Mobile platform types."""
    PLATFORM_UNSPECIFIED = "PLATFORM_UNSPECIFIED"
    IOS = "IOS"
    ANDROID = "ANDROID"


class AdFormat(str, Enum):
    """Ad unit format types."""
    AD_FORMAT_UNSPECIFIED = "AD_FORMAT_UNSPECIFIED"
    APP_OPEN = "APP_OPEN"
    BANNER = "BANNER"
    BANNER_INTERSTITIAL = "BANNER_INTERSTITIAL"
    INTERSTITIAL = "INTERSTITIAL"
    NATIVE = "NATIVE"
    REWARDED = "REWARDED"
    REWARDED_INTERSTITIAL = "REWARDED_INTERSTITIAL"


class AdMediaType(str, Enum):
    """Ad media types."""
    RICH_MEDIA = "RICH_MEDIA"
    VIDEO = "VIDEO"


class MediationGroupState(str, Enum):
    """Mediation group state."""
    STATE_UNSPECIFIED = "STATE_UNSPECIFIED"
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class CpmMode(str, Enum):
    """CPM mode for mediation lines."""
    CPM_MODE_UNSPECIFIED = "CPM_MODE_UNSPECIFIED"
    LIVE = "LIVE"
    MANUAL = "MANUAL"


class MediationLineState(str, Enum):
    """Mediation line state."""
    STATE_UNSPECIFIED = "STATE_UNSPECIFIED"
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class ExperimentVariant(str, Enum):
    """A/B experiment variant choice."""
    VARIANT_UNSPECIFIED = "MEDIATION_GROUP_VARIANT_UNSPECIFIED"
    VARIANT_A = "MEDIATION_GROUP_VARIANT_ORIGINAL"
    VARIANT_B = "MEDIATION_GROUP_VARIANT_EXPERIMENT"


# =============================================================================
# Report Dimensions
# =============================================================================

MEDIATION_REPORT_DIMENSIONS = [
    "DATE",
    "MONTH",
    "WEEK",
    "AD_SOURCE",
    "AD_SOURCE_INSTANCE",
    "AD_UNIT",
    "APP",
    "MEDIATION_GROUP",
    "COUNTRY",
    "FORMAT",
    "PLATFORM",
    "MOBILE_OS_VERSION",
    "GMA_SDK_VERSION",
    "APP_VERSION_NAME",
    "SERVING_RESTRICTION",
]

NETWORK_REPORT_DIMENSIONS = [
    "DATE",
    "MONTH",
    "WEEK",
    "AD_UNIT",
    "APP",
    "AD_TYPE",
    "COUNTRY",
    "FORMAT",
    "PLATFORM",
    "MOBILE_OS_VERSION",
    "GMA_SDK_VERSION",
    "APP_VERSION_NAME",
    "SERVING_RESTRICTION",
]

CAMPAIGN_REPORT_DIMENSIONS = [
    "DATE",
    "CAMPAIGN_ID",
    "CAMPAIGN_NAME",
    "AD_ID",
    "AD_NAME",
    "PLACEMENT_ID",
    "PLACEMENT_NAME",
    "PLACEMENT_PLATFORM",
    "COUNTRY",
    "FORMAT",
]


# =============================================================================
# Report Metrics
# =============================================================================

MEDIATION_REPORT_METRICS = [
    "AD_REQUESTS",
    "CLICKS",
    "ESTIMATED_EARNINGS",
    "IMPRESSIONS",
    "IMPRESSION_CTR",
    "MATCHED_REQUESTS",
    "MATCH_RATE",
    "OBSERVED_ECPM",
]

NETWORK_REPORT_METRICS = [
    "AD_REQUESTS",
    "CLICKS",
    "ESTIMATED_EARNINGS",
    "IMPRESSIONS",
    "IMPRESSION_CTR",
    "IMPRESSION_RPM",
    "MATCHED_REQUESTS",
    "MATCH_RATE",
    "SHOW_RATE",
]

CAMPAIGN_REPORT_METRICS = [
    "IMPRESSIONS",
    "CLICKS",
    "CLICK_THROUGH_RATE",
    "INSTALLS",
    "ESTIMATED_COST",
    "AVERAGE_CPI",
    "INTERACTIONS",
]
