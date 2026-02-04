# Codebase Structure

**Analysis Date:** 2026-02-04

## Directory Layout

```
project-root/
├── frontend/                      # Next.js 16 frontend application
│   ├── src/
│   │   ├── app/                  # Next.js App Router (file-based routing)
│   │   │   ├── (authenticated)/  # Protected routes (requires auth)
│   │   │   ├── (public)/         # Public routes (no auth required)
│   │   │   ├── api/              # API route handlers
│   │   │   └── auth/             # Auth-related routes
│   │   ├── components/           # React components (atomic + feature)
│   │   │   ├── atoms/            # Basic UI elements (button, input, badge)
│   │   │   ├── molecules/        # Composite components (card, dialog, select)
│   │   │   ├── organisms/        # Complex components (sidebar, datatable)
│   │   │   ├── chat/             # Chat UI components
│   │   │   └── features/         # Feature modules (billing, settings, admin)
│   │   ├── hooks/                # React hooks for state/logic
│   │   │   ├── chat/             # Chat-specific hooks
│   │   │   └── settings/         # Settings hooks
│   │   ├── contexts/             # React context providers
│   │   ├── lib/                  # Utility libraries
│   │   │   ├── neon-auth/        # Neon Auth client integration
│   │   │   ├── billing/          # Billing utilities
│   │   │   ├── api.ts            # API client (SSE streaming, authFetch)
│   │   │   └── types.ts          # TypeScript interfaces
│   │   └── styles/               # CSS (design tokens, globals)
│   ├── tokens/                   # Design tokens (W3C DTCG format)
│   ├── tests/                    # Playwright E2E tests
│   ├── public/                   # Static assets
│   └── package.json              # Bun dependencies
│
├── backend/                       # Python + TypeScript backend services
│   ├── api/                      # Hono API server (TypeScript, Bun)
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point, middleware setup, route mounting
│   │   │   ├── db/
│   │   │   │   ├── schema.ts     # Drizzle ORM schema (users, sessions, providers, etc.)
│   │   │   │   └── index.ts      # Database client initialization
│   │   │   ├── lib/              # Utilities
│   │   │   │   ├── auth.ts       # Auth helpers (unused, legacy)
│   │   │   │   ├── neon-auth.ts  # Neon Auth validation
│   │   │   │   ├── crypto.ts     # Encryption for provider tokens
│   │   │   │   └── analytics.ts  # Event tracking
│   │   │   ├── middleware/       # Hono middleware
│   │   │   │   ├── auth.ts       # requireAuth, optionalAuth, requireAdmin middlewares
│   │   │   │   └── error-handler.ts # Global error handling
│   │   │   ├── routes/           # Route handlers (mounted on /api)
│   │   │   │   ├── chat.ts       # POST /api/chat (conversation storage)
│   │   │   │   ├── providers.ts  # Provider CRUD, OAuth callbacks
│   │   │   │   ├── billing.ts    # Billing routes
│   │   │   │   ├── blog.ts       # Blog CMS routes
│   │   │   │   ├── agents.ts     # Agent management (admin only)
│   │   │   │   └── admin/        # Admin-only routes
│   │   │   ├── e2e/              # E2E test helpers
│   │   │   └── test/             # Test setup
│   │   └── drizzle.config.ts     # ORM configuration
│   │
│   ├── chat/                     # Python chat package (LangGraph agent)
│   │   ├── __init__.py           # Package exports (stream_chat_response, etc.)
│   │   ├── graph/
│   │   │   ├── state.py          # GraphState TypedDict definition
│   │   │   ├── builder.py        # LangGraph construction, routing logic
│   │   │   ├── nodes/            # Individual graph nodes
│   │   │   │   ├── router.py     # Query classification (Claude Haiku)
│   │   │   │   ├── entity_loader.py # Load user's accounts/apps/ad units
│   │   │   │   ├── specialist.py # Main LLM agent (Claude Sonnet)
│   │   │   │   ├── tool_executor.py # Execute MCP tools
│   │   │   │   ├── tool_retriever.py # Match query to available tools
│   │   │   │   └── verifier.py   # Result verification
│   │   │   └── validators.py     # State validation helpers
│   │   ├── streaming/
│   │   │   ├── events.py         # SSE event type definitions
│   │   │   └── processor.py      # Event streaming & SSE formatting
│   │   ├── approval/
│   │   │   ├── handlers.py       # Approval request storage/retrieval
│   │   │   ├── models.py         # Approval data models
│   │   │   └── schema_extractor.py # Extract editable params from tool schemas
│   │   ├── middleware/           # Graph middleware
│   │   │   ├── cache.py          # Result caching
│   │   │   ├── error.py          # Error handling
│   │   │   └── rate_limit.py     # Rate limiting
│   │   ├── observability/        # Tracing & metrics
│   │   │   ├── tracing.py        # OpenTelemetry integration
│   │   │   └── metrics.py        # Custom metrics
│   │   └── utils/                # Helper functions
│   │       ├── providers.py      # Provider lookup
│   │       └── text_parsing.py   # Text parsing utilities
│   │
│   ├── mcp_servers/              # Model Context Protocol (FastMCP) servers
│   │   ├── server.py             # Master server, mounts all provider MCPs
│   │   ├── providers/            # Provider-specific MCP implementations
│   │   │   ├── admob/            # AdMob tools (reporting, inventory)
│   │   │   ├── admanager/        # Google Ad Manager tools
│   │   │   ├── applovin/         # AppLovin SDK tools
│   │   │   ├── unity/            # Unity LevelPlay tools
│   │   │   ├── mintegral/        # Mintegral tools
│   │   │   ├── liftoff/          # Liftoff Vungle tools
│   │   │   ├── inmobi/           # InMobi tools
│   │   │   ├── pangle/           # Pangle tools
│   │   │   └── dtexchange/       # DT Exchange tools
│   │   ├── visibility.py         # Tool filtering (shows only enabled networks)
│   │   ├── curated_schemas.py    # Schema adjustments for better UX
│   │   └── dependencies.py       # Dependency management for MCP tools
│   │
│   ├── api_specs/                # API specifications (for tool generation)
│   │   ├── admob_v1beta_discovery.json
│   │   └── admanager_v1_discovery.json
│   │
│   ├── shared/                   # Shared utilities (both Python & TS)
│   │   ├── token_service.py      # Token refresh & validation
│   │   └── supported-networks.json # Network configuration
│   │
│   ├── chat_server.py            # FastAPI entry point (SSE streaming server)
│   ├── requirements.txt           # Python dependencies
│   ├── pyproject.toml             # Python project config
│   └── .env                       # Environment variables
│
├── docs/                          # Documentation
│   ├── design-system.md           # Design system guide
│   ├── figma-integration.md       # Figma + tokens sync
│   ├── component-patterns.md      # React component patterns
│   ├── theme.md                   # Semantic color tokens
│   └── separation-of-concerns.md  # Component/hook architecture
│
├── .planning/                     # GSD planning output (generated)
│   └── codebase/                 # Architecture analysis documents
│
├── .github/                       # GitHub Actions CI/CD
│   └── workflows/                # Automated tests, deployments
│
├── CLAUDE.md                      # Project instructions (this file)
├── README.md                      # Project overview
└── package.json                   # Root workspace (if monorepo)
```

