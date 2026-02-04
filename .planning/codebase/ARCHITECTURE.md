# Architecture

**Analysis Date:** 2026-02-04

## Pattern Overview

**Overall:** Three-service distributed architecture with SSE streaming and human-in-the-loop approval patterns.

**Key Characteristics:**
- Client-server separation with Next.js frontend and dual backend services
- Event-driven SSE streaming for real-time agent responses
- State machine graph (LangGraph) for complex query workflows
- Tool approval interrupts for dangerous operations (human-in-loop)
- Provider abstraction layer (MCP servers) for 9 ad networks with unified interface

## Layers

**Frontend (Next.js 16):**
- Purpose: User interface, authentication flow, chat UI with SSE streaming
- Location: `frontend/src/app/` (Next.js App Router)
- Contains: Page routes (authenticated/public), React components (atoms/molecules/organisms), hooks for state management
- Depends on: Neon Auth SDK, API server (`/api/`), Chat agent server (`/chat/stream`)
- Used by: End users via browser

**API Server (Hono + Bun):**
- Purpose: Authentication, provider management, billing, webhooks, data persistence
- Location: `backend/api/src/`
- Contains: Route handlers, middleware (auth, error handling), database schema (Drizzle ORM), Neon Auth integration
- Depends on: Neon PostgreSQL (`neon_auth` schema), Neon Auth library, external services (Polar billing)
- Used by: Frontend (authenticated fetch), Chat agent (internal API calls)

**Chat Agent (FastAPI + Python):**
- Purpose: LLM-powered query routing, specialist agents, tool orchestration, SSE streaming
- Location: `backend/chat_server.py` and `backend/chat/` package
- Contains: LangGraph StateGraph, nodes (router/specialist/tool_executor), approval handlers, MCP tool integration
- Depends on: Anthropic Claude API, MCP servers, PostgreSQL for state checkpointing
- Used by: Frontend (SSE /chat/stream endpoint), Tool execution via MCP

**MCP Tool Servers (FastMCP + Python):**
- Purpose: Unified tool interface for 9 ad networks (AdMob, GAM, AppLovin, Unity, Mintegral, Liftoff, InMobi, Pangle, DTExchange)
- Location: `backend/mcp_servers/`
- Contains: Provider-specific tool implementations, curated composite tools, network health checks
- Depends on: Provider APIs (Google APIs, network-specific SDKs), API specs (OpenAPI, Discovery)
- Used by: Chat agent LangGraph nodes via tool execution

## Data Flow

**Chat Query Flow:**

1. Frontend user submits message → SSE connection to `/chat/stream` with session token + org context
2. Chat agent validates user session via token validation
3. Router node classifies query (Claude Haiku) → determines service/capability
4. Entity loader fetches user's connected providers, accounts, apps, ad units
5. Specialist node routes to appropriate MCP tools based on classification
6. Tool retriever matches query to available tools from enabled networks
7. Specialist generates tool calls with LLM (Claude Sonnet)
8. Tool executor runs MCP tools, catches "dangerous" operations → emits `tool_approval_required` SSE event
9. Frontend shows approval UI; user clicks Allow/Deny
10. Graph resumes from interrupt → tool executes (if approved) or denied
11. Specialist synthesizes final response → streams final result via SSE
12. Stream completes with `done` event

**State Management:**

- GraphState (LangGraph TypedDict) flows through all nodes: user context, routing result, tool calls, messages
- State persisted to PostgreSQL via `AsyncPostgresSaver` checkpointer (supports resumption after interrupts)
- Tool calls tracked with status: pending → approved/denied → executed (with results)
- Approval requests stored in files or database, keyed by approval_id, consumed after resolution

**Provider Connection:**

1. User clicks "Connect Provider" on `/providers/[type]` page
2. Frontend redirects to OAuth flow (Google OAuth for AdMob/GAM)
3. Callback handler stores encrypted tokens in `connected_providers` table
4. Chat agent reads from `connected_providers` to list user's accounts/apps/ad units
5. MCP tools use refresh tokens to call provider APIs on user's behalf

## Key Abstractions

**GraphState (LangGraph State):**
- Purpose: Shared state dictionary flowing through all graph nodes
- Examples: `backend/chat/graph/state.py`
- Pattern: TypedDict with Annotated fields for proper reducer merging (via `add`, custom `merge_*` functions)
- Contains: user context, routing result, messages, tool calls, approval requests, error state

**UserContext:**
- Purpose: Encapsulates user identity, connected networks, enabled entities for graph execution
- Examples: `backend/chat/graph/state.py` UserContext TypedDict
- Pattern: Loaded once at graph start by entity_loader node, passed to all downstream nodes
- Contains: user_id, organization_id, connected_networks, enabled_accounts, accounts/apps/ad_units lists

**SSE EventType (Streaming Protocol):**
- Purpose: Type-safe event enum for frontend-backend streaming communication
- Examples: `backend/chat/streaming/events.py` EventType enum
- Pattern: Pydantic models for each event type with proper fields
- Types: routing, agent, thinking, tool, tool_result, tool_approval_required, action_required, content, result, error, done

**MCP Tool Registry:**
- Purpose: Unified interface to 9 ad network providers via FastMCP mount pattern
- Examples: `backend/mcp_servers/server.py` (server.mount() calls)
- Pattern: Master server mounts provider-specific MCPs with prefix (e.g., "admob", "unity")
- Provides: 252+ tools across networks, curated composite tools (e.g., full_unity_admob_integration)

**Neon Auth User Context:**
- Purpose: Authentication context propagated from frontend to backend, includes org selection
- Examples: `backend/api/src/middleware/auth.ts` (NeonAuthUser interface)
- Pattern: Session token validated in middleware, user object injected into Hono context
- Validates: Organization membership (user can't claim org they don't belong to)

## Entry Points

**Frontend (Next.js):**
- Location: `frontend/src/app/layout.tsx` (root), `frontend/src/app/(authenticated)/layout.tsx` (auth wrapper)
- Triggers: Browser navigation, renders layout with Suspense + UserProvider context
- Responsibilities: Auth gate, sidebar/header injection, theme/token setup

**Chat Page (Interactive):**
- Location: `frontend/src/app/(authenticated)/chat/page.tsx`
- Triggers: User navigates to /chat, fetches providers on mount
- Responsibilities: Initializes chat UI with SSE listener, manages chat history, approval UI

**API Server Entry:**
- Location: `backend/api/src/index.ts`
- Triggers: Bun process starts (or Vercel invokes)
- Responsibilities: Middleware setup (CORS, auth, logging, error handling), route mounting, server startup

**Chat Agent Entry:**
- Location: `backend/chat_server.py`
- Triggers: Python process starts
- Responsibilities: FastAPI app creation, CORS setup, lifespan handlers (cleanup), route mounting

**Chat Stream Endpoint:**
- Location: `backend/chat_server.py` POST `/chat/stream`
- Triggers: Frontend calls after user submits chat message
- Responsibilities: Validate session, initialize graph, execute LangGraph with SSE event streaming

## Error Handling

**Strategy:** Layered error handling from frontend to backend with user-friendly messaging.

**Patterns:**

- **Frontend:** AbortError on nav (silently ignore), HTTP errors (show to user), SSE parse errors (logged, ignored)
- **API Server:** HTTPException middleware catches auth/validation errors, returns 401/403/400 with message
- **Chat Agent:** Error state in GraphState stops execution, emits `error` SSE event, catches tool execution failures
- **Tool Execution:** MCP tools may return error results (not throw); tool_executor catches, stores error in tool_call.result
- **Approval Workflow:** Missing approval (404) returned as expired; user shown retry UI

**Cross-layer:**
- Errors don't crash services; they emit events or HTTP responses
- User-facing errors are contextual (e.g., "Connect provider" action_required event vs. 500 error)
- Admin logs captured in Sentry (if configured); observability via initSentry()

## Cross-Cutting Concerns

**Logging:**
- Frontend: console.log/error for dev debugging, structured logs sent to Sentry
- API: Hono logger middleware logs all requests/responses, Sentry integration for errors
- Agent: Python logging in graph nodes, streaming events provide observability

**Validation:**
- Frontend: TypeScript types enforce shape, runtime checks for demo mode
- API: Drizzle ORM + custom validation in middleware, Neon Auth token validation
- Agent: LangGraph state schema (TypedDict) enforces state shape; tool parameter validation via MCP

**Authentication:**
- Neon Auth (Better Auth fork) manages sessions in PostgreSQL
- Token passed in Authorization header (Bearer token format)
- Org membership validated server-side; org context via x-organization-id header
- Demo mode bypasses auth for testing (uses demo user from localStorage)

**Rate Limiting & Quotas:**
- Chat agent has rate limit middleware (backend/chat/middleware/rate_limit.py)
- Approval system prevents tool spam (approval_id must be unique)
- No explicit request rate limits observed (client-side via UI debounce)

**Caching:**
- AdMob cache: `backend/api/src/lib/admob-cache.ts` (in-memory + TTL)
- Chat agent: Cache middleware in `backend/chat/middleware/cache.py`
- Field options: Fetched on-demand, no caching layer visible

---

*Architecture analysis: 2026-02-04*
