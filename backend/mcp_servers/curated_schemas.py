"""Curated schemas for dangerous MCP tools.

This module defines flat parameter schemas for tools that require
human-in-loop approval. Instead of requiring the LLM to construct
complex nested JSON bodies, we expose flat parameters that get
reconstructed into the API body format.

Benefits:
- LLM can easily understand and fill flat parameters
- Better descriptions for each field
- Enums for constrained values
- CSV format for list inputs (easier for LLM)
"""

from dataclasses import dataclass
from typing import Any, Optional
import json


@dataclass
class FlatParam:
    """Definition for a flat parameter that maps to API body field."""
    name: str
    type: str  # "str", "int", "float", "bool"
    required: bool = False
    default: Optional[Any] = None
    body_path: str = ""  # Dot-notation path in body (e.g., "targeting.platform")
    enum: Optional[list[str]] = None
    is_csv: bool = False  # CSV string → array
    is_json: bool = False  # JSON string → parsed object
    description: str = ""


# =============================================================================
# Curated Tool Schemas
# =============================================================================
# Maps discovery-generated tool names to flat parameter definitions.
# Only dangerous tools (create/update/delete) need curated schemas.
# Read-only tools continue to use body_json approach.

CURATED_TOOL_SCHEMAS: dict[str, dict] = {
    "accounts_mediationGroups_create": {
        "description": """Create a mediation group with bidding and waterfall ad sources.

IMPORTANT NOTES:
- AdMob Network (ID: 5450213213286189855) is BIDDING-ONLY. Do NOT put it in waterfall_lines.
- Bidding networks compete in real-time auctions (Meta, Unity, AppLovin, Pangle, etc.)
- Waterfall networks are fallbacks with fixed/optimized CPM (ironSource, Mintegral, Chartboost, etc.)

WHEN USER DOESN'T SPECIFY DETAILS:
- Pick a reasonable app from their account (prefer gaming apps for gaming networks)
- Select appropriate ad units based on the app
- Choose top-performing bidding networks: Meta Audience Network, Unity Ads, AppLovin, Pangle
- Use AdMob Network in bidding as the baseline
- Don't ask for clarification - make intelligent choices and proceed with the tool call.""",
        "params": [
            FlatParam(
                name="display_name",
                type="str",
                required=True,
                body_path="displayName",
                description="Display name for the mediation group (max 120 chars)"
            ),
            FlatParam(
                name="platform",
                type="str",
                required=True,
                body_path="targeting.platform",
                enum=["IOS", "ANDROID"],
                description="Target platform: IOS or ANDROID"
            ),
            FlatParam(
                name="ad_format",
                type="str",
                required=True,
                body_path="targeting.format",
                enum=["APP_OPEN", "BANNER", "INTERSTITIAL", "NATIVE", "REWARDED", "REWARDED_INTERSTITIAL"],
                description="Ad format type"
            ),
            FlatParam(
                name="ad_unit_ids",
                type="str",
                required=True,
                body_path="targeting.adUnitIds",
                is_csv=True,
                description="Comma-separated list of ad unit IDs to target"
            ),
            FlatParam(
                name="state",
                type="str",
                required=False,
                default="ENABLED",
                body_path="state",
                enum=["ENABLED", "DISABLED"],
                description="Mediation group state (default: ENABLED)"
            ),
            FlatParam(
                name="targeted_region_codes",
                type="str",
                required=False,
                body_path="targeting.targetedRegionCodes",
                is_csv=True,
                description="ISO 3166-1 alpha-2 country codes to target (e.g., 'US,CA,GB')"
            ),
            FlatParam(
                name="excluded_region_codes",
                type="str",
                required=False,
                body_path="targeting.excludedRegionCodes",
                is_csv=True,
                description="ISO 3166-1 alpha-2 country codes to exclude (e.g., 'CN,RU')"
            ),
            FlatParam(
                name="idfa_targeting",
                type="str",
                required=False,
                body_path="targeting.idfaTargeting",
                enum=["ALL", "OPTED_IN_USERS", "NOT_OPTED_IN_USERS"],
                description="iOS IDFA targeting mode"
            ),
            FlatParam(
                name="bidding_lines",
                type="str",
                required=False,
                body_path="_bidding",  # Special handling
                is_json=True,
                description="JSON array of bidding networks. Include AdMob Network (5450213213286189855) here as baseline. Example: [{\"ad_source_id\": \"5450213213286189855\", \"state\": \"ENABLED\"}, {\"ad_source_id\": \"11198165126854996598\", \"state\": \"ENABLED\"}]"
            ),
            FlatParam(
                name="waterfall_lines",
                type="str",
                required=False,
                body_path="_waterfall",  # Special handling
                is_json=True,
                description="JSON array of waterfall networks (NOT AdMob Network - that's bidding-only). Use networks like ironSource, Mintegral, Chartboost. Example: [{\"ad_source_id\": \"...\", \"cpm_micros\": 1500000, \"state\": \"ENABLED\"}]"
            ),
        ]
    },

    "accounts_mediationGroups_patch": {
        "description": "Update an existing mediation group",
        "params": [
            FlatParam(
                name="display_name",
                type="str",
                required=False,
                body_path="displayName",
                description="New display name for the mediation group"
            ),
            FlatParam(
                name="state",
                type="str",
                required=False,
                body_path="state",
                enum=["ENABLED", "DISABLED"],
                description="New state for the mediation group"
            ),
            FlatParam(
                name="ad_unit_ids",
                type="str",
                required=False,
                body_path="targeting.adUnitIds",
                is_csv=True,
                description="Updated comma-separated list of ad unit IDs"
            ),
            FlatParam(
                name="targeted_region_codes",
                type="str",
                required=False,
                body_path="targeting.targetedRegionCodes",
                is_csv=True,
                description="ISO 3166-1 alpha-2 country codes to target"
            ),
            FlatParam(
                name="excluded_region_codes",
                type="str",
                required=False,
                body_path="targeting.excludedRegionCodes",
                is_csv=True,
                description="ISO 3166-1 alpha-2 country codes to exclude"
            ),
            FlatParam(
                name="idfa_targeting",
                type="str",
                required=False,
                body_path="targeting.idfaTargeting",
                enum=["ALL", "OPTED_IN_USERS", "NOT_OPTED_IN_USERS"],
                description="iOS IDFA targeting mode"
            ),
            FlatParam(
                name="bidding_lines",
                type="str",
                required=False,
                body_path="_bidding",
                is_json=True,
                description="JSON array of bidding networks to add/update. Include 'line_id' to update existing."
            ),
            FlatParam(
                name="waterfall_lines",
                type="str",
                required=False,
                body_path="_waterfall",
                is_json=True,
                description="JSON array of waterfall networks to add/update. Include 'line_id' to update existing."
            ),
        ]
    },
}


