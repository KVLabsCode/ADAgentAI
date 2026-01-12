"""Schema extraction for dangerous tools.

Maps tool names to JSON schemas for frontend parameter editing.
Schemas are auto-generated from Pydantic models for Ad Manager tools
and manually defined for AdMob tools (which have custom x-dynamic hints).
"""

from typing import Optional, Type
from pydantic import BaseModel

# Import all Ad Manager Pydantic models for schema extraction
from admanager_mcp.models import (
    # Ad Units
    CreateNetworksAdUnitsInput,
    PatchNetworksAdUnitsInput,
    BatchCreateNetworksAdUnitsInput,
    BatchUpdateNetworksAdUnitsInput,
    BatchActivateNetworksAdUnitsInput,
    BatchDeactivateNetworksAdUnitsInput,
    BatchArchiveNetworksAdUnitsInput,
    # Contacts
    CreateNetworksContactsInput,
    PatchNetworksContactsInput,
    BatchCreateNetworksContactsInput,
    BatchUpdateNetworksContactsInput,
    # Custom Fields
    CreateNetworksCustomFieldsInput,
    PatchNetworksCustomFieldsInput,
    BatchCreateNetworksCustomFieldsInput,
    BatchUpdateNetworksCustomFieldsInput,
    BatchActivateNetworksCustomFieldsInput,
    BatchDeactivateNetworksCustomFieldsInput,
    # Custom Targeting Keys
    CreateNetworksCustomTargetingKeysInput,
    PatchNetworksCustomTargetingKeysInput,
    BatchCreateNetworksCustomTargetingKeysInput,
    BatchUpdateNetworksCustomTargetingKeysInput,
    BatchActivateNetworksCustomTargetingKeysInput,
    BatchDeactivateNetworksCustomTargetingKeysInput,
    # Entity Signals Mappings
    CreateNetworksEntitySignalsMappingsInput,
    PatchNetworksEntitySignalsMappingsInput,
    BatchCreateNetworksEntitySignalsMappingsInput,
    BatchUpdateNetworksEntitySignalsMappingsInput,
    # Live Stream Events
    CreateNetworksLiveStreamEventsAdBreaksInput,
    CreateNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    CreateNetworksLiveStreamEventsByCustomAssetKeyAdBreaksInput,
    PatchNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    DeleteNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    # Placements
    CreateNetworksPlacementsInput,
    PatchNetworksPlacementsInput,
    BatchCreateNetworksPlacementsInput,
    BatchUpdateNetworksPlacementsInput,
    BatchActivateNetworksPlacementsInput,
    BatchDeactivateNetworksPlacementsInput,
    BatchArchiveNetworksPlacementsInput,
    # Private Auctions
    CreateNetworksPrivateAuctionsInput,
    PatchNetworksPrivateAuctionsInput,
    CreateNetworksPrivateAuctionDealsInput,
    PatchNetworksPrivateAuctionDealsInput,
    # Reports
    CreateNetworksReportsInput,
    PatchNetworksReportsInput,
    RunNetworksReportsInput,
    # Sites
    CreateNetworksSitesInput,
    PatchNetworksSitesInput,
    BatchCreateNetworksSitesInput,
    BatchUpdateNetworksSitesInput,
    BatchDeactivateNetworksSitesInput,
    BatchSubmitForApprovalNetworksSitesInput,
    # Teams
    CreateNetworksTeamsInput,
    PatchNetworksTeamsInput,
    BatchCreateNetworksTeamsInput,
    BatchUpdateNetworksTeamsInput,
    BatchActivateNetworksTeamsInput,
    BatchDeactivateNetworksTeamsInput,
    # Web Properties
    BatchAllowNetworksWebPropertiesAdReviewCenterAdsInput,
    BatchBlockNetworksWebPropertiesAdReviewCenterAdsInput,
    # Operations
    CancelOperationsInput,
    DeleteOperationsInput,
)


