# Logic Mapping: Current vs. Plan
Date: 2026-01-24

## CURRENT
This section documents the logic currently implemented in the codebase for handling parameters, entity dependencies, and UI rendering.

### 1. Parameter Mapping & Structure Translation
*   **UI -> API Packaging (mediation groups only):** The `tool_executor` node transforms AdMob mediation group inputs into API shape (merges `bidding_lines` + `waterfall_lines` into `mediation_group_lines`, builds `targeting`, converts `cpm_floor` to micros).
*   **API -> UI Unpacking (approvals):** If tool args arrive in API shape (e.g., `mediation_group_lines`), they are split back into `bidding_lines` and `waterfall_lines` for the approval form UI.
*   **Params Wrapper (scoped):** Only mediation group tools are auto-wrapped in a `params` object for MCP calls. Other tools pass args through as-is.

### 2. Cascading Dependencies (`dependsOn` + `filterBy`)
*   **Dynamic Fetching:** UI widgets use `ui:options.fetchType` to request entity lists; `dependsOn` drives structural dependencies (clears child when parent changes).
*   **Filter Dependencies:** `ui:options.filterBy` enables parent filters (e.g., platform/ad_format/app_id) without forcing a clear.
*   **Frontend Source-of-Truth (today):** If `dependsOn` isn�t provided, widgets infer parent relationships from `ENTITY_RELATIONSHIPS` (frontend entity-config). Entity fetching/caching is centralized in `EntityDataProvider`.

### 3. Entity Resolution & Name Rendering
*   **Primary UI Labels:** The frontend resolves most IDs via cached entity options (EntityDataProvider) and renders names directly.
*   **Backend Enrichment (scoped):** For mediation group approvals, backend adds `_ad_source_name`, `_ad_source_valid`, and `_resolved_ad_units` so widgets can show friendly names and invalid states.
*   **Enriched State:** These underscore-prefixed fields are injected into graph state to aid UI display without polluting LLM prompts.

### 4. Validation Guardrails
*   **General Validation:** `validate_entity_references` checks common entity IDs (regex + available accounts/apps), with soft/strict modes.
*   **Resolver-Based Validation (mediation groups):** Ad source/ad unit IDs are validated via entity resolver before approval/execution.

## IN PLAN: Declarative Logic & Mapping Registry
This section outlines the shift from hardcoded procedural transformations to a configuration-driven architecture to handle the scale of 250+ tools.

### 1. Pydantic-Driven Transformation Engine
*   **The Concept:** Replace manual `_transform_mediation_params` functions with **Pydantic Adapter Models** that validate UI inputs and serialize to API shape.
*   **Implementation:** Use `@model_validator` to validate/normalize (must return `self`), and `@model_serializer` (or aliases + `model_dump(by_alias=True)`) to emit API payloads.
*   **Code Pattern:**
    ```python
    class MediationGroupAdapter(BaseModel):
        # UI Flat Fields
        display_name: str
        bidding_lines: list[BiddingLineUI]
        waterfall_lines: list[WaterfallLineUI]

        @model_validator(mode="after")
        def validate_ui(self) -> "MediationGroupAdapter":
            # Validate required lines, formats, etc.
            return self

        @model_serializer(mode="plain")
        def to_api(self) -> dict:
            return {
                "displayName": self.display_name,
                "mediationGroupLines": [...],  # merge + convert to micros
                "targeting": {...},
            }
    ```

### 2. Manual Mapping Registry (Config Domain)
*   **The Concept:** A centralized "Logic Domain" where admins/developers can configure tool behaviors without touching core agent code.
*   **Implementation:** A `tool_registry.json` or YAML file that maps MCP tool names to their adapter, resolution rules, and UI format hints.
*   **Code Pattern (Registry):**
    ```json
    {
      "admob_create_mediation_group": {
        "adapter": "MediationGroupAdapter",
        "resolution_rules": ["account_id", "ad_unit_ids"],
        "ui_format": "waterfall_split",
        "params_wrapper": true
      }
    }
    ```

### 3. Unified Entity Dependency & Resolution Registry (Recommended)
*   **The Concept:** One shared registry that drives both Backend validation and Frontend dependency inference.
*   **Manual Configuration:** Define dependencies in a single manifest (JSON/YAML) with parent, id pattern, display field, and resolver.
*   **Implementation:** Generate TS + Python from the same registry so `ENTITY_RELATIONSHIPS` and backend validators never drift.
    ```python
    ENTITY_DEPENDENCIES = {
        "ad_units": {"parent": "accounts", "fetcher": "admob_list_ad_units"},
        "placements": {"parent": "networks", "fetcher": "admanager_list_placements"}
    }
    ```

### 4. Configurable Resolution Middleware
*   **The Concept:** Move ID-to-name resolution into a middleware layer keyed off the registry.
*   **Workflow:**
    1. Tool Call arrives.
    2. System checks the **Manual Mapping Registry**.
    3. If `resolution_rules` exist, the **Middleware** resolves names and marks invalid IDs.
    4. The **Adapter Model** validates and serializes the final payload.
*   **Benefit:** Agent nodes stay reasoning-focused; the "Mapping Domain" handles ad-tech munging via configuration.

### 5. Frontend Form Strategy (Real Upgrade)
*   **Recommendation:** Evaluate JSON Forms as a true upgrade over RJSF. It offers a dedicated UI schema plus a rules engine for conditional visibility/enabling, which maps cleanly to existing `showWhen`, `dependsOn`, and `filterBy` logic.
*   **Why JSON Forms:** Built-in UI schema rules reduce custom widget branching while keeping JSON Schema as the source of truth.
*   **Uniforms as alternate:** Good if you want more control but it requires schema bridges and custom logic for conditional UI.
*   **RJSF note:** `dependencies`/`oneOf` can reduce `showWhen` logic, but it�s incremental rather than a real upgrade.
