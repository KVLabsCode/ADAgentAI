# ADAgentAI Agent Architecture Proposal

**Author:** Claude
**Date:** 2026-01-24
**Based on:** [agent_research_2026-01-23.md](backend/api_specs/agent_research_2026-01-23.md)

---

## Executive Summary

This document proposes a production-grade agent architecture for ADAgentAI that addresses the core challenges identified in the research:

1. **~283 tools across 9 ad networks** - Too many tools degrade LLM selection accuracy
2. **Multi-step workflows** - Complex operations (create mediation group) require precondition validation
3. **Write operation safety** - Destructive actions need human approval with full context
4. **Schema fragmentation** - Each network uses different terminology (bidding vs waterfall, cpm_mode vs is_bidding)
5. **Reliability at scale** - Need loop control, error classification, and graceful degradation

The proposed architecture uses a **Hierarchical Supervisor + Domain Specialists** pattern with **two-layer tool routing** and **workflow-agent hybrid** execution.

---

## System Architecture Overview

```mermaid
flowchart TB
    %% Entry Points
    U[User] --> UI["Frontend UI<br/>(Chat, Context Settings, Approvals)"]
    UI --> API["chat_server.py<br/>/chat/stream, /approve-tool"]

    %% Orchestrator Graph (Dual-Path Routing - research §11.2)
    subgraph ORCH["Orchestrator Graph"]
        ROUTER["Router Node<br/>(classify query)"]
        ROUTER --> PATH{query type?}
        PATH -->|"status check,<br/>simple lookup"| REACTIVE["Reactive Path<br/>(low-latency ~2-5s)"]
        PATH -->|"multi-step,<br/>write operation"| WORKFLOW["Workflow Path<br/>(plan-execute-verify)"]

        %% Auto-Model Selection
        subgraph MODEL["Auto-Model Selection"]
            REACTIVE -->|select| HAIKU["Haiku<br/>(fast, cheap)"]
            WORKFLOW -->|select| SONNET["Sonnet<br/>(balanced)"]
        end

        SYNTH["Synthesizer<br/>(merge results)"]
    end

    API --> ROUTER

    %% Entity & Tool Loading
    subgraph LOADING["Context Loading"]
        EL["Entity Loader<br/>(accounts, apps, ad units)"]
        TR["Tool Retriever<br/>(semantic shortlist)"]
        EL --> TR
    end

    HAIKU --> EL
    SONNET --> EL

    %% Specialist Agents (6 total)
    subgraph SPECS["Specialist Agents"]
        subgraph SP_REP["Reporting Specialist"]
            REP_PROMPT["specialist prompt<br/>+ tool binding"]
        end
        subgraph SP_INV["Inventory Specialist"]
            INV_PROMPT["specialist prompt<br/>+ tool binding"]
        end
        subgraph SP_MED["Mediation Specialist"]
            MED_ADAPTER["network adapter<br/>(schema rules)"]
            MED_ADAPTER --> MED_PROMPT["specialist prompt<br/>+ tool binding"]
        end
        subgraph SP_ORD["Orders Specialist<br/>(AdManager)"]
            ORD_PROMPT["specialist prompt<br/>+ tool binding"]
        end
        subgraph SP_TGT["Targeting Specialist<br/>(AdManager)"]
            TGT_PROMPT["specialist prompt<br/>+ tool binding"]
        end
        subgraph SP_DOC["Docs Specialist<br/>(RAG)"]
            DOC_PROMPT["pgvector search<br/>+ tool binding"]
        end
    end

    TR -->|reporting| REP_PROMPT
    TR -->|inventory| INV_PROMPT
    TR -->|mediation| MED_ADAPTER
    TR -->|orders| ORD_PROMPT
    TR -->|targeting| TGT_PROMPT
    TR -->|docs| DOC_PROMPT

    %% Shared Tool Runtime
    subgraph RUNTIME["Tool Runtime (shared)"]
        EXEC["tool_executor"]
        EXEC --> PRECON{preconditions ok?}
        PRECON -->|no| STOP["STOP + explain<br/>(missing data)"]
        PRECON -->|yes| APPROVE{needs approval?}
        APPROVE -->|yes| INT["interrupt()<br/>show approval form"]
        INT --> RESUME["resume<br/>(user approved)"]
        RESUME --> CALL
        APPROVE -->|no| CALL["execute MCP tool"]
        CALL --> RESULT["tool result"]
        RESULT --> VERIFY["Verifier Node<br/>(check vs intent)"]
        VERIFY -->|incomplete| EXEC
        VERIFY -->|success| SYNTH
    end

    REP_PROMPT --> EXEC
    INV_PROMPT --> EXEC
    MED_PROMPT --> EXEC
    ORD_PROMPT --> EXEC
    TGT_PROMPT --> EXEC
    DOC_PROMPT --> EXEC

    %% MCP Servers
    subgraph MCP["MCP Tooling (283 tools)"]
        CALL --> M1["AdMob<br/>19 tools"]
        CALL --> M2["AdManager<br/>154 tools"]
        CALL --> M3["AppLovin<br/>20 tools"]
        CALL --> M4["Unity<br/>24 tools"]
        CALL --> M5["+ 5 more networks"]
    end

    %% Persistence
    subgraph DB["Neon PostgreSQL"]
        CK["PostgresSaver<br/>(checkpoints)"]
        TOKENS["connected_providers<br/>(encrypted tokens)"]
        ENTITIES["entities cache<br/>(accounts, apps)"]
    end

    ORCH <--> CK
    RUNTIME <--> CK
    EL --> ENTITIES
    CALL -.->|fetch token| TOKENS

    %% Output flow
    SYNTH --> RESP["Final Response<br/>+ summary"]
    RESP --> API
    API -->|SSE stream| UI
    UI --> U

    %% Failure paths
    STOP --> OVERRIDE{developer override?}
    OVERRIDE -->|yes| INT
    OVERRIDE -->|no| UI
    INT -->|denied| STOP
```