# Mapping from MCP tool names to Pydantic model classes
AD_MANAGER_TOOL_MODELS: dict[str, Type[BaseModel]] = {
    # Ad Units
    "admanager_create_networks_ad_units": CreateNetworksAdUnitsInput,
    "admanager_patch_networks_ad_units": PatchNetworksAdUnitsInput,
    "admanager_batch_create_networks_ad_units": BatchCreateNetworksAdUnitsInput,
    "admanager_batch_update_networks_ad_units": BatchUpdateNetworksAdUnitsInput,
    "admanager_batch_activate_networks_ad_units": BatchActivateNetworksAdUnitsInput,
    "admanager_batch_deactivate_networks_ad_units": BatchDeactivateNetworksAdUnitsInput,
    "admanager_batch_archive_networks_ad_units": BatchArchiveNetworksAdUnitsInput,
    # Contacts
    "admanager_create_networks_contacts": CreateNetworksContactsInput,
    "admanager_patch_networks_contacts": PatchNetworksContactsInput,
    "admanager_batch_create_networks_contacts": BatchCreateNetworksContactsInput,
    "admanager_batch_update_networks_contacts": BatchUpdateNetworksContactsInput,
    # Custom Fields
    "admanager_create_networks_custom_fields": CreateNetworksCustomFieldsInput,
    "admanager_patch_networks_custom_fields": PatchNetworksCustomFieldsInput,
    "admanager_batch_create_networks_custom_fields": BatchCreateNetworksCustomFieldsInput,
    "admanager_batch_update_networks_custom_fields": BatchUpdateNetworksCustomFieldsInput,
    "admanager_batch_activate_networks_custom_fields": BatchActivateNetworksCustomFieldsInput,
    "admanager_batch_deactivate_networks_custom_fields": BatchDeactivateNetworksCustomFieldsInput,
    # Custom Targeting Keys
    "admanager_create_networks_custom_targeting_keys": CreateNetworksCustomTargetingKeysInput,
    "admanager_patch_networks_custom_targeting_keys": PatchNetworksCustomTargetingKeysInput,
    "admanager_batch_create_networks_custom_targeting_keys": BatchCreateNetworksCustomTargetingKeysInput,
    "admanager_batch_update_networks_custom_targeting_keys": BatchUpdateNetworksCustomTargetingKeysInput,
    "admanager_batch_activate_networks_custom_targeting_keys": BatchActivateNetworksCustomTargetingKeysInput,
    "admanager_batch_deactivate_networks_custom_targeting_keys": BatchDeactivateNetworksCustomTargetingKeysInput,
    # Entity Signals Mappings
    "admanager_create_networks_entity_signals_mappings": CreateNetworksEntitySignalsMappingsInput,
    "admanager_patch_networks_entity_signals_mappings": PatchNetworksEntitySignalsMappingsInput,
    "admanager_batch_create_networks_entity_signals_mappings": BatchCreateNetworksEntitySignalsMappingsInput,
    "admanager_batch_update_networks_entity_signals_mappings": BatchUpdateNetworksEntitySignalsMappingsInput,
    # Live Stream Events
    "admanager_create_networks_live_stream_events_ad_breaks": CreateNetworksLiveStreamEventsAdBreaksInput,
    "admanager_create_networks_live_stream_events_by_asset_key_ad_breaks": CreateNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    "admanager_create_networks_live_stream_events_by_custom_asset_key_ad_breaks": CreateNetworksLiveStreamEventsByCustomAssetKeyAdBreaksInput,
    "admanager_patch_networks_live_stream_events_by_asset_key_ad_breaks": PatchNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    "admanager_delete_networks_live_stream_events_by_asset_key_ad_breaks": DeleteNetworksLiveStreamEventsByAssetKeyAdBreaksInput,
    # Placements
    "admanager_create_networks_placements": CreateNetworksPlacementsInput,
    "admanager_patch_networks_placements": PatchNetworksPlacementsInput,
    "admanager_batch_create_networks_placements": BatchCreateNetworksPlacementsInput,
    "admanager_batch_update_networks_placements": BatchUpdateNetworksPlacementsInput,
    "admanager_batch_activate_networks_placements": BatchActivateNetworksPlacementsInput,
    "admanager_batch_deactivate_networks_placements": BatchDeactivateNetworksPlacementsInput,
    "admanager_batch_archive_networks_placements": BatchArchiveNetworksPlacementsInput,
    # Private Auctions
    "admanager_create_networks_private_auctions": CreateNetworksPrivateAuctionsInput,
    "admanager_patch_networks_private_auctions": PatchNetworksPrivateAuctionsInput,
    "admanager_create_networks_private_auction_deals": CreateNetworksPrivateAuctionDealsInput,
    "admanager_patch_networks_private_auction_deals": PatchNetworksPrivateAuctionDealsInput,
    # Reports
    "admanager_create_networks_reports": CreateNetworksReportsInput,
    "admanager_patch_networks_reports": PatchNetworksReportsInput,
    "admanager_run_networks_reports": RunNetworksReportsInput,
    # Sites
    "admanager_create_networks_sites": CreateNetworksSitesInput,
    "admanager_patch_networks_sites": PatchNetworksSitesInput,
    "admanager_batch_create_networks_sites": BatchCreateNetworksSitesInput,
    "admanager_batch_update_networks_sites": BatchUpdateNetworksSitesInput,
    "admanager_batch_deactivate_networks_sites": BatchDeactivateNetworksSitesInput,
    "admanager_batch_submit_for_approval_networks_sites": BatchSubmitForApprovalNetworksSitesInput,
    # Teams
    "admanager_create_networks_teams": CreateNetworksTeamsInput,
    "admanager_patch_networks_teams": PatchNetworksTeamsInput,
    "admanager_batch_create_networks_teams": BatchCreateNetworksTeamsInput,
    "admanager_batch_update_networks_teams": BatchUpdateNetworksTeamsInput,
    "admanager_batch_activate_networks_teams": BatchActivateNetworksTeamsInput,
    "admanager_batch_deactivate_networks_teams": BatchDeactivateNetworksTeamsInput,
    # Web Properties
    "admanager_batch_allow_networks_web_properties_ad_review_center_ads": BatchAllowNetworksWebPropertiesAdReviewCenterAdsInput,
    "admanager_batch_block_networks_web_properties_ad_review_center_ads": BatchBlockNetworksWebPropertiesAdReviewCenterAdsInput,
    # Operations
    "admanager_cancel_operations": CancelOperationsInput,
    "admanager_delete_operations": DeleteOperationsInput,
}


