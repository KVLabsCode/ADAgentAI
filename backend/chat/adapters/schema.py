"""UI hints and JSON Schema generation for approval forms.

Generates JSON Schema + RJSF UI Schema from Pydantic adapter models,
enabling frontend to render forms automatically without per-tool custom code.

Features:
- Converts Pydantic models to JSON Schema
- Adds ui:options for widget hints
- Supports dependsOn for cascading dropdowns
- Supports showWhen for conditional visibility
- Supports filterBy for entity list filtering
"""

from dataclasses import dataclass, field
from typing import Optional, Type, Any
from pydantic import BaseModel


@dataclass
class UIHints:
    """UI rendering hints for a form field.

    Attributes:
        widget: Widget type (radio, select, textarea, entitySelect, etc.)
        fetch_type: Entity type for async options (accounts, apps, ad_units, etc.)
        depends_on: Parent field name for cascading dropdowns
        filter_by: Fields to use as filter criteria
        show_when: Conditional visibility rules {field: value}
        orderable: Whether list items can be reordered
        addable: Whether new items can be added to lists
        removable: Whether items can be removed from lists
        multi_select: Whether multiple selections allowed
        placeholder: Input placeholder text
        help: Help text displayed below field
        autofocus: Whether to focus this field on form load
    """
    widget: Optional[str] = None
    fetch_type: Optional[str] = None
    depends_on: Optional[str] = None
    filter_by: Optional[list[str]] = None
    show_when: Optional[dict[str, Any]] = None
    orderable: bool = False
    addable: bool = True
    removable: bool = True
    multi_select: bool = False
    placeholder: Optional[str] = None
    help: Optional[str] = None
    autofocus: bool = False

    def to_ui_schema(self) -> dict:
        """Convert to RJSF UI Schema format."""
        result: dict[str, Any] = {}

        if self.widget:
            result["ui:widget"] = self.widget

        if self.autofocus:
            result["ui:autofocus"] = True

        if self.placeholder:
            result["ui:placeholder"] = self.placeholder

        if self.help:
            result["ui:help"] = self.help

        # Build ui:options
        options: dict[str, Any] = {}

        if self.fetch_type:
            options["fetchType"] = self.fetch_type

        if self.depends_on:
            options["dependsOn"] = self.depends_on

        if self.filter_by:
            options["filterBy"] = self.filter_by

        if self.show_when:
            options["showWhen"] = self.show_when

        if self.multi_select:
            options["multiSelect"] = True

        # Array-specific options
        if self.orderable:
            options["orderable"] = True
        if not self.addable:
            options["addable"] = False
        if not self.removable:
            options["removable"] = False

        if options:
            result["ui:options"] = options

        return result


@dataclass
class ToolUIConfig:
    """UI configuration for a tool's approval form.

    Attributes:
        adapter: Pydantic adapter class name (e.g., "MediationGroupAdapter")
        ui_format: Layout format hint (default, waterfall_split, etc.)
        field_hints: Per-field UI hints
        field_order: Explicit field ordering
        submit_label: Custom submit button label
    """
    adapter: Optional[str] = None
    ui_format: str = "default"
    field_hints: dict[str, UIHints] = field(default_factory=dict)
    field_order: Optional[list[str]] = None
    submit_label: str = "Approve"


# Base UI configurations (reusable)
_MEDIATION_GROUP_CREATE_CONFIG = ToolUIConfig(
    adapter="MediationGroupAdapter",
    ui_format="waterfall_split",
    field_hints={
        "display_name": UIHints(
            autofocus=True,
            placeholder="Enter mediation group name",
        ),
        "platform": UIHints(widget="radio"),
        "ad_format": UIHints(widget="select"),
        "bidding_lines": UIHints(
            orderable=True,
            addable=True,
            removable=True,
        ),
        "waterfall_lines": UIHints(
            orderable=True,
            addable=True,
            removable=True,
            help="Lines are served in priority order based on CPM floor",
        ),
        "ad_unit_ids": UIHints(
            widget="entitySelect",
            fetch_type="ad_units",
            depends_on="platform",
            multi_select=True,
        ),
    },
    field_order=["display_name", "platform", "ad_format", "ad_unit_ids", "bidding_lines", "waterfall_lines"],
)

_MEDIATION_GROUP_UPDATE_CONFIG = ToolUIConfig(
    adapter="MediationGroupAdapter",
    ui_format="waterfall_split",
    field_hints={
        "display_name": UIHints(placeholder="Mediation group name"),
        "platform": UIHints(widget="radio"),
        "ad_format": UIHints(widget="select"),
        "bidding_lines": UIHints(orderable=True),
        "waterfall_lines": UIHints(orderable=True),
    },
)