### Dual-Path Routing (Research §11.2)

The router node classifies queries and selects one of two execution paths based on complexity and latency requirements. Each path auto-selects the appropriate model:

| Path | Model | Latency | When Used | Example Queries |
|------|-------|---------|-----------|-----------------|
| **Reactive** | Haiku | ~2-5s | Status checks, simple lookups, read-only queries | "What was my revenue yesterday?", "List my ad units" |
| **Workflow** | Sonnet | ~10-30s | Multi-step operations, write actions, optimization, analysis | "Create a mediation group", "Optimize my mediation setup" |

**Path selection criteria:**
- **Reactive** → Haiku: Single tool call, no writes, no approval needed
- **Workflow** → Sonnet: Multiple tools, writes, precondition checks, or complex analysis

This approach ensures low latency for simple queries while reserving compute for complex ones. Auto-model selection provides significant cost savings compared to using a single model for all queries.

---

## LangGraph StateGraph Definition

This shows the actual LangGraph nodes and conditional edges as they would be implemented:

```mermaid
stateDiagram-v2
    [*] --> router: user_query

    router --> entity_loader: route determined

    state entity_loader {
        [*] --> fetch_providers
        fetch_providers --> fetch_entities
        fetch_entities --> inject_context
        inject_context --> [*]
    }

    entity_loader --> tool_retriever: entities loaded

    state tool_retriever {
        [*] --> classify_capability
        classify_capability --> embed_query
        embed_query --> pgvector_search
        pgvector_search --> filter_by_provider
        filter_by_provider --> [*]
    }

    tool_retriever --> specialist: tools shortlisted

    state specialist {
        [*] --> build_prompt
        build_prompt --> bind_tools
        bind_tools --> llm_invoke
        llm_invoke --> [*]
    }

    specialist --> has_tool_calls: response

    state has_tool_calls <<choice>>
    has_tool_calls --> tool_executor: yes
    has_tool_calls --> synthesizer: no

    state tool_executor {
        [*] --> check_preconditions
        check_preconditions --> is_dangerous

        state is_dangerous <<choice>>
        is_dangerous --> interrupt: yes (write op)
        is_dangerous --> execute: no (read op)

        interrupt --> execute: approved
        interrupt --> stop_explain: denied

        execute --> handle_result
        handle_result --> [*]
    }

    tool_executor --> verifier: tool result

    state verifier {
        [*] --> compare_intent
        compare_intent --> check_complete
        check_complete --> [*]
    }

    state verifier_decision <<choice>>
    verifier --> verifier_decision
    verifier_decision --> specialist: incomplete (retry)
    verifier_decision --> synthesizer: complete

    synthesizer --> [*]: final response
    stop_explain --> [*]: error response
```

### Graph Nodes

| Node | Function | Input | Output |
|------|----------|-------|--------|
| `router` | Classify intent, complexity, service | user_query | routing dict |
| `entity_loader` | Load user's accounts, apps | user_id | entities in state |
| `tool_retriever` | Shortlist tools via pgvector | capability tag | tool list |
| `specialist` | LLM with bound tools | prompt + tools | response or tool_calls |
| `tool_executor` | Execute MCP tools | tool_calls | tool_results |
| `verifier` | Check result vs intent | tool_results | pass/retry/fail |
| `synthesizer` | Merge results, format response | all results | final response |

### Conditional Edges

```python
# Conditional routing after specialist
def route_after_specialist(state):
    if state.get("tool_calls"):
        return "tool_executor"
    return "synthesizer"

# Conditional routing after verifier
def route_after_verifier(state):
    if state.get("verification_status") == "incomplete":
        return "specialist"  # retry with more context
    return "synthesizer"

# Build the graph
graph = StateGraph(GraphState)
graph.add_node("router", router_node)
graph.add_node("entity_loader", entity_loader_node)
graph.add_node("tool_retriever", tool_retriever_node)
graph.add_node("specialist", specialist_node)
graph.add_node("tool_executor", tool_executor_node)
graph.add_node("verifier", verifier_node)
graph.add_node("synthesizer", synthesizer_node)

graph.add_edge("router", "entity_loader")
graph.add_edge("entity_loader", "tool_retriever")
graph.add_edge("tool_retriever", "specialist")
graph.add_conditional_edges("specialist", route_after_specialist)
graph.add_edge("tool_executor", "verifier")
graph.add_conditional_edges("verifier", route_after_verifier)
graph.add_edge("synthesizer", END)
```

---

## Tool Routing Strategy

