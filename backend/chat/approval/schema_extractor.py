"""Schema extraction for dangerous tools.

Maps tool names to JSON schemas for frontend parameter editing.
Schemas are manually defined for AdMob tools.

NOTE: Ad Manager tool schemas are no longer generated from Pydantic models
since the architecture moved to dynamic FastMCP tool generation from
Google Discovery specs. Ad Manager tools will use a generic JSON schema.

Output format for RJSF (React JSON Schema Form):
{
    "schema": { ... },      # Standard JSON Schema
    "uiSchema": { ... }     # RJSF UI hints (widgets, options, dependencies)
}
"""

from typing import Optional, Type, TypedDict
from pydantic import BaseModel


class RJSFSchema(TypedDict):
    """RJSF-compatible schema output with separate schema and uiSchema."""
    schema: dict
    uiSchema: dict


# Ad Manager tool models removed - architecture now uses FastMCP dynamic generation
# Ad Manager tools will use generic JSON body schema for approval forms
AD_MANAGER_TOOL_MODELS: dict[str, Type[BaseModel]] = {}


def _pydantic_to_rjsf(model: Type[BaseModel]) -> RJSFSchema:
    """Convert Pydantic model to RJSF format with schema and uiSchema.

    For Ad Manager tools, adds uiSchema hints for network_code field.
    """
    schema = model.model_json_schema()
    ui_schema: dict = {}

    if "properties" in schema:
        # Add async select for network_code field
        if "network_code" in schema["properties"]:
            ui_schema["network_code"] = {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "networks"}
            }

    return {"schema": schema, "uiSchema": ui_schema}


def get_tool_schema(tool_name: str) -> Optional[dict]:
    """Get JSON Schema for a dangerous tool's input parameters (legacy).

    DEPRECATED: Use get_tool_schema_by_mcp_name() instead for RJSF format.

    Args:
        tool_name: Either the MCP tool name or display name

    Returns:
        JSON Schema dict or None if not found/supported
    """
    # First check if it's an Ad Manager MCP tool name
    if tool_name in AD_MANAGER_TOOL_MODELS:
        model = AD_MANAGER_TOOL_MODELS[tool_name]
        return model.model_json_schema()

    # Fall back to manually defined schemas (legacy Ad Manager display names)
    return TOOL_SCHEMAS.get(tool_name)


def get_tool_schema_by_mcp_name(mcp_tool_name: str) -> Optional[RJSFSchema]:
    """Get RJSF-compatible schema for a tool by its MCP name.

    Args:
        mcp_tool_name: The MCP tool name (e.g., "admob_create_app")

    Returns:
        RJSFSchema with schema and uiSchema, or None if not found
    """
    # Check Ad Manager tools first (auto-generated from Pydantic models)
    if mcp_tool_name in AD_MANAGER_TOOL_MODELS:
        model = AD_MANAGER_TOOL_MODELS[mcp_tool_name]
        return _pydantic_to_rjsf(model)

    # Check AdMob tools (manually defined RJSF schemas)
    if mcp_tool_name in ADMOB_TOOL_SCHEMAS:
        return ADMOB_TOOL_SCHEMAS[mcp_tool_name]

    # Check Discovery-generated tool name mapping
    # Maps raw API tool names to curated schema keys
    mapped_name = DISCOVERY_TOOL_NAME_MAP.get(mcp_tool_name)
    if mapped_name and mapped_name in ADMOB_TOOL_SCHEMAS:
        return ADMOB_TOOL_SCHEMAS[mapped_name]

    return None


# =============================================================================
# Discovery-generated tool name mappings
# =============================================================================
# Maps raw API tool names (from Google Discovery JSON) to curated schema keys.
# Discovery tools use format: accounts_<resource>_<action>
# Curated schemas use format: admob_<action>_<resource>
DISCOVERY_TOOL_NAME_MAP: dict[str, str] = {
    # AdMob Apps
    "accounts_apps_create": "admob_create_app",

    # AdMob Ad Units
    "accounts_adUnits_create": "admob_create_ad_unit",

    # AdMob Ad Unit Mappings
    "accounts_adUnitMappings_create": "admob_create_ad_unit_mapping",
    "accounts_adUnits_adUnitMappings_create": "admob_create_ad_unit_mapping",

    # AdMob Mediation Groups
    "accounts_mediationGroups_create": "admob_create_mediation_group",
    "accounts_mediationGroups_patch": "admob_update_mediation_group",

    # AdMob Mediation A/B Experiments
    "accounts_mediationGroups_mediationAbExperiments_create": "admob_create_mediation_ab_experiment",
    "accounts_mediationGroups_mediationAbExperiments_stop": "admob_stop_mediation_ab_experiment",
}


