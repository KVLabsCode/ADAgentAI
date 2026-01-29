# ADAgentAI Proposed Agent Architecture Diagram

## Graph Overview (Mermaid)
```mermaid
flowchart TB
  %% Actors / Entry Points
  U[User] --> UI["Frontend UI<br/>(SSE, approvals, resume)"]
  UI --> API["backend/chat_server.py<br/>/chat/stream, /approve-tool, /resume"]

  %% Orchestrator
  subgraph ORCH[Orchestrator Graph]
    OG["goal + context<br/>planner"] --> RC["router<br/>(capability classifier)"]
    RC --> SEL{delegate to specialist}
    SYN["synthesizer<br/>(merge results)"]
  end

  %% Specialist agents
  subgraph SA1[Specialist Agent: Inventory]
    A1["entity_loader<br/>(accounts/apps)"] --> A1TR["tool_retriever<br/>(semantic shortlist)"] --> A1SP["specialist prompt<br/>+ tool binding"] --> EX
  end
  subgraph SA2[Specialist Agent: Mediation]
    A2["scenario builder<br/>(mediation plan)"] --> NET{target network?}
    NET --> NA["network adapter<br/>(rules/fields/policies)"]
    NA --> A2TR["tool_retriever<br/>(semantic shortlist)"] --> A2SP["specialist prompt<br/>+ tool binding"] --> EX
  end
  subgraph SA3[Specialist Agent: QA]
    A3["validation rules<br/>(policy + checks)"] --> A3TR["tool_retriever<br/>(semantic shortlist)"] --> A3SP["specialist prompt<br/>+ tool binding"] --> EX
  end
  subgraph SA4[Specialist Agent: Docs]
    A4["doc retrieval<br/>(RAG)"] --> A4TR["tool_retriever<br/>(semantic shortlist)"] --> A4SP["specialist prompt<br/>+ tool binding"] --> EX
  end

  SEL -- "Accounts/Inventory" --> A1
  SEL -- "Mediation/Setup" --> A2
  SEL -- "QA/Policy" --> A3
  SEL -- "Help/Docs" --> A4

  %% Tool runtime (shared)
  subgraph RT[Tool Runtime]
    EX[tool_executor]
    EX --> PC{preconditions ok?}
    PC -- no --> STOP["stop + explain<br/>(missing data)"]
    PC -- yes --> AP{needs approval?}
    AP -- yes --> INT["interrupt()<br/>approval form"]
    INT --> RES[resume]
    RES --> EX
    AP -- no --> CALL[execute MCP tool]
    CALL --> EX
    EX --> RET["tool result"]
  end

  %% Persistence
  ORCH <--> CK[(PostgresSaver<br/>Neon Postgres)]
  RT <--> CK

  %% MCP Tooling
  subgraph MCP[MCP Tooling]
    CALL --> M1[MCP Server: AdMob]
    CALL --> M2[MCP Server: Ad Manager]
    CALL --> M3[MCP Server: AppLovin]
    CALL --> M4[MCP Server: Unity]
    CALL --> M5[MCP Server: Liftoff]
    CALL --> M6[MCP Server: Mintegral]
    CALL --> M7[MCP Server: InMobi]
    CALL --> M8[MCP Server: Pangle]
    CALL --> M9[MCP Server: DTExchange]
  end

  %% Output
  RET --> SYN
  SYN --> RESP["final response<br/>+ summary"]
  RESP --> API --> UI --> U

  %% Failure / Retry / Override
  STOP --> OV{developer override?}
  OV -- yes --> INT
  OV -- no --> UI
```

## Flow Notes (concise)
- Orchestrator routes to specialist agents (Inventory, Mediation, QA, Docs).
- Network adapter applies network-specific schemas/policies before tool retrieval.
- Each specialist performs tool retrieval before LLM binding.
- Shared tool runtime enforces preconditions, retry policy, and stop rules.
- interrupt() used for approvals and controlled user edits; resume continues graph.
- PostgresSaver (Neon) persists state across agents for resume/retry and restarts.
- MCP servers provide tool surface; progress notifications can stream to UI.

## Tool Binding with MCP Tools (filtered by task + network)
```python
# Uses your MCP loader + real tool names (from approval/models.py)
from langchain_anthropic import ChatAnthropic
from backend.chat.tools.loader import get_tools_for_service

MEDIATION_TOOL_ALLOWLIST = {
    "admob": {
        "admob_create_mediation_group",
        "admob_update_mediation_group",
        "admob_create_mediation_ab_experiment",
        "admob_stop_mediation_ab_experiment",
        "admob_create_ad_unit_mapping",
        "admob_batch_create_ad_unit_mappings",
    }
}

def _filter_tools_for_task(tools: list, service: str, task: str) -> list:
    if task == "mediation":
        allow = MEDIATION_TOOL_ALLOWLIST.get(service, set())
        return [t for t in tools if t.name in allow]
    return tools

async def build_mediation_llm(service: str, user_id: str):
    tools = await get_tools_for_service(service, user_id)
    tools = _filter_tools_for_task(tools, service, "mediation")
    llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=8192)
    return llm.bind_tools(tools)
```

## Failure & Control Branches
- Deterministic failure in prerequisites => stop + explain, require user action.
- Retryable failures => bounded retries, then user confirmation.
- Developer override path can open create forms even if prerequisites are missing.