```mermaid
flowchart LR
    subgraph Input
        Query["User Query<br/>'What was my AdMob revenue?'"]
    end

    subgraph LayerA["Layer A: Capability Classifier"]
        Intent["Extract Intent"]
        Domain["Identify Domain"]
        Tag["Capability Tag"]
        Intent --> Domain --> Tag
    end

    subgraph LayerB["Layer B: Tool Retriever"]
        Embed["Embed Query"]
        Vector["pgvector Search"]
        TopK["Top 10-15 Tools"]
        Embed --> Vector --> TopK
    end

    subgraph Binding["LLM Tool Binding"]
        Bind["Bind selected tools only"]
        Call["LLM selects & calls"]
    end

    Query --> LayerA
    LayerA -->|"admob/reporting"| LayerB
    LayerB --> Binding

    subgraph Stats["Result"]
        Before["283 tools → 10-15 tools"]
        Accuracy["Selection accuracy: 95%+"]
    end

    Binding --> Stats
```

### Capability Tags

| Intent Keywords | Capability Tag | Networks |
|-----------------|----------------|----------|
| revenue, report, earnings, performance | `reporting` | All 9 |
| mediation group, waterfall, bidding | `mediation` | AdMob, AppLovin, Unity |
| ad unit, placement, app, site | `inventory` | All 9 |
| line item, order, creative, trafficking | `orders` | AdManager |
| target, geo, device, audience, segment | `targeting` | AdManager |
| live stream, content, video, cms | `content` | AdManager |
| experiment, A/B test, variant | `experiments` | AdMob, AppLovin |
| help, how to, documentation | `docs` | RAG |

---

## Domain Specialists

Based on actual MCP tool audit (~283 tools across 9 providers):

```mermaid
flowchart TB
    subgraph Specialists["8 Specialists + Documentation"]
        subgraph Row1["All Networks"]
            Reporting["Reporting<br/>~30 tools<br/>All 9 Networks"]
            Inventory["Inventory<br/>~80 tools<br/>All 9 Networks"]
            Accounts["Accounts<br/>~25 tools<br/>All Networks"]
        end
        subgraph Row2["Mediation Networks"]
            Mediation["Mediation<br/>~35 tools<br/>AdMob, AppLovin, Unity"]
            Experiments["Experiments<br/>~10 tools<br/>AdMob, AppLovin"]
        end
        subgraph Row3["AdManager Only"]
            Orders["Orders<br/>~40 tools<br/>AdManager"]
            Targeting["Targeting<br/>~50 tools<br/>AdManager"]
            Content["Content/Live<br/>~20 tools<br/>AdManager"]
        end
        subgraph Row4["RAG"]
            Docs["Documentation<br/>pgvector"]
        end
    end
```

### Tool Distribution by Provider

| Provider | Tools | Primary Capabilities |
|----------|-------|----------------------|
| **AdManager** | 154 | Orders, LineItems, Targeting, Content, Placements |
| **Unity** | 24 | Apps, AdUnits, Mediation Groups, Placements |
| **DT Exchange** | 22 | Apps, Placements, Instances, Reports |
| **AppLovin** | 20 | AdUnits, Waterfall, Experiments, Reports |
| **AdMob** | 19 | Mediation, AdUnits, Apps, A/B Experiments |
| **Mintegral** | 12 | Apps, Placements, AdUnits, Reports |
| **InMobi** | 11 | Apps, Placements, Reports |
| **Pangle** | 11 | Apps, AdSlots, Reports |
| **Liftoff** | 10 | Apps, Placements, Reports |
| **Total** | **~283** | |

### Specialist Mapping

| Specialist | Tools | Networks | Example Operations |
|------------|-------|----------|-------------------|
| **Reporting** | ~30 | All 9 | `mediationReport.generate`, `get_max_report`, `get_monetization_report` |
| **Inventory** | ~80 | All 9 | `adUnits.*`, `apps.*`, `placements.*`, `sites.*` |
| **Accounts** | ~25 | All | `accounts.list`, `networks.list`, `teams.*`, `users.*` |
| **Mediation** | ~35 | AdMob, AppLovin, Unity | `mediationGroups.*`, `waterfall_segment.*`, `mediation_group_v2.*` |
| **Experiments** | ~10 | AdMob, AppLovin | `mediationAbExperiments.*`, `*_experiment` |
| **Orders** | ~40 | AdManager | `lineItems.*`, `orders.*`, `creativeTemplates.*` |
| **Targeting** | ~50 | AdManager | `geoTargets.*`, `customTargetingKeys.*`, `audienceSegments.*` |
| **Content** | ~20 | AdManager | `liveStreamEvents.*`, `content.*`, `contentBundles.*` |
| **Docs** | RAG | N/A | pgvector search over ad network documentation |

---

## Schema Adapter Layer

```mermaid
flowchart TB
    subgraph Standard["Standard Mediation Model"]
        Model["type: BIDDING | WATERFALL<br/>priority: number<br/>cpm: number<br/>network: string"]
    end

    subgraph Adapters["Network Adapters (Bidirectional)"]
        AdMob["AdMob Adapter<br/>cpm_mode: LIVE/MANUAL/ANO"]
        AppLovin["AppLovin Adapter<br/>is_bidding: true/false"]
        Unity["Unity Adapter<br/>placement.type: HEADER_BIDDING"]
        Mintegral["Mintegral Adapter"]
        Liftoff["Liftoff Adapter"]
        InMobi["InMobi Adapter"]
        Pangle["Pangle Adapter"]
        DTX["DT Exchange Adapter"]
        GAM["Ad Manager Adapter"]
    end

    Standard <--> AdMob
    Standard <--> AppLovin
    Standard <--> Unity
    Standard <--> Mintegral
    Standard <--> Liftoff
    Standard <--> InMobi
    Standard <--> Pangle
    Standard <--> DTX
    Standard <--> GAM
```