def _enhance_ad_manager_schema(schema: dict) -> dict:
    """Enhance Ad Manager schema with x-dynamic hints for frontend.

    Adds x-dynamic: "networks" to network_code field so the frontend
    can fetch available networks from connected providers.
    """
    if "properties" in schema and "network_code" in schema["properties"]:
        schema["properties"]["network_code"]["x-dynamic"] = "networks"
    return schema


def get_tool_schema(tool_name: str) -> Optional[dict]:
    """Get JSON Schema for a dangerous tool's input parameters.

    Args:
        tool_name: Either the MCP tool name (e.g., "admanager_create_networks_ad_units")
                   or display name (e.g., "Create Mediation Group") for backward compat

    Returns:
        JSON Schema dict or None if not found/supported
    """
    # First check if it's an Ad Manager MCP tool name
    if tool_name in AD_MANAGER_TOOL_MODELS:
        model = AD_MANAGER_TOOL_MODELS[tool_name]
        schema = model.model_json_schema()
        return _enhance_ad_manager_schema(schema)

    # Fall back to manually defined schemas (AdMob tools, display name lookups)
    return TOOL_SCHEMAS.get(tool_name)


def get_tool_schema_by_mcp_name(mcp_tool_name: str) -> Optional[dict]:
    """Get JSON Schema for a tool by its MCP name.

    Args:
        mcp_tool_name: The MCP tool name (e.g., "admob_create_app")

    Returns:
        JSON Schema dict or None if not found
    """
    # Check Ad Manager tools first
    if mcp_tool_name in AD_MANAGER_TOOL_MODELS:
        model = AD_MANAGER_TOOL_MODELS[mcp_tool_name]
        schema = model.model_json_schema()
        return _enhance_ad_manager_schema(schema)

    # Map AdMob MCP names to display names for manual schemas
    admob_mcp_to_display = {
        "admob_create_app": "Create AdMob App",
        "admob_create_ad_unit": "Create AdMob Ad Unit",
        "admob_create_ad_unit_mapping": "Create Ad Unit Mapping",
        "admob_batch_create_ad_unit_mappings": "Batch Create Ad Unit Mappings",
        "admob_create_mediation_group": "Create Mediation Group",
        "admob_update_mediation_group": "Update Mediation Group",
        "admob_create_mediation_ab_experiment": "Create Mediation A/B Experiment",
        "admob_stop_mediation_ab_experiment": "Stop Mediation A/B Experiment",
    }

    display_name = admob_mcp_to_display.get(mcp_tool_name)
    if display_name:
        return TOOL_SCHEMAS.get(display_name)

    return None


