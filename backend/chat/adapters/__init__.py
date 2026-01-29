"""Pydantic adapters for transforming between UI and API formats.

Adapters handle bidirectional transformation:
- UI flat fields → API nested structure (create/update)
- API response → UI flat fields (display in approval forms)

Schema generation provides:
- JSON Schema from Pydantic models
- RJSF UI Schema with widget hints
- Combined schemas for approval forms
"""

from .mediation import (
    MediationGroupAdapter,
    BiddingLineUI,
    WaterfallLineUI,
    AdUnitMapping,
)
from .schema import (
    UIHints,
    ToolUIConfig,
    TOOL_UI_REGISTRY,
    get_tool_ui_config,
    generate_json_schema,
    generate_ui_schema,
    generate_rjsf_schema,
    merge_ui_hints_into_schema,
)

__all__ = [
    # Mediation adapter
    "MediationGroupAdapter",
    "BiddingLineUI",
    "WaterfallLineUI",
    "AdUnitMapping",
    # Schema generation
    "UIHints",
    "ToolUIConfig",
    "TOOL_UI_REGISTRY",
    "get_tool_ui_config",
    "generate_json_schema",
    "generate_ui_schema",
    "generate_rjsf_schema",
    "merge_ui_hints_into_schema",
]