---

## Provider Connection & OAuth

Users must connect their ad network accounts before tools become available. Each network requires its own OAuth flow.

```mermaid
flowchart TD
    subgraph Frontend["Frontend: Provider Settings"]
        Connect["Connect Provider Button"]
        OAuth["OAuth Redirect"]
        Callback["OAuth Callback"]
        Store["Store Tokens"]
    end

    subgraph Backend["Backend: Token Storage"]
        Encrypt["Encrypt Token<br/>(AES-256)"]
        Neon["Neon DB<br/>connected_providers table"]
    end

    subgraph Networks["9 Ad Networks"]
        direction LR
        N1["AdMob<br/>Google OAuth"]
        N2["AdManager<br/>Google OAuth"]
        N3["AppLovin<br/>API Key"]
        N4["Unity<br/>Service Account"]
        N5["Mintegral<br/>API Key"]
        N6["Liftoff<br/>API Key"]
        N7["InMobi<br/>API Key"]
        N8["Pangle<br/>API Key"]
        N9["DT Exchange<br/>API Key"]
    end

    Connect --> OAuth
    OAuth --> Networks
    Networks --> Callback
    Callback --> Encrypt
    Encrypt --> Neon
    Store --> Neon
```

### Provider Connection Status

| Network | Auth Type | Token Storage | Entity Sync |
|---------|-----------|---------------|-------------|
| **AdMob** | Google OAuth 2.0 | Encrypted refresh token | Accounts, Apps, Ad Units |
| **AdManager** | Google OAuth 2.0 | Encrypted refresh token | Networks, Sites, Placements |
| **AppLovin** | API Key + Secret | Encrypted API key | Ad Units, Apps |
| **Unity** | Service Account JSON | Encrypted key file | Apps, Placements, Groups |
| **Mintegral** | API Key + Secret | Encrypted credentials | Apps, Placements |
| **Liftoff** | API Key | Encrypted API key | Apps, Placements |
| **InMobi** | API Key + Secret | Encrypted credentials | Apps, Placements |
| **Pangle** | API Key + Secret | Encrypted credentials | Apps, Ad Slots |
| **DT Exchange** | API Key | Encrypted API key | Apps, Placements |

---

## Tool Scoping by Connected Providers

Tools are **only available** for networks the user has connected. This prevents errors and reduces tool list size.

```mermaid
flowchart TD
    Query["User Query"] --> LoadProviders["Load Connected Providers<br/>from Neon"]

    LoadProviders --> Check{"Which networks<br/>connected?"}

    Check -->|"AdMob ✓"| AdMobTools["Enable AdMob tools<br/>(19 tools)"]
    Check -->|"AdManager ✓"| GAMTools["Enable AdManager tools<br/>(154 tools)"]
    Check -->|"AppLovin ✓"| ALTools["Enable AppLovin tools<br/>(20 tools)"]
    Check -->|"Unity ✓"| UnityTools["Enable Unity tools<br/>(24 tools)"]
    Check -->|"Not connected"| Disabled["Tools DISABLED<br/>for this network"]

    AdMobTools --> Merge["Merge enabled tools"]
    GAMTools --> Merge
    ALTools --> Merge
    UnityTools --> Merge

    Merge --> Bind["Bind to LLM<br/>(only enabled tools)"]

    Disabled --> Explain["If user asks about<br/>unconnected network →<br/>Explain & prompt to connect"]
```

### Tool Availability Rules

| Scenario | Behavior |
|----------|----------|
| User has AdMob connected | AdMob tools (19) available |
| User has AdMob + Unity connected | AdMob (19) + Unity (24) = 43 tools available |
| User asks about AppLovin but not connected | Agent explains: "You need to connect AppLovin first" |
| User has no providers connected | No tools available, agent prompts to connect |

### Implementation: Tool Filtering

```python
# In specialist node - filter tools by connected providers
PROVIDER_TOOL_PREFIXES = {
    "admob": "admob_",
    "admanager": "admanager_",
    "applovin": "applovin_",
    "unity": "unity_",
    "mintegral": "mintegral_",
    "liftoff": "liftoff_",
    "inmobi": "inmobi_",
    "pangle": "pangle_",
    "dtexchange": "dtexchange_",
}

def filter_tools_by_connected_providers(tools, connected_providers):
    """Only return tools for networks user has connected."""
    enabled_prefixes = [
        PROVIDER_TOOL_PREFIXES[p]
        for p in connected_providers
        if p in PROVIDER_TOOL_PREFIXES
    ]
    return [t for t in tools if any(t.name.startswith(p) for p in enabled_prefixes)]
```

---

## Context Settings (Soft/Strict Mode)

Users can control which accounts are in scope via **Context Settings** in the UI.

```mermaid
flowchart LR
    subgraph UI["Context Settings Panel"]
        Mode["Mode Toggle<br/>Soft / Strict"]
        Accounts["Account Checkboxes<br/>☑ AdMob Account 1<br/>☐ AdMob Account 2<br/>☑ GAM Network 1"]
    end

    subgraph Agent["Agent Behavior"]
        Soft["SOFT MODE<br/>• Prefer enabled accounts<br/>• Allow explicit references to others<br/>• Flexible scope"]
        Strict["STRICT MODE<br/>• ONLY use enabled accounts<br/>• Block references to disabled<br/>• Enforce boundaries"]
    end

    Mode -->|"Soft"| Soft
    Mode -->|"Strict"| Strict

    Accounts --> Filter["Filter entities<br/>in system prompt"]
    Filter --> Agent
```

