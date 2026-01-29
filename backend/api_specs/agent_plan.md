# Agent Architecture & Mapping Design Plan
Date: 2026-01-23

## 1) Research & Pattern Selection
Based on the scale of 250+ tools and the complexity of ad-tech data mapping, the following patterns have been selected to replace hardcoded procedural logic.

### 1.1 Selected Pattern: Registry-Driven Middleware (RDM)
Instead of centralizing all logic in a "Tool Executor" or "Specialist," we shift to a **Declarative Registry**. This allows us to define "Data Contracts" for each network without touching the core Agent code.

*   **Pattern Components:**
    *   **Tool Registry:** A configuration-based manifest (YAML/JSON) mapping tool names to mapping rules.
    *   **Pydantic Adapters:** Strongly-typed models that handle data transformation via validators.
    *   **LangGraph Command Flow:** Using `Command` objects to hand off control between "Reasoning" nodes and "Mapping" nodes.

### 1.2 Comparison of Approaches
| Approach | Scalability | Maintenance | Latency |
| :--- | :--- | :--- | :--- |
| **Current (Procedural)** | Low (Manual functions) | Hard (Code bloat) | Low |
| **Hierarchical MAS** | High (Delegation) | Medium (Many agents) | High (Coordination) |
| **Registry-Driven (RDM)** | **High (Config entries)** | **Easy (Centralized)** | **Low (Middleware)** |

## 2) The "Mapping Logic" Domain
The following architecture is proposed for the "Logic Domain" (the parts that handle parameter mapping, entity dependencies, and UI rendering).

### 2.1 The Tool Registry (`tool_registry.yml`)
A manually configurable domain where developers define how a tool should "behave" in the UI and how its data should be "packed" for the API.

```yaml
# Example: Unified Mapping Rule
admob_create_mediation_group:
  adapter: "AdMobMediationAdapter"
  ui_format: "waterfall_split"
  dependencies:
    - field: "ad_unit_ids"
      depends_on: "account_id"
      fetch_type: "ad_units"
  enrichment:
    - "ad_source_id" -> "ad_source_name"
```

### 2.2 Pydantic Transformation Adapters
Each tool or network group gets an `Adapter` class. These handle the impedance mismatch between "Flat UI" and "Nested API."

```python
class AdMobMediationAdapter(BaseModel):
    # UI Schema (Flat)
    account_id: str
    bidding_lines: List[BiddingLine]
    waterfall_lines: List[WaterfallLine]
    
    @model_validator(mode="after")
    def pack_for_api(self):
        # Deterministic logic: 
        # 1. Merge bidding/waterfall
        # 2. Convert Euros to Micros
        # 3. Format as 'mediationGroupLines'
        return {
            "params": {
                "account_id": self.account_id,
                "mediation_group_lines": combined_lines
            }
        }
```

### 2.3 Cascading Entity Registry
A single source of truth for entity relationships. This registry drives both the Backend `entity_resolver` and the Frontend `dependsOn` logic.

```python
ENTITY_REGISTRY = {
    "ad_units": {
        "parent": "account_id",
        "resolver": "admob_accounts_adUnits_list",
        "display_field": "displayName"
    },
    "unity_placements": {
        "parent": "project_id",
        "resolver": "unity_placements_list",
        "display_field": "name"
    }
}
```

## 3) User Experience & Bidding Logic
To handle the "Bidding Logic Normalization" without losing the specific terms users expect:

*   **Display Logic:** The Registry defines `ui_labels`. For example, `cpm_mode: LIVE` is rendered as **"Real-time Bidding (LIVE)"** in the UI.
*   **Manual Overrides:** The Registry allows for manual field overrides. If a specific network uses "Placements" instead of "Ad Units," the registry maps that label for that specific tool only.

## 4) Implementation Roadmap
1.  **Define Core Registry:** Create the JSON/YAML structure for tool behaviors.
2.  **Refactor `tool_executor`:** Replace `_transform_mediation_params` with a generic `Registry.get_adapter(tool_name)`.
3.  **Middleware Injection:** Implement a LangGraph node that automatically enriches any tool call with readable names based on the `ENTITY_REGISTRY`.
4.  **Frontend Sync:** Expose the `ENTITY_REGISTRY` via a metadata endpoint so the frontend forms are generated automatically without duplicate code.