# =============================================================================
# Tool-specific JSON Schemas
# =============================================================================
# These match the MCP tool function signatures for the approval UI.

# Dynamic field types for frontend to fetch options
# x-dynamic: "accounts" - Fetch from connected AdMob providers
# x-dynamic: "apps" - Fetch apps for selected account
# x-dynamic: "ad_units" - Fetch ad units for selected account
# x-dynamic: "ad_sources" - Fetch ad sources
# x-dynamic: "mediation_groups" - Fetch mediation groups for account
# x-depends-on: field name that must be selected first

TOOL_SCHEMAS: dict[str, dict] = {
    "Create AdMob App": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "app_store_id": {
                "type": "string",
                "description": "App store ID (e.g., 'com.example.app' for Android, '123456789' for iOS)"
            },
            "display_name": {
                "type": "string",
                "description": "Optional display name for the app"
            }
        },
        "required": ["account_id", "app_store_id"]
    },

    "Create AdMob Ad Unit": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "app_id": {
                "type": "string",
                "description": "App ID this ad unit belongs to",
                "x-dynamic": "apps",
                "x-depends-on": "account_id"
            },
            "display_name": {
                "type": "string",
                "description": "Display name for the ad unit (max 80 chars)",
                "maxLength": 80
            },
            "ad_format": {
                "type": "string",
                "enum": ["BANNER", "INTERSTITIAL", "REWARDED", "REWARDED_INTERSTITIAL", "NATIVE", "APP_OPEN"],
                "description": "Ad format type"
            },
            "ad_types": {
                "type": "string",
                "description": "Comma-separated ad types (RICH_MEDIA, VIDEO)"
            }
        },
        "required": ["account_id", "app_id", "display_name", "ad_format"]
    },

    "Create Ad Unit Mapping": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "ad_unit_id": {
                "type": "string",
                "description": "Ad unit ID",
                "x-dynamic": "ad_units",
                "x-depends-on": "account_id"
            },
            "ad_source_id": {
                "type": "string",
                "description": "Ad source ID",
                "x-dynamic": "ad_sources",
                "x-depends-on": "account_id"
            },
            "display_name": {
                "type": "string",
                "description": "Display name for the mapping"
            }
        },
        "required": ["account_id", "ad_unit_id", "ad_source_id", "display_name"]
    },

    "Batch Create Ad Unit Mappings": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "mappings_json": {
                "type": "string",
                "description": "JSON array of mappings with ad_unit_id, ad_source_id, display_name"
            }
        },
        "required": ["account_id", "mappings_json"]
    },

    "Create Mediation Group": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "display_name": {
                "type": "string",
                "description": "Display name for the mediation group (max 120 chars)",
                "maxLength": 120
            },
            "platform": {
                "type": "string",
                "enum": ["IOS", "ANDROID"],
                "description": "Target platform"
            },
            "ad_format": {
                "type": "string",
                "enum": ["APP_OPEN", "BANNER", "INTERSTITIAL", "NATIVE", "REWARDED", "REWARDED_INTERSTITIAL"],
                "description": "Ad format type"
            },
            "ad_unit_ids": {
                "type": "string",
                "description": "Comma-separated list of ad unit IDs",
                "x-dynamic": "ad_units",
                "x-depends-on": "account_id",
                "x-multi-select": True
            },
            "state": {
                "type": "string",
                "enum": ["ENABLED", "DISABLED"],
                "default": "ENABLED",
                "description": "Mediation group state"
            }
        },
        "required": ["account_id", "display_name", "platform", "ad_format", "ad_unit_ids"]
    },

    "Update Mediation Group": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "mediation_group_id": {
                "type": "string",
                "description": "Mediation group ID to update",
                "x-dynamic": "mediation_groups",
                "x-depends-on": "account_id"
            },
            "display_name": {
                "type": "string",
                "description": "New display name (optional)"
            },
            "state": {
                "type": "string",
                "enum": ["ENABLED", "DISABLED"],
                "description": "New state (optional)"
            },
            "ad_unit_ids": {
                "type": "string",
                "description": "Comma-separated list of updated ad unit IDs",
                "x-dynamic": "ad_units",
                "x-depends-on": "account_id",
                "x-multi-select": True
            }
        },
        "required": ["account_id", "mediation_group_id"]
    },

    "Create Mediation A/B Experiment": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "mediation_group_id": {
                "type": "string",
                "description": "Mediation group ID to experiment on",
                "x-dynamic": "mediation_groups",
                "x-depends-on": "account_id"
            },
            "display_name": {
                "type": "string",
                "description": "Experiment name"
            },
            "traffic_percentage": {
                "type": "integer",
                "minimum": 1,
                "maximum": 99,
                "default": 50,
                "description": "Traffic percentage for experiment variant (1-99)"
            }
        },
        "required": ["account_id", "mediation_group_id", "display_name"]
    },

    "Stop Mediation A/B Experiment": {
        "type": "object",
        "properties": {
            "account_id": {
                "type": "string",
                "description": "Publisher account ID",
                "x-dynamic": "accounts"
            },
            "mediation_group_id": {
                "type": "string",
                "description": "Mediation group ID with the experiment",
                "x-dynamic": "mediation_groups",
                "x-depends-on": "account_id"
            },
            "variant_choice": {
                "type": "string",
                "enum": ["ORIGINAL", "EXPERIMENT"],
                "description": "Which variant to keep"
            }
        },
        "required": ["account_id", "mediation_group_id", "variant_choice"]
    },

    # Ad Manager tools - these use generic data dict, less useful for editing
    "Create Ad Unit": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for ad unit creation"
            }
        },
        "required": ["network_code", "data"]
    },

    "Update Ad Unit": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "ad_units_id": {
                "type": "string",
                "description": "Ad unit ID to update"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for update"
            }
        },
        "required": ["network_code", "ad_units_id", "data"]
    },

    "Create Order": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for order creation"
            }
        },
        "required": ["network_code", "data"]
    },

    "Update Order": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "orders_id": {
                "type": "string",
                "description": "Order ID to update"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for update"
            }
        },
        "required": ["network_code", "orders_id", "data"]
    },

    "Create Line Item": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "orders_id": {
                "type": "string",
                "description": "Order ID to create line item under"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for line item creation"
            }
        },
        "required": ["network_code", "orders_id", "data"]
    },

    "Update Line Item": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "orders_id": {
                "type": "string",
                "description": "Order ID"
            },
            "line_items_id": {
                "type": "string",
                "description": "Line item ID to update"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for update"
            }
        },
        "required": ["network_code", "orders_id", "line_items_id", "data"]
    },

    "Create Creative": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for creative creation"
            }
        },
        "required": ["network_code", "data"]
    },

    "Create Site": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for site creation"
            }
        },
        "required": ["network_code", "data"]
    },

    "Update Site": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "sites_id": {
                "type": "string",
                "description": "Site ID to update"
            },
            "data": {
                "type": "string",
                "description": "JSON request body for update"
            }
        },
        "required": ["network_code", "sites_id", "data"]
    },

    "Submit Sites for Approval": {
        "type": "object",
        "properties": {
            "network_code": {
                "type": "string",
                "description": "Ad Manager network code"
            },
            "data": {
                "type": "string",
                "description": "JSON request body with site IDs to submit"
            }
        },
        "required": ["network_code", "data"]
    },
}