### Context Mode Behavior

| Mode | User says "my account" | User says "account X" (disabled) | Tool calls |
|------|------------------------|----------------------------------|------------|
| **Soft** | Uses first enabled account | Allowed if explicit | Any connected provider |
| **Strict** | Uses first enabled account | Blocked with explanation | Only enabled accounts |

### Entity Injection into System Prompt

```
## Available Entities
STRICT MODE: Only use accounts/entities explicitly enabled by the user.

### Connected Accounts & Apps
- My AdMob Account (admob): pub-1234567890 ✓ ENABLED
  - App: Puzzle Game (ANDROID) - ID: ca-app-pub-xxx~yyy
  - App: Puzzle Game (IOS) - ID: ca-app-pub-xxx~zzz
- Test Account (admob): pub-0987654321 (DISABLED - not in scope)
- Production Network (gam): 12345678 ✓ ENABLED

IMPORTANT: Only use these REAL account and app IDs. Never invent IDs.
```

---

## Entity Grounding (Preventing Hallucinated IDs)

The agent must use **real** account/app/ad unit IDs. Entity grounding prevents the LLM from inventing fake IDs.

```mermaid
flowchart TD
    subgraph EntityLoader["Entity Loader Node"]
        Fetch["Fetch from API<br/>/api/internal/entities"]
        Transform["Transform to unified format"]
        Inject["Inject into GraphState"]
    end

    subgraph Grounding["Entity Grounding"]
        SystemPrompt["Add to System Prompt<br/>• Account list<br/>• App list with IDs<br/>• Enabled/disabled status"]
        Validation["Tool Input Validation<br/>• Check account_id exists<br/>• Check app_id exists<br/>• Reject unknown IDs"]
    end

    subgraph Behavior["Agent Behavior"]
        Valid["ID in entity list →<br/>Proceed with tool call"]
        Invalid["ID NOT in list →<br/>STOP & ask user"]
        Guess["LLM tries to guess ID →<br/>Validation catches it"]
    end

    EntityLoader --> Grounding
    SystemPrompt --> Valid
    SystemPrompt --> Invalid
    Validation --> Guess
```

### Entity Data Flow

| Stage | Data | Source |
|-------|------|--------|
| **1. Load** | User's connected providers | `connected_providers` table |
| **2. Fetch** | Accounts, apps, ad units | Each provider's API |
| **3. Cache** | 5-minute server-side cache | Redis/Neon |
| **4. Inject** | Entity list in system prompt | GraphState |
| **5. Validate** | Tool inputs against known IDs | Tool Executor |

---

## Safety & Error Handling

```mermaid
flowchart TD
    ToolCall["Tool Call Initiated"] --> Precondition

    subgraph Precondition["Precondition Validation"]
        Check1["Account exists?"]
        Check2["App exists?"]
        Check3["Required entities loaded?"]
        Check4["Permissions valid?"]
    end

    Precondition -->|All Pass| WriteCheck{Write Operation?}
    Precondition -->|Any Fail| StopExplain["STOP & Explain<br/>No tool execution"]

    WriteCheck -->|No| Execute["Execute Immediately"]
    WriteCheck -->|Yes| Approval

    subgraph Approval["Human-in-the-Loop"]
        ShowForm["Show Approval Form<br/>• Operation summary<br/>• Editable params<br/>• Warnings"]
        Wait["interrupt() → Wait"]
        ShowForm --> Wait
    end

    Wait -->|Allow| Execute
    Wait -->|Deny| StopExplain
    Wait -->|Edit| ShowForm

    Execute --> Result{Result?}

    Result -->|Success| Done["Stream Result"]
    Result -->|Error| ErrorClass{Error Type?}

    ErrorClass -->|"5xx, timeout,<br/>rate limit"| Retry["Auto-retry<br/>max 3x with backoff"]
    ErrorClass -->|"400, 403, 404,<br/>validation"| StopExplain
    ErrorClass -->|"Same error 2x"| ForceConfirm["Force Human Confirmation"]

    Retry --> Execute
    ForceConfirm --> Approval
```

---

## Security: Just-in-Time Token Injection

```mermaid
flowchart LR
    subgraph Agent["Agent Context"]
        State["Graph State<br/>(NO tokens stored)"]
        Intent["Tool Intent"]
    end

    subgraph Executor["Tool Executor"]
        Resolve["Resolve user_id + provider"]
        Fetch["Fetch token from Neon<br/>(encrypted, short-lived)"]
        Inject["Inject into MCP call"]
        Execute["Execute tool"]
        Wipe["Wipe token from memory"]
    end

    subgraph Neon["Neon DB"]
        Tokens["connected_providers<br/>(encrypted tokens)"]
    end

    Agent --> Executor
    Resolve --> Fetch
    Fetch --> Neon
    Neon --> Inject
    Inject --> Execute
    Execute --> Wipe
```

**Security Principles:**
- Tokens are **never** stored in graph state or prompts
- Retrieved **immediately before** MCP execution
- **Wiped from memory** after tool completes
- All tokens encrypted at rest in Neon