# =============================================================================
# AdMob Tool RJSF Schemas (keyed by MCP tool name)
# =============================================================================
# Proper RJSF format with separate schema and uiSchema.
# uiSchema uses standard RJSF conventions:
#   - "ui:widget": "EntitySelectWidget" for dynamic dropdowns
#   - "ui:options": { "fetchType": "accounts|apps|ad_units|..." }
#   - "ui:options": { "dependsOn": "field_name" } for structural cascading (clears child on change)
#   - "ui:options": { "filterBy": ["field1", "field2"] } for filter cascading (keeps valid selections)

ADMOB_TOOL_SCHEMAS: dict[str, RJSFSchema] = {
    "admob_create_app": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "platform": {
                    "type": "string",
                    "enum": ["IOS", "ANDROID"],
                    "description": "Platform: IOS or ANDROID"
                },
                "app_store_id": {
                    "type": "string",
                    "description": "App store ID (e.g., 'com.example.app' for Android, '123456789' for iOS)"
                },
                "display_name": {
                    "type": "string",
                    "description": "Optional display name for the app"
                },
                "android_app_stores": {
                    "type": "string",
                    "description": "Comma-separated Android app stores (only for ANDROID): GOOGLE_PLAY, AMAZON_APPSTORE, OPPO, SAMSUNG, VIVO, XIAOMI"
                }
            },
            "required": ["account_id", "platform", "app_store_id"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "platform", "app_store_id", "display_name", "android_app_stores"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            }
        }
    },

    "admob_create_ad_unit": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "app_id": {
                    "type": "string",
                    "description": "App ID this ad unit belongs to"
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
                },
                "reward_settings": {
                    "type": "object",
                    "description": "Reward configuration for REWARDED and REWARDED_INTERSTITIAL ad formats",
                    "properties": {
                        "unit_amount": {
                            "type": "integer",
                            "description": "Reward amount (e.g., 100)",
                            "minimum": 1
                        },
                        "unit_type": {
                            "type": "string",
                            "description": "Reward type label (e.g., 'coins', 'gems')"
                        }
                    },
                    "required": ["unit_amount", "unit_type"]
                }
            },
            "required": ["account_id", "app_id", "display_name", "ad_format"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "app_id", "display_name", "ad_format", "ad_types", "reward_settings"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "app_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "apps", "dependsOn": "parent"}
            },
            "reward_settings": {
                "ui:order": ["unit_amount", "unit_type"]
            }
        }
    },

    "admob_create_ad_unit_mapping": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "ad_unit_id": {
                    "type": "string",
                    "description": "Ad unit ID"
                },
                "ad_source_id": {
                    "type": "string",
                    "description": "Ad source ID"
                },
                "display_name": {
                    "type": "string",
                    "description": "Display name for the mapping"
                },
                "state": {
                    "type": "string",
                    "enum": ["ENABLED", "DISABLED"],
                    "default": "ENABLED",
                    "description": "Mapping state: ENABLED or DISABLED"
                }
            },
            "required": ["account_id", "ad_unit_id", "ad_source_id", "display_name"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "ad_unit_id", "ad_source_id", "display_name", "state"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "ad_unit_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "ad_units", "dependsOn": "parent"}
            },
            "ad_source_id": {
                "ui:widget": "AdSourceSelectWidget",
                "ui:options": {"fetchType": "ad_sources", "dependsOn": "parent"}
            }
        }
    },

    "admob_batch_create_ad_unit_mappings": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "mappings_json": {
                    "type": "string",
                    "description": "JSON array of mappings with ad_unit_id, ad_source_id, display_name"
                }
            },
            "required": ["account_id", "mappings_json"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "mappings_json"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "mappings_json": {
                "ui:widget": "textarea"
            }
        }
    },

    "admob_create_mediation_group": {
        "schema": {
            "type": "object",
            "properties": {
                "parent": {
                    "type": "string",
                    "title": "Account",
                    "description": "Publisher account (e.g., accounts/pub-XXXXX)"
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
                    "description": "Comma-separated list of ad unit IDs"
                },
                "advanced_targeting": {
                    "type": "object",
                    "title": "Advanced Targeting",
                    "description": "Optional geographic and IDFA targeting settings",
                    "properties": {
                        "targeted_region_codes": {
                            "type": "string",
                            "title": "Target Regions",
                            "description": "ISO 3166-1 alpha-2 country codes to target (e.g., 'US,CA,GB')"
                        },
                        "excluded_region_codes": {
                            "type": "string",
                            "title": "Exclude Regions",
                            "description": "ISO 3166-1 alpha-2 country codes to exclude (e.g., 'CN,RU')"
                        },
                        "idfa_targeting": {
                            "type": "string",
                            "title": "IDFA Targeting",
                            "enum": ["ALL", "OPTED_IN_USERS", "NOT_OPTED_IN_USERS"],
                            "default": "ALL",
                            "description": "iOS IDFA targeting"
                        }
                    }
                },
                "state": {
                    "type": "string",
                    "enum": ["ENABLED", "DISABLED"],
                    "default": "ENABLED",
                    "description": "Mediation group state"
                },
                "bidding_lines": {
                    "type": "array",
                    "description": "Bidding networks (real-time auction). These compete via live bidding.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ad_source_id": {
                                "type": "string",
                                "description": "Bidding ad network source ID"
                            },
                            "state": {
                                "type": "string",
                                "enum": ["ENABLED", "DISABLED"],
                                "default": "ENABLED",
                                "description": "Enable or disable this bidder"
                            },
                            "experiment_variant": {
                                "type": "string",
                                "enum": ["ORIGINAL", "VARIANT_A", "VARIANT_B"],
                                "description": "A/B test variant assignment (optional)"
                            }
                        },
                        "required": ["ad_source_id"]
                    }
                },
                "waterfall_lines": {
                    "type": "array",
                    "description": "Waterfall networks (priority-based). These are called in order by CPM.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ad_source_id": {
                                "type": "string",
                                "description": "Waterfall ad network source ID"
                            },
                            "pricing_mode": {
                                "type": "string",
                                "enum": ["FIXED", "NETWORK_OPTIMIZED"],
                                "default": "FIXED",
                                "description": "FIXED = set your own CPM, NETWORK_OPTIMIZED = network sets CPM"
                            },
                            "cpm_floor": {
                                "type": "number",
                                "description": "CPM floor in dollars (e.g., 1.50). Required for FIXED pricing."
                            },
                            "state": {
                                "type": "string",
                                "enum": ["ENABLED", "DISABLED"],
                                "default": "ENABLED",
                                "description": "Enable or disable this network"
                            },
                            "experiment_variant": {
                                "type": "string",
                                "enum": ["ORIGINAL", "VARIANT_A", "VARIANT_B"],
                                "description": "A/B test variant assignment (optional)"
                            }
                        },
                        "required": ["ad_source_id"]
                    }
                }
            },
            "required": ["parent", "display_name", "platform", "ad_format", "ad_unit_ids"]
        },
        "uiSchema": {
            "ui:order": [
                "parent", "display_name", "state", "platform", "ad_format",
                "ad_unit_ids", "advanced_targeting",
                "bidding_lines", "waterfall_lines"
            ],
            "parent": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "ad_unit_ids": {
                "ui:widget": "MultiSelectWidget",
                "ui:options": {
                    "fetchType": "ad_units",
                    "dependsOn": "parent",
                    "filterBy": ["ad_format"]
                }
            },
            "state": {
                "ui:widget": "ToggleWidget"
            },
            "platform": {
                "ui:widget": "PlatformWidget"
            },
            "advanced_targeting": {
                "ui:order": ["targeted_region_codes", "excluded_region_codes", "idfa_targeting"],
                "ui:options": {"collapsible": True, "defaultCollapsed": True},
                "targeted_region_codes": {
                    "ui:widget": "RegionCodesWidget",
                    "ui:placeholder": "Select target regions..."
                },
                "excluded_region_codes": {
                    "ui:widget": "RegionCodesWidget",
                    "ui:placeholder": "Select regions to exclude..."
                },
                "idfa_targeting": {
                    "ui:widget": "SelectWidget"
                }
            },
            "bidding_lines": {
                "ui:title": "Bidding Networks",
                "ui:field": "AdSourceToggleField",
                "ui:options": {
                    "fetchType": "bidding_ad_sources",
                    "dependsOn": "parent"
                }
            },
            "waterfall_lines": {
                "ui:title": "Waterfall Networks",
                "ui:field": "AdSourceToggleField",
                "ui:options": {
                    "fetchType": "waterfall_ad_sources",
                    "dependsOn": "parent"
                }
            }
        }
    },

    "admob_update_mediation_group": {
        "schema": {
            "type": "object",
            "properties": {
                "parent": {
                    "type": "string",
                    "title": "Account",
                    "description": "Publisher account (e.g., accounts/pub-XXXXX)"
                },
                "mediation_group_id": {
                    "type": "string",
                    "description": "Mediation group ID to update"
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
                    "description": "Comma-separated list of updated ad unit IDs"
                },
                "advanced_targeting": {
                    "type": "object",
                    "title": "Advanced Targeting",
                    "description": "Optional geographic and IDFA targeting settings",
                    "properties": {
                        "targeted_region_codes": {
                            "type": "string",
                            "title": "Target Regions",
                            "description": "ISO 3166-1 alpha-2 country codes to target"
                        },
                        "excluded_region_codes": {
                            "type": "string",
                            "title": "Exclude Regions",
                            "description": "ISO 3166-1 alpha-2 country codes to exclude"
                        },
                        "idfa_targeting": {
                            "type": "string",
                            "title": "IDFA Targeting",
                            "enum": ["ALL", "OPTED_IN_USERS", "NOT_OPTED_IN_USERS"],
                            "default": "ALL",
                            "description": "iOS IDFA targeting"
                        }
                    }
                },
                "bidding_lines": {
                    "type": "array",
                    "description": "Bidding networks to add or update. Use line_id to update existing lines.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "line_id": {
                                "type": "string",
                                "description": "Existing line ID to update (leave empty to add new)"
                            },
                            "ad_source_id": {
                                "type": "string",
                                "description": "Bidding ad network source ID"
                            },
                            "state": {
                                "type": "string",
                                "enum": ["ENABLED", "DISABLED", "REMOVED"],
                                "default": "ENABLED",
                                "description": "Line state (use REMOVED to delete)"
                            },
                            "experiment_variant": {
                                "type": "string",
                                "enum": ["ORIGINAL", "VARIANT_A", "VARIANT_B"],
                                "description": "A/B test variant assignment (optional)"
                            }
                        },
                        "required": ["ad_source_id"]
                    }
                },
                "waterfall_lines": {
                    "type": "array",
                    "description": "Waterfall networks to add or update. Use line_id to update existing lines.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "line_id": {
                                "type": "string",
                                "description": "Existing line ID to update (leave empty to add new)"
                            },
                            "ad_source_id": {
                                "type": "string",
                                "description": "Waterfall ad network source ID"
                            },
                            "pricing_mode": {
                                "type": "string",
                                "enum": ["FIXED", "NETWORK_OPTIMIZED"],
                                "default": "FIXED",
                                "description": "FIXED = set CPM, NETWORK_OPTIMIZED = network sets CPM"
                            },
                            "cpm_floor": {
                                "type": "number",
                                "description": "CPM floor in dollars. Required for FIXED pricing."
                            },
                            "state": {
                                "type": "string",
                                "enum": ["ENABLED", "DISABLED", "REMOVED"],
                                "default": "ENABLED",
                                "description": "Line state (use REMOVED to delete)"
                            },
                            "experiment_variant": {
                                "type": "string",
                                "enum": ["ORIGINAL", "VARIANT_A", "VARIANT_B"],
                                "description": "A/B test variant assignment (optional)"
                            }
                        },
                        "required": ["ad_source_id"]
                    }
                }
            },
            "required": ["parent", "mediation_group_id"]
        },
        "uiSchema": {
            "ui:order": [
                "parent", "mediation_group_id", "display_name", "state",
                "ad_unit_ids", "advanced_targeting",
                "bidding_lines", "waterfall_lines"
            ],
            "parent": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "mediation_group_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "mediation_groups", "dependsOn": "parent"}
            },
            "ad_unit_ids": {
                "ui:widget": "MultiSelectWidget",
                "ui:options": {
                    "fetchType": "ad_units",
                    "dependsOn": "parent",
                    "filterBy": ["ad_format"]
                }
            },
            "advanced_targeting": {
                "ui:order": ["targeted_region_codes", "excluded_region_codes", "idfa_targeting"],
                "ui:options": {"collapsible": True, "defaultCollapsed": True},
                "targeted_region_codes": {
                    "ui:widget": "RegionCodesWidget",
                    "ui:placeholder": "Select target regions..."
                },
                "excluded_region_codes": {
                    "ui:widget": "RegionCodesWidget",
                    "ui:placeholder": "Select regions to exclude..."
                },
                "idfa_targeting": {
                    "ui:widget": "SelectWidget"
                }
            },
            "bidding_lines": {
                "ui:title": "Bidding Networks",
                "ui:field": "AdSourceToggleField",
                "ui:options": {
                    "fetchType": "bidding_ad_sources",
                    "dependsOn": "parent"
                }
            },
            "waterfall_lines": {
                "ui:title": "Waterfall Networks",
                "ui:field": "AdSourceToggleField",
                "ui:options": {
                    "fetchType": "waterfall_ad_sources",
                    "dependsOn": "parent"
                }
            }
        }
    },

    "admob_create_mediation_ab_experiment": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "mediation_group_id": {
                    "type": "string",
                    "description": "Mediation group ID to experiment on"
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
                },
                "treatment_mediation_lines": {
                    "type": "array",
                    "description": "Mediation lines for the experiment variant (optional - defaults to copy of control)",
                    "items": {
                        "type": "object",
                        "properties": {
                            "line_id": {
                                "type": "string",
                                "description": "Line identifier"
                            },
                            "display_name": {
                                "type": "string",
                                "description": "Display name for this line"
                            },
                            "ad_source_id": {
                                "type": "string",
                                "description": "Ad network source ID",
                                "ui:widget": "EntitySelectWidget",
                                "ui:options": {"fetchType": "ad_sources", "dependsOn": "parent"}
                            },
                            "cpm_mode": {
                                "type": "string",
                                "enum": ["LIVE", "MANUAL", "ANO"],
                                "default": "LIVE",
                                "description": "LIVE = bidding, MANUAL = fixed CPM, ANO = network-optimized"
                            },
                            "cpm_micros": {
                                "type": "integer",
                                "description": "CPM in micros for MANUAL mode"
                            },
                            "state": {
                                "type": "string",
                                "enum": ["ENABLED", "DISABLED"],
                                "default": "ENABLED",
                                "description": "Enable or disable this line"
                            }
                        },
                        "required": ["display_name", "ad_source_id"]
                    }
                }
            },
            "required": ["account_id", "mediation_group_id", "display_name"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "mediation_group_id", "display_name", "traffic_percentage", "treatment_mediation_lines"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "mediation_group_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "mediation_groups", "dependsOn": "parent"}
            },
            "treatment_mediation_lines": {
                "ui:options": {
                    "orderable": True,
                    "addable": True,
                    "removable": True
                },
                "items": {
                    "ui:order": ["line_id", "ad_source_id", "display_name", "cpm_mode", "cpm_micros", "state"],
                    "line_id": {"ui:placeholder": "Auto-generated"},
                    "display_name": {"ui:placeholder": "e.g., AdMob Bidding"},
                    "ad_source_id": {
                        "ui:widget": "AdSourceSelectWidget",
                        "ui:options": {"fetchType": "ad_sources", "dependsOn": "parent"}
                    },
                    "cpm_micros": {"ui:placeholder": "e.g., 1500000 = $1.50"}
                }
            }
        }
    },

    "admob_stop_mediation_ab_experiment": {
        "schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Publisher account ID"
                },
                "mediation_group_id": {
                    "type": "string",
                    "description": "Mediation group ID with the experiment"
                },
                "variant_choice": {
                    "type": "string",
                    "enum": ["ORIGINAL", "EXPERIMENT"],
                    "description": "Which variant to keep"
                }
            },
            "required": ["account_id", "mediation_group_id", "variant_choice"]
        },
        "uiSchema": {
            "ui:order": ["account_id", "mediation_group_id", "variant_choice"],
            "account_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "accounts"}
            },
            "mediation_group_id": {
                "ui:widget": "EntitySelectWidget",
                "ui:options": {"fetchType": "mediation_groups", "dependsOn": "parent"}
            }
        }
    },
}


# =============================================================================
# Legacy Tool Schemas (display name keyed, for backward compatibility)
# =============================================================================
# NOTE: These are deprecated. Use get_tool_schema_by_mcp_name() for new code.

TOOL_SCHEMAS: dict[str, dict] = {
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