def _set_nested(obj: dict, path: str, value: Any) -> None:
    """Set a value at a nested path in a dict.

    Args:
        obj: The dict to modify
        path: Dot-notation path (e.g., "targeting.platform")
        value: Value to set

    Example:
        _set_nested({}, "targeting.platform", "IOS")
        # Result: {"targeting": {"platform": "IOS"}}
    """
    parts = path.split(".")
    for part in parts[:-1]:
        if part not in obj:
            obj[part] = {}
        obj = obj[part]
    obj[parts[-1]] = value


def build_body_from_flat_params(schema_params: list[FlatParam], **kwargs) -> dict:
    """Build nested API body from flat parameters.

    Args:
        schema_params: List of FlatParam definitions from curated schema
        **kwargs: Flat parameter values from LLM tool call

    Returns:
        Nested dict matching AdMob API body format
    """
    body: dict[str, Any] = {}
    bidding_lines: list[dict] = []
    waterfall_lines: list[dict] = []

    for param in schema_params:
        value = kwargs.get(param.name)

        # Skip None/empty values (use defaults if specified)
        if value is None:
            if param.default is not None:
                value = param.default
            else:
                continue

        # Handle CSV → array conversion
        if param.is_csv and isinstance(value, str):
            value = [x.strip() for x in value.split(",") if x.strip()]

        # Handle JSON string → parsed object
        if param.is_json and isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                continue  # Skip invalid JSON

        # Special handling for bidding/waterfall lines
        if param.body_path == "_bidding":
            if isinstance(value, list) and all(isinstance(item, dict) for item in value):
                bidding_lines = value  # type: ignore[assignment]
            continue
        elif param.body_path == "_waterfall":
            if isinstance(value, list) and all(isinstance(item, dict) for item in value):
                waterfall_lines = value  # type: ignore[assignment]
            continue

        # Set at body path
        if param.body_path:
            _set_nested(body, param.body_path, value)

    # Transform bidding/waterfall lines to API format
    if bidding_lines or waterfall_lines:
        body["mediationGroupLines"] = _transform_mediation_lines(
            bidding_lines, waterfall_lines
        )

    return body


def _transform_mediation_lines(
    bidding_lines: list[dict],
    waterfall_lines: list[dict]
) -> dict:
    """Transform flat bidding/waterfall arrays to API's mediationGroupLines format.

    The API expects:
    {
        "mediationGroupLines": {
            "-1": { ... first line ... },
            "-2": { ... second line ... },
            "existing_id": { ... update existing ... }
        }
    }

    New lines use negative IDs, existing lines use their real IDs.
    """
    result: dict[str, dict] = {}
    new_id_counter = -1

    # Process bidding lines (real-time auction)
    for line in bidding_lines:
        line_id = line.get("line_id") or str(new_id_counter)
        if line_id == str(new_id_counter):
            new_id_counter -= 1

        result[line_id] = {
            "adSourceId": line.get("ad_source_id"),
            "state": line.get("state", "ENABLED"),
            "cpmMode": "LIVE",  # Bidding always uses LIVE mode
        }

        # Add experiment variant if specified
        if line.get("experiment_variant"):
            result[line_id]["experimentVariant"] = line["experiment_variant"]

    # Process waterfall lines (priority-based)
    for line in waterfall_lines:
        line_id = line.get("line_id") or str(new_id_counter)
        if line_id == str(new_id_counter):
            new_id_counter -= 1

        # Determine CPM mode and value
        pricing_mode = line.get("pricing_mode", "FIXED")
        cpm_mode = "MANUAL" if pricing_mode == "FIXED" else "ANO"

        line_data: dict[str, Any] = {
            "adSourceId": line.get("ad_source_id"),
            "state": line.get("state", "ENABLED"),
            "cpmMode": cpm_mode,
        }

        # Add CPM value for FIXED pricing
        if pricing_mode == "FIXED":
            cpm_value = line.get("cpm_micros") or line.get("cpm_floor")
            if cpm_value is not None:
                # Convert dollars to micros if needed
                if isinstance(cpm_value, float) and cpm_value < 1000:
                    cpm_value = int(cpm_value * 1_000_000)
                line_data["cpmMicros"] = str(int(cpm_value))

        # Add experiment variant if specified
        if line.get("experiment_variant"):
            line_data["experimentVariant"] = line["experiment_variant"]

        result[line_id] = line_data

    return result


def get_curated_schema(tool_name: str) -> Optional[dict]:
    """Get curated schema for a tool if it exists.

    Args:
        tool_name: Discovery-generated tool name (e.g., "accounts_mediationGroups_create")

    Returns:
        Schema dict with 'description' and 'params' keys, or None if not curated
    """
    return CURATED_TOOL_SCHEMAS.get(tool_name)


def is_curated_tool(tool_name: str) -> bool:
    """Check if a tool has a curated schema."""
    return tool_name in CURATED_TOOL_SCHEMAS