---

## Advanced Reasoning: MCTS for Complex Decisions

For high-stakes optimization requests (e.g., "Optimize my mediation setup"), the Supervisor can use **Monte Carlo Tree Search (MCTS)** to simulate outcomes before acting.

```mermaid
flowchart TD
    Query["Complex optimization request"] --> Detect{High-stakes?}

    Detect -->|No| Normal["Standard execution path"]
    Detect -->|Yes| MCTS

    subgraph MCTS["MCTS Simulation"]
        Simulate["Simulate multiple tool sequences"]
        Evaluate["Evaluate predicted outcomes"]
        Select["Select highest-value path"]
    end

    MCTS --> Plan["Execute winning plan"]
    Plan --> Verify["Verify against predictions"]
```

**When to use MCTS:**
- Mediation optimization (bidding vs waterfall tradeoffs)
- Revenue impact predictions
- Multi-network configuration changes

**When NOT to use:**
- Simple queries (use Reactive path)
- Single tool calls
- Time-sensitive operations

---

## Memory Architecture

```mermaid
flowchart LR
    subgraph Neon["Neon PostgreSQL"]
        subgraph Memory["Four Memory Types"]
            ShortTerm["Short-Term<br/>━━━━━━━━━━<br/>• Entity context<br/>• Tool buffers<br/>• Current turn<br/>━━━━━━━━━━<br/>TTL: Turn"]

            Episodic["Episodic<br/>━━━━━━━━━━<br/>• Reasoning history<br/>• Checkpoints<br/>• Resume points<br/>━━━━━━━━━━<br/>TTL: Session"]

            Semantic["Semantic<br/>━━━━━━━━━━<br/>• Tool docs (pgvector)<br/>• Query cache<br/>• Ad network docs<br/>━━━━━━━━━━<br/>TTL: 1-24h"]

            LongTerm["Long-Term<br/>━━━━━━━━━━<br/>• User preferences<br/>• Account mappings<br/>• Benchmarks<br/>• Failed paths<br/>━━━━━━━━━━<br/>TTL: Permanent"]
        end

        Checkpointer["AsyncPostgresSaver<br/>• Thread isolation<br/>• Serverless pooling<br/>• Fault tolerance"]
    end
```

---

## Auto-Model Selection

The architecture supports **dynamic model selection at runtime** based on execution path. This optimizes cost (using cheaper models for simple tasks) while ensuring quality (using capable models for complex workflows).

```mermaid
flowchart TB
    subgraph Router["Router Node"]
        Classify["Classify Query"]
        Path{Execution Path?}
        Classify --> Path
    end

    subgraph ModelSelector["Model Selector"]
        Path -->|Reactive| Fast["Claude Haiku<br/>Fast, cheap<br/>~2-5s latency"]
        Path -->|Workflow| Balanced["Claude Sonnet<br/>Balanced<br/>~10-30s latency"]
    end

    subgraph Execution["Specialist Execution"]
        Fast --> Spec1["Specialist Node<br/>(bound to Haiku)"]
        Balanced --> Spec2["Specialist Node<br/>(bound to Sonnet)"]
    end
```

### Model Selection Criteria

| Execution Path | Default Model | When Used | Cost/1M tokens |
|----------------|---------------|-----------|----------------|
| **Reactive** | Claude Haiku | Status checks, simple lookups, read-only | ~$0.25 |
| **Workflow** | Claude Sonnet | Multi-step, writes, optimization, analysis | ~$3.00 |

### LangGraph Implementation

Using LangGraph's `configurable_alternatives` pattern for runtime model switching:

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.runnables import ConfigurableField

# Define model with configurable alternatives
model = ChatAnthropic(
    model="claude-3-5-haiku-20241022"  # Default: fast model
).configurable_alternatives(
    ConfigurableField(id="model_tier"),
    default_key="haiku",
    sonnet=ChatAnthropic(model="claude-sonnet-4-20250514"),
)

# Model selection based on execution path
MODEL_BY_PATH = {
    "reactive": "haiku",
    "workflow": "sonnet",
}

def get_model_config(execution_path: str) -> dict:
    """Return config dict for model selection."""
    return {"configurable": {"model_tier": MODEL_BY_PATH.get(execution_path, "sonnet")}}
```

### Integration with StateGraph

```python
from langgraph.graph import StateGraph

class GraphState(TypedDict):
    messages: list
    execution_path: str  # "reactive" | "workflow"
    model_tier: str      # Derived from execution_path
    # ... other state fields

def router_node(state: GraphState) -> GraphState:
    """Classify query and determine execution path + model tier."""
    # Lightweight classification (always uses Haiku)
    classification = classify_query(state["messages"][-1])

    execution_path = classification["path"]  # reactive/workflow
    model_tier = MODEL_BY_PATH[execution_path]

    return {
        **state,
        "execution_path": execution_path,
        "model_tier": model_tier,
    }

def specialist_node(state: GraphState, config: RunnableConfig) -> GraphState:
    """Execute specialist with dynamically selected model."""
    # Model is automatically selected based on config
    response = model.with_config(
        configurable={"model_tier": state["model_tier"]}
    ).invoke(state["messages"])

    return {**state, "messages": state["messages"] + [response]}