## Directory Purposes

**frontend/src/app/(authenticated)/**
- Purpose: Protected routes requiring authentication
- Contains: Chat, dashboard, billing, settings, provider management pages
- Key files: `layout.tsx` (wraps with AuthenticatedLayoutClient), `chat/page.tsx` (main chat UI)

**frontend/src/app/(public)/**
- Purpose: Public routes (landing, login, blog, waitlist)
- Contains: Auth callback handlers, login page, blog with Sanity CMS integration
- Key files: `login/page.tsx`, `auth/callback/page.tsx`, `blog/[slug]/page.tsx`

**frontend/src/components/atoms/**
- Purpose: Base UI building blocks
- Contains: Button, Input, Badge, Checkbox, Switch, Spinner, etc.
- Pattern: No business logic, styled via design tokens, composable

**frontend/src/components/molecules/**
- Purpose: Composite UI components built from atoms
- Contains: Card, Dialog, Select, Tabs, Accordion, Dropdown
- Pattern: Add minor logic (open/close), but remain UI-focused

**frontend/src/components/organisms/**
- Purpose: Complex feature-level components
- Contains: Sidebar, DataTable, ChainOfThought visualization, Tool execution UI
- Pattern: Contains state management, hooks, business logic

**frontend/src/hooks/**
- Purpose: Custom React hooks for state/logic extraction
- Contains: useUser (auth context), useChat (SSE streaming), useBilling, useProviders
- Pattern: Logic extracted when 3+ state variables; return objects with callbacks

**backend/api/src/routes/**
- Purpose: HTTP route handlers mounted on `/api`
- Contains: Hono route definitions, middleware per route, validation
- Pattern: Each file is a router; mounted in `index.ts` via `api.route()`

**backend/chat/graph/nodes/**
- Purpose: Individual LangGraph execution nodes
- Contains: Each node is an async function that processes/updates GraphState
- Pattern: Pure functions (except I/O); state in, state out; checkpointed automatically

**backend/mcp_servers/providers/**
- Purpose: Provider-specific MCP tool implementations
- Contains: Tool definitions (docstrings, parameters, implementation) per network
- Pattern: FastMCP decorators (@server.tool()); tools auto-documented and type-validated

## Key File Locations

**Entry Points:**
- `frontend/src/app/layout.tsx`: Root layout (Suspense, providers)
- `frontend/src/app/(authenticated)/chat/page.tsx`: Main chat interface
- `backend/api/src/index.ts`: Hono API server entry
- `backend/chat_server.py`: FastAPI chat agent server entry

**Configuration:**
- `frontend/.env`: Frontend env vars (NEXT_PUBLIC_API_URL, Sanity config)
- `backend/.env`: Shared backend env vars (DATABASE_URL, auth secrets, API keys)
- `frontend/package.json`: Bun scripts, dependencies
- `backend/requirements.txt`: Python dependencies

**Core Logic:**
- `backend/api/src/middleware/auth.ts`: Authentication validation (Neon Auth)
- `backend/chat/graph/builder.py`: LangGraph state machine definition
- `backend/chat/graph/nodes/router.py`: Query classification (routing)
- `backend/mcp_servers/server.py`: Tool registry (FastMCP mount)

**Testing:**
- `frontend/tests/e2e/`: Playwright E2E tests
- `backend/api/src/e2e/api.e2e.ts`: API integration tests
- `backend/tests/`: Python chat tests

**Database:**
- `backend/api/src/db/schema.ts`: Drizzle ORM tables (users, providers, conversations)
- `backend/api/drizzle.config.ts`: Migration config

**Styling:**
- `frontend/tokens/`: W3C DTCG design tokens (primitives, semantic, component)
- `frontend/src/styles/`: Generated CSS (tokens.css, theme overrides)
- Component classes use CSS custom properties (--tokenAccentDefault, etc.)

## Naming Conventions

**Files:**
- React components: PascalCase (`ChatContainer.tsx`)
- Hooks: camelCase starting with `use` (`useUser.ts`, `useChat.ts`)
- Utilities: camelCase, descriptive (`api.ts`, `storage.ts`, `demo-user.ts`)
- Tests: filename.test.ts or filename.spec.ts

**Directories:**
- Feature modules: kebab-case plural (`components/chat/`, `backend/chat/`)
- Atomic design: atoms, molecules, organisms (lowercase)
- API routes: kebab-case matching HTTP paths (`routes/ad-sources.ts` → `/api/ad-sources`)

**Types:**
- Interfaces: PascalCase (UserContext, GraphState, StreamEvent)
- Enums: PascalCase (EventType, ActionType, ProviderType)
- Type aliases: PascalCase (Provider, User, Organization)

**Functions:**
- Async operations: camelCase verb prefix (authFetch, streamChat, fetchFieldOptions)
- Node functions: noun descriptive (router_node, entity_loader_node, tool_executor_node)
- Middleware: requireAuth, optionalAuth, requireAdmin pattern

**Constants:**
- UPPERCASE_SNAKE_CASE (FRONTEND_URL, DATABASE_URL, ORG_STORAGE_KEY)

## Where to Add New Code

**New Feature:**
- Primary code: `backend/api/src/routes/[feature].ts` (API endpoint) + `frontend/src/app/(authenticated)/[feature]/` (page)
- State management: Add context or hook in `frontend/src/contexts/` or `frontend/src/hooks/`
- Tests: `frontend/tests/e2e/[feature].spec.ts` or `backend/api/src/routes/[feature].test.ts`

**New Component/Module:**
- Implementation: `frontend/src/components/[category]/[ComponentName].tsx`
- Export: Re-export in barrel file `frontend/src/components/[category]/index.ts` (if pattern followed)
- Usage: Import from `@/[category]/ComponentName`

**New MCP Tool Provider:**
- Location: `backend/mcp_servers/providers/[network_name]/` (new directory)
- Implementation: `__init__.py` with FastMCP server and tool decorators
- Mount: Add to `backend/mcp_servers/server.py` via `server.mount(...)`
- Spec: Add OpenAPI/Discovery spec file if available, reference in code

**New Graph Node:**
- Location: `backend/chat/graph/nodes/[node_name].py`
- Definition: Async function taking GraphState, returning updated GraphState
- Wiring: Register in `backend/chat/graph/builder.py` (graph.add_node, add_edge)

**Utilities:**
- Shared (Frontend + Backend): `frontend/src/lib/` (TS) or `backend/shared/` (Python)
- Frontend only: `frontend/src/lib/[domain]` (billing, neon-auth, etc.)
- Backend API only: `backend/api/src/lib/` (auth, crypto, analytics)
- Chat Agent only: `backend/chat/utils/` (provider lookup, text parsing)

**Database:**
- Schema changes: Edit `backend/api/src/db/schema.ts`
- Migration: Run `bun run db:generate` to create migration
- Apply: `bun run db:push` to update Neon database

## Special Directories

**frontend/.next/**
- Purpose: Next.js build output (TypeScript, server components, static optimizations)
- Generated: Yes (created during `bun run build`)
- Committed: No (.gitignore)

**backend/.langgraph_api/**
- Purpose: LangGraph Studio checkpointing (local development state storage)
- Generated: Yes (created by LangGraph runtime)
- Committed: No (.gitignore)

**frontend/tokens/primitives/ and semantic/**
- Purpose: Design token source files (JSON, W3C DTCG format)
- Generated: No (manually edited in Figma or code)
- Committed: Yes (source of truth for design system)

**frontend/src/styles/tokens.css**
- Purpose: Generated CSS custom properties from tokens
- Generated: Yes (`bun run tokens:build`)
- Committed: No (regenerated from tokens/)

**backend/.venv/ and .venv-studio/**
- Purpose: Python virtual environments
- Generated: Yes (created by `uv` or `python -m venv`)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-02-04*