_AD_UNIT_CREATE_CONFIG = ToolUIConfig(
    adapter=None,  # Uses raw schema
    field_hints={
        "app_id": UIHints(
            widget="entitySelect",
            fetch_type="apps",
            placeholder="Select an app",
        ),
        "ad_format": UIHints(widget="select"),
        "display_name": UIHints(
            autofocus=True,
            placeholder="Enter ad unit name",
        ),
    },
    field_order=["app_id", "display_name", "ad_format"],
)

# Registry of tool UI configurations
# Includes both curated names and Discovery-generated names
TOOL_UI_REGISTRY: dict[str, ToolUIConfig] = {
    # Curated names
    "admob_create_mediation_group": _MEDIATION_GROUP_CREATE_CONFIG,
    "admob_update_mediation_group": _MEDIATION_GROUP_UPDATE_CONFIG,
    "admob_create_ad_unit": _AD_UNIT_CREATE_CONFIG,
    # Discovery-generated names (accounts_X_Y pattern)
    "accounts_mediationGroups_create": _MEDIATION_GROUP_CREATE_CONFIG,
    "accounts_mediationGroups_patch": _MEDIATION_GROUP_UPDATE_CONFIG,
    "accounts_adUnits_create": _AD_UNIT_CREATE_CONFIG,
}


def get_tool_ui_config(tool_name: str) -> Optional[ToolUIConfig]:
    """Get UI configuration for a tool.

    Args:
        tool_name: Tool name

    Returns:
        ToolUIConfig or None if not configured
    """
    return TOOL_UI_REGISTRY.get(tool_name)


def generate_json_schema(model_class: Type[BaseModel]) -> dict:
    """Generate JSON Schema from a Pydantic model.

    Args:
        model_class: Pydantic model class

    Returns:
        JSON Schema dict
    """
    return model_class.model_json_schema()


def generate_ui_schema(
    tool_name: str,
    field_names: Optional[list[str]] = None,
) -> dict:
    """Generate RJSF UI Schema for a tool.

    Args:
        tool_name: Tool name to look up config
        field_names: Optional list of fields to include

    Returns:
        UI Schema dict for RJSF
    """
    config = TOOL_UI_REGISTRY.get(tool_name)
    if not config:
        return {}

    ui_schema: dict[str, Any] = {}

    # Add field-level hints
    for field_name, hints in config.field_hints.items():
        if field_names and field_name not in field_names:
            continue
        field_ui = hints.to_ui_schema()
        if field_ui:
            ui_schema[field_name] = field_ui

    # Add field ordering
    if config.field_order:
        ui_schema["ui:order"] = config.field_order

    return ui_schema


def generate_rjsf_schema(
    tool_name: str,
    model_class: Optional[Type[BaseModel]] = None,
    include_fields: Optional[list[str]] = None,
) -> dict:
    """Generate combined RJSF schema (JSON Schema + UI Schema).

    Args:
        tool_name: Tool name
        model_class: Optional Pydantic model class for JSON Schema
        include_fields: Optional list of fields to include

    Returns:
        Dict with "schema" and "uiSchema" keys
    """
    config = TOOL_UI_REGISTRY.get(tool_name)

    # Generate JSON Schema
    if model_class:
        json_schema = generate_json_schema(model_class)
    else:
        json_schema = {"type": "object", "properties": {}}

    # Generate UI Schema
    ui_schema = generate_ui_schema(tool_name, include_fields)

    # Filter JSON Schema fields if specified
    if include_fields and "properties" in json_schema:
        json_schema["properties"] = {
            k: v for k, v in json_schema["properties"].items()
            if k in include_fields
        }
        if "required" in json_schema:
            json_schema["required"] = [
                f for f in json_schema["required"]
                if f in include_fields
            ]

    return {
        "schema": json_schema,
        "uiSchema": ui_schema,
        "formContext": {
            "toolName": tool_name,
            "uiFormat": config.ui_format if config else "default",
            "submitLabel": config.submit_label if config else "Approve",
        },
    }


def merge_ui_hints_into_schema(
    json_schema: dict,
    ui_hints: dict[str, UIHints],
) -> dict:
    """Merge UI hints directly into JSON Schema properties.

    Alternative approach that embeds ui:* keys in JSON Schema itself
    (for JSON Forms compatibility).

    Args:
        json_schema: JSON Schema dict
        ui_hints: Dict of field name to UIHints

    Returns:
        Merged schema with embedded UI hints
    """
    schema = dict(json_schema)

    if "properties" not in schema:
        return schema

    properties = dict(schema["properties"])

    for field_name, hints in ui_hints.items():
        if field_name not in properties:
            continue

        prop = dict(properties[field_name])
        ui_schema = hints.to_ui_schema()

        # Merge UI keys into property
        for key, value in ui_schema.items():
            prop[key] = value

        properties[field_name] = prop

    schema["properties"] = properties
    return schema