# Build graph with config schema for model selection
graph = StateGraph(GraphState, config_schema=ConfigSchema)
graph.add_node("router", router_node)
graph.add_node("specialist", specialist_node)
# ... add edges
```

### Alternative: init_chat_model (Simpler)

For simpler setups, use LangChain's `init_chat_model` which allows model switching via config string:

```python
from langchain.chat_models import init_chat_model

# Create a model that can be configured at runtime
configurable_model = init_chat_model(configurable_fields="model", temperature=0)

# Use different models via config
configurable_model.invoke(
    messages,
    config={"configurable": {"model": "claude-3-5-haiku-20241022"}}
)

configurable_model.invoke(
    messages,
    config={"configurable": {"model": "claude-sonnet-4-20250514"}}
)
```

### Model Escalation Pattern

For workflows where the initial model fails, implement **model escalation** - start with Haiku and escalate to Sonnet if needed:

```mermaid
flowchart TD
    Start["Query Received"] --> Try1["Try with Haiku"]
    Try1 --> Check1{Success?}
    Check1 -->|Yes| Done["Return Result"]
    Check1 -->|"No (confidence < 0.7)"| Try2["Escalate to Sonnet"]
    Try2 --> Done
```

```python
async def escalating_specialist(state: GraphState) -> GraphState:
    """Try cheaper model first, escalate if confidence is low."""
    escalation_chain = ["haiku", "sonnet"]

    for tier in escalation_chain:
        response = await model.with_config(
            configurable={"model_tier": tier}
        ).ainvoke(state["messages"])

        # Check confidence/completeness
        if response.confidence >= 0.7 or tier == "sonnet":
            return {**state, "messages": state["messages"] + [response]}

    return state  # Fallback
```

### Cost Optimization Impact

| Query Type | Before (Sonnet Only) | After (Auto-Model) | Savings |
|------------|----------------------|--------------------|---------|
| Simple status check | $0.003 | $0.00025 | **92%** |
| Multi-step workflow | $0.003 | $0.003 | 0% |
| **Average query** | $0.003 | ~$0.0015 | **~50%** |

---

## User Journey: Simple Query (Reactive)

```mermaid
sequenceDiagram
    participant U as User
    participant S as Supervisor
    participant R as Tool Retriever
    participant Spec as Reporting Specialist
    participant MCP as MCP Server

    U->>S: "What was my AdMob revenue yesterday?"

    Note over S: Classify: admob/reporting/reactive

    S->>R: Get relevant tools
    R-->>S: [get_admob_report] (from 252)

    S->>Spec: Execute query
    Spec->>MCP: get_admob_report(yesterday)
    MCP-->>Spec: $1,234.56

    Spec-->>U: "Your AdMob revenue yesterday was $1,234.56, up 12% from the day before."

    Note over U,MCP: Total latency: ~3 seconds
```

---

## User Journey: Multi-Step Write (Workflow)

```mermaid
sequenceDiagram
    participant U as User
    participant S as Supervisor
    participant V as Validator
    participant Spec as Mediation Specialist
    participant A as Approval Gate
    participant MCP as MCP Server

    U->>S: "Create mediation group for Puzzle Game with AppLovin and Unity"

    Note over S: Classify: admob/mediation/workflow<br/>Plan: validate → get_units → get_sources → create

    S->>V: Validate preconditions
    V->>MCP: Check account, app, ad units, ad sources
    MCP-->>V: All preconditions met
    V-->>S: Ready to proceed

    S->>Spec: Prepare create payload
    Note over Spec: Normalize via Schema Adapter

    Spec->>A: interrupt() - Request approval

    A->>U: Show approval form
    Note over A: App: Puzzle Game<br/>Networks: AppLovin (Bidding), Unity (Bidding)<br/>[Allow] [Deny] [Edit]

    U->>A: Click "Allow"

    A->>MCP: create_mediation_group(payload)
    MCP-->>A: Success: group_id=12345

    A-->>U: "Created mediation group 'Puzzle Game Bidding' with AppLovin and Unity."

    Note over U,MCP: Total latency: ~15 seconds (including approval)
```

---

## User Journey: Failure Recovery

```mermaid
sequenceDiagram
    participant U as User
    participant S as Supervisor
    participant V as Validator

    U->>S: "Create an ad unit for my new app"

    Note over S: Classify: admob/inventory/workflow

    S->>V: Validate preconditions
    V-->>S: FAIL - No apps found in account

    Note over S: Do NOT attempt tool execution

    S-->>U: "I can't create an ad unit because no apps are registered.<br/><br/>To fix this:<br/>1. Register your app in AdMob console, or<br/>2. Connect a different account<br/><br/>Would you like me to show you how?"

    Note over U,V: No tool execution attempted
```

---

## SSE Streaming Events

```mermaid
flowchart LR
    subgraph Events["SSE Event Types"]
        direction TB
        routing["routing<br/>Query classification"]
        status["status<br/>Progress updates"]
        agent["agent<br/>Specialist transitions"]
        thought["thought<br/>Reasoning (optional)"]
        tool["tool<br/>Tool call initiated"]
        tool_result["tool_result<br/>Execution result"]
        approval["tool_approval_required<br/>Write approval needed"]
        error["error<br/>Error occurred"]
        result["result<br/>Final response"]
        done["done<br/>Stream complete"]
    end
