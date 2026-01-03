"""
Constants and configuration for Google Ad Manager MCP Server.

Google Ad Manager API v1 (Beta) support including:
- Networks
- Ad Units (CRUD + batch operations)
- Placements (CRUD + batch operations)
- Orders & Line Items (read)
- Reports (create, run, fetch)
- Companies & Contacts
- Users, Roles, Teams
- Custom Targeting
- Geo & Device Targeting
"""

from enum import Enum


# =============================================================================
# API Configuration
# =============================================================================

API_VERSION = "v1"
API_BASE_URL = f"https://admanager.googleapis.com/{API_VERSION}"

# OAuth Scopes for Ad Manager
OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/admanager",
    "https://www.googleapis.com/auth/admanager.readonly",
]

# Request settings
REQUEST_TIMEOUT = 60.0  # Ad Manager reports can take longer
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 1000

# Response limits
CHARACTER_LIMIT = 25000


# =============================================================================
# Enums for API Values
# =============================================================================

class AdUnitStatus(str, Enum):
    """Ad unit status types."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class CompanyType(str, Enum):
    """Company types in Ad Manager."""
    ADVERTISER = "ADVERTISER"
    HOUSE_ADVERTISER = "HOUSE_ADVERTISER"
    AGENCY = "AGENCY"
    HOUSE_AGENCY = "HOUSE_AGENCY"
    AD_NETWORK = "AD_NETWORK"
    PARTNER = "PARTNER"
    CHILD_PUBLISHER = "CHILD_PUBLISHER"
    VIEWABILITY_PROVIDER = "VIEWABILITY_PROVIDER"


class CompanyCreditStatus(str, Enum):
    """Company credit status."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_HOLD = "ON_HOLD"
    STOP = "STOP"
    BLOCKED = "BLOCKED"


class OrderStatus(str, Enum):
    """Order status types."""
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    DISAPPROVED = "DISAPPROVED"
    PAUSED = "PAUSED"
    CANCELED = "CANCELED"
    DELETED = "DELETED"


class LineItemType(str, Enum):
    """Line item types."""
    SPONSORSHIP = "SPONSORSHIP"
    STANDARD = "STANDARD"
    NETWORK = "NETWORK"
    BULK = "BULK"
    PRICE_PRIORITY = "PRICE_PRIORITY"
    HOUSE = "HOUSE"
    LEGACY_DFP = "LEGACY_DFP"
    CLICK_TRACKING = "CLICK_TRACKING"
    ADSENSE = "ADSENSE"
    AD_EXCHANGE = "AD_EXCHANGE"
    BUMPER = "BUMPER"
    ADMOB = "ADMOB"
    PREFERRED_DEAL = "PREFERRED_DEAL"


class LineItemStatus(str, Enum):
    """Line item status types."""
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    READY = "READY"
    PAUSED = "PAUSED"
    DELIVERING = "DELIVERING"
    DELIVERY_EXTENDED = "DELIVERY_EXTENDED"
    COMPLETED = "COMPLETED"
    DISAPPROVED = "DISAPPROVED"
    ARCHIVED = "ARCHIVED"


class PlacementStatus(str, Enum):
    """Placement status types."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class TeamStatus(str, Enum):
    """Team status types."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class RoleStatus(str, Enum):
    """Role status types."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class ReportState(str, Enum):
    """Report execution state."""
    STATE_UNSPECIFIED = "STATE_UNSPECIFIED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CustomTargetingKeyType(str, Enum):
    """Custom targeting key types."""
    PREDEFINED = "PREDEFINED"
    FREEFORM = "FREEFORM"


class SiteApprovalStatus(str, Enum):
    """Site approval status."""
    APPROVAL_STATUS_UNSPECIFIED = "APPROVAL_STATUS_UNSPECIFIED"
    DRAFT = "DRAFT"
    UNCHECKED = "UNCHECKED"
    APPROVED = "APPROVED"
    DISAPPROVED = "DISAPPROVED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"


# =============================================================================
# Report Dimensions
# =============================================================================

REPORT_DIMENSIONS = [
    "AD_UNIT_ID",
    "AD_UNIT_NAME",
    "AD_UNIT_CODE",
    "ADVERTISER_ID",
    "ADVERTISER_NAME",
    "COUNTRY_NAME",
    "CREATIVE_ID",
    "CREATIVE_NAME",
    "DATE",
    "HOUR",
    "LINE_ITEM_ID",
    "LINE_ITEM_NAME",
    "LINE_ITEM_TYPE",
    "MONTH",
    "ORDER_ID",
    "ORDER_NAME",
    "PLACEMENT_ID",
    "PLACEMENT_NAME",
    "WEEK",
    "YEAR",
    "DEVICE_CATEGORY",
    "BROWSER",
    "OPERATING_SYSTEM",
    "TARGETING_TYPE",
]


# =============================================================================
# Report Metrics
# =============================================================================

REPORT_METRICS = [
    "AD_SERVER_IMPRESSIONS",
    "AD_SERVER_CLICKS",
    "AD_SERVER_CTR",
    "AD_SERVER_CPM_AND_CPC_REVENUE",
    "AD_SERVER_WITHOUT_CPD_AVERAGE_ECPM",
    "AD_EXCHANGE_IMPRESSIONS",
    "AD_EXCHANGE_CLICKS",
    "AD_EXCHANGE_CTR",
    "AD_EXCHANGE_REVENUE",
    "TOTAL_IMPRESSIONS",
    "TOTAL_CLICKS",
    "TOTAL_CTR",
    "TOTAL_CPM_AND_CPC_REVENUE",
    "TOTAL_FILL_RATE",
    "TOTAL_CODE_SERVED_COUNT",
    "TOTAL_AD_REQUESTS",
    "TOTAL_RESPONSES_SERVED",
    "TOTAL_UNMATCHED_AD_REQUESTS",
    "ADSENSE_IMPRESSIONS",
    "ADSENSE_CLICKS",
    "ADSENSE_CTR",
    "ADSENSE_REVENUE",
]