```

| Event | Purpose | Example Payload |
|-------|---------|-----------------|
| `routing` | Query classification | `{ domain: "admob", intent: "reporting" }` |
| `status` | Granular progress | `{ label: "Fetching ad units..." }` |
| `tool` | Tool call started | `{ name: "get_admob_report", params: {...} }` |
| `tool_approval_required` | Write approval | `{ approval_id: "...", form: {...} }` |
| `result` | Response chunk | `{ content: "Your revenue was..." }` |

---

## Implementation Phases

```mermaid
gantt
    title Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Core
    Supervisor node           :p1a, 2026-01-27, 5d
    Three execution paths     :p1b, after p1a, 3d
    Tool routing layer        :p1c, after p1a, 5d
    pgvector setup            :p1d, after p1c, 2d

    section Phase 2: Safety
    Domain specialists        :p2a, after p1d, 5d
    Precondition validation   :p2b, after p2a, 3d
    Error classification      :p2c, after p2b, 3d
    Schema adapters (top 3)   :p2d, after p2b, 4d

    section Phase 3: Scale
    All 9 network adapters    :p3a, after p2d, 5d
    Tool result caching       :p3b, after p3a, 3d
    Status streaming          :p3c, after p3b, 2d
    Self-improving prompts    :p3d, after p3c, 3d

    section Phase 4: Harden
    Load testing              :p4a, after p3d, 3d
    Retrieval tuning          :p4b, after p4a, 2d
    Monitoring & alerts       :p4c, after p4b, 3d
    Documentation             :p4d, after p4c, 2d
```

---

## Key Metrics

| Metric | Target | Purpose |
|--------|--------|---------|
| Tool selection accuracy | >95% | Right tools chosen |
| First-tool success rate | >80% | Reduce retries |
| Approval → completion | >90% | Write success |
| Latency (reactive) | <5s | UX |
| Latency (workflow) | <30s | UX |
| Precondition block rate | <10% | Data quality |

---

## Architecture Decisions: Why This Design?

This architecture synthesizes ideas from multiple sources:

| Feature | Source | Why Included |
|---------|--------|--------------|
| **Verifier Node** | Gemini | Quality gate prevents hallucinations, catches incomplete results |
| **Documentation Specialist** | Codex | RAG-based help reduces need for external docs |
| **MCTS for optimization** | Gemini | Simulate before acting on high-stakes decisions |
| **Just-in-Time Tokens** | Gemini | Security best practice - never store creds in state |
| **Two-layer tool routing** | All | Consensus: 252 tools needs semantic filtering |
| **Network adapters** | Codex | Schema normalization before tool selection |
| **Human-in-the-loop** | All | Consensus: Write ops need approval |
| **Three execution paths** | Original | Optimize latency by query complexity |
| **9 specialists** | Enhanced | Cover all ad-tech domains + documentation |

### What We Chose NOT to Include

| Rejected Idea | Source | Why Rejected |
|---------------|--------|--------------|
| Single monolithic graph | - | Too complex, hard to test |
| Tool allowlists only | Codex | Too rigid, semantic retrieval more flexible |
| Separate reactive agent | Gemini | Unified graph with path selection simpler |

---

## Finalized Architecture Components

Summary of all architecture decisions organized by implementation phase:

| Component | Phase 1 | Phase 2 | Phase 3 | Description |
|-----------|:-------:|:-------:|:-------:|-------------|
| **6 Specialists** | ✅ | | | Reporting, Inventory, Mediation, Orders, Targeting, Docs |
| **2 Execution Paths** | ✅ | | | Reactive (fast) + Workflow (multi-step) |
| **4 Memory Types** | ✅ | | | Short-term, Episodic, Semantic, Long-term |
| **Verifier Node** | ✅ | | | Quality gate after tool execution |
| **Auto-Model Selection** | ✅ | | | Haiku (reactive) / Sonnet (workflow) based on path |
| **pgvector Retrieval** | ✅ | | | Semantic tool search (283 → 10-15 tools) |
| **Schema Adapters** | | ✅ | | Network-specific schema normalization |
| **Failure Logging** | ✅ | | | Track failed paths for improvement |
| **Self-Improving Prompts** | | | ✅ | Learn from failure patterns |
| **Optimization Recommendations** | | | ✅ | MCTS-based suggestions for high-stakes decisions |

### Auto-Model Selection Summary

The auto-model feature uses LangGraph's `configurable_alternatives` to dynamically select the appropriate model:

- **Reactive Path** → Claude Haiku (fast, cheap, ~$0.25/1M tokens)
- **Workflow Path** → Claude Sonnet (balanced, ~$3.00/1M tokens)

Estimated **~50% cost savings** compared to using Sonnet for all queries.

---

## References

- [LangGraph Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangChain Tool Selection](https://python.langchain.com/docs/how_to/tool_calling/#built-in-tool-selection)
- [LangChain configurable_alternatives](https://python.langchain.com/docs/how_to/configure/) - Runtime model selection
- [LangGraph Runtime Configuration](https://langchain-ai.github.io/langgraphjs/how-tos/configuration/) - config_schema patterns
- [MCP Architecture](https://modelcontextprotocol.io/specification/architecture)
- [Anthropic Multi-Agent Systems](https://www.anthropic.com/news/multi-agent-systems)
- [Full case study analysis](backend/api_specs/agent_research_2026-01-23.md)

### Internal Architecture References
- [codex_idea.md](codex_idea.md) - OpenAI Codex approach (network adapters, QA specialist)
- [gemini_flash_idea.md](gemini_flash_idea.md) - Gemini approach (Verifier node, MCTS, JIT tokens)