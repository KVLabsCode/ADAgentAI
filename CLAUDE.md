# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADAgentAI is an AI-powered assistant for managing AdMob and Google Ad Manager accounts through natural language. Users can ask questions like "What was my revenue yesterday?" and get instant insights.

## Development Commands

### Start All Services (Recommended)
```bash
cd frontend && bun run dev
```
This runs concurrently:
- Next.js frontend on http://localhost:3000
- Hono API server on http://localhost:3001
- Chat agent service on http://localhost:5001

### Individual Services
```bash
# Frontend only
cd frontend && bun run dev:frontend

# API server only
cd backend/api && bun --hot src/index.ts

# Chat agent service only
cd backend && uv run python chat_server.py
```

### Testing
```bash
# API tests
cd backend/api && bun run test:run

# Type checking
cd backend/api && bun run typecheck
cd frontend && bun run lint

# E2E tests (Playwright)
cd frontend && bun run test:e2e        # Run all E2E tests
cd frontend && bun run test:e2e:ui     # Run with interactive UI
cd frontend && bun run test:e2e:debug  # Run with debugger
cd frontend && bun run test:e2e:report # View HTML report
```

### E2E Testing Setup
Tests are located in `frontend/tests/e2e/`. To run locally:
1. Start all services: `cd frontend && bun run dev`
2. In another terminal: `cd frontend && bun run test:e2e`

For authenticated tests, set environment variables:
- `PLAYWRIGHT_TEST_EMAIL` - Test account email
- `PLAYWRIGHT_TEST_PASSWORD` - Test account password

### Database Operations
```bash
cd backend/api
bun run db:push      # Push schema changes to Neon
bun run db:generate  # Generate migrations
bun run db:studio    # Open Drizzle Studio
```

## Architecture

### Three-Service Architecture
1. **Frontend** (`frontend/`) - Next.js 16 App Router with React 19 + custom chat UI
2. **API Server** (`backend/api/`) - Hono + Bun handling auth, billing, providers
3. **Chat Agent** (`backend/chat_server.py`) - FastAPI + SSE + LangGraph streaming

### Data Flow
```
Frontend (SSE) → Chat Agent → LangGraph StateGraph → MCP Tools
       ↓
  API Server → Neon PostgreSQL (auth, providers)
```

### Frontend Structure
- `frontend/src/app/(authenticated)/` - Protected routes (chat, billing, settings)
- `frontend/src/app/(public)/` - Public routes (landing, login, blog)
- `frontend/src/app/(authenticated)/layout.tsx` - Auth wrapper with sidebar and header
- `frontend/src/app/(authenticated)/chat/page.tsx` - Custom chat UI with SSE streaming
- `frontend/src/components/` - React components with shadcn/ui

### API Server Structure (`backend/api/`)
- `src/index.ts` - Hono app entry, middleware, route mounting
- `src/routes/` - Route handlers (billing, providers, webhooks)
- `src/lib/auth.ts` - Better Auth configuration with Google OAuth
- `src/db/schema.ts` - Drizzle ORM schema (users, sessions, providers)
- `src/middleware/` - Auth validation, error handling

### Chat Agent Structure
- `backend/chat_server.py` - Main FastAPI server with SSE streaming
- `backend/chat/` - Modular chat package:
  - `graph/` - LangGraph StateGraph implementation
    - `state.py` - State definition
    - `nodes/` - Graph nodes (router, entity_loader, specialist)
    - `edges.py` - Conditional routing logic
    - `checkpointer.py` - PostgresSaver for state persistence
  - `streaming/` - SSE events, stream state, main processor
  - `approval/` - Tool approval system (dangerous tools, human-in-loop)
  - `utils/` - Helpers (providers, text parsing)
- **MCP Tools**: Unified server `backend/mcp_servers/server.py` (FastMCP) with 252 tools across 9 networks.
- **Specs**: `backend/api_specs/` (OpenAPI 3.0 & Google Discovery).

### Authentication Flow
- Google OAuth via Better Auth
- Session cookies stored in Neon PostgreSQL
- API validates sessions via middleware

### Provider Connection Flow
- Users connect AdMob/GAM via OAuth in frontend
- Tokens stored encrypted in `connected_providers` table

## Key Patterns

### SSE Streaming Pattern
Frontend uses custom chat UI with SSE (Server-Sent Events) for streaming.
Backend streams LangGraph execution via SSE with interleaved events:
- `routing` - Query classification result
- `agent` - Agent transitions
- `thought` - Agent thinking/reasoning
- `tool` - Tool calls (with approval for dangerous tools)
- `tool_result` - Tool execution results
- `tool_approval_required` - Dangerous tool awaiting user approval
- `result` - Final response
- `done` - Stream complete

### Tool Approval Pattern (Human-in-Loop)
Dangerous tools (create/update/delete operations) require user approval:
1. LangGraph graph detects dangerous tool via interrupt()
2. Emits `tool_approval_required` SSE event with approval_id
3. Frontend shows approval UI (Allow/Deny buttons)
4. User clicks → POST `/chat/approve-tool`
5. Graph resumes, tool executes or is denied

### MCP Tools Pattern
MCP servers (`admob_mcp`, `admanager_mcp`) expose tools via FastMCP.

### Query Classification
Lightweight LLM call classifies user queries to route to appropriate specialists (admob/inventory, admob/reporting, admanager/orders, etc.)

## Environment Variables

### Frontend (`frontend/.env`)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_CHAT_URL` - Chat agent URL (default: http://localhost:5000)
- `NEXT_PUBLIC_SANITY_*` - Sanity CMS for blog

### Backend (`backend/.env`) - Shared by API and Agent
- `DATABASE_URL` - Neon PostgreSQL connection
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` - Auth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `POLAR_ACCESS_TOKEN` - Billing integration
- `ANTHROPIC_API_KEY` - LLM provider
- `API_URL` - API server URL (default: http://localhost:3001)
- `INTERNAL_API_KEY` - Shared key for agent → API communication

## Design System

### Overview

The project uses a comprehensive design system with:
- **W3C DTCG tokens** - Industry-standard design tokens format
- **Atomic Design** - Components organized as atoms/molecules/organisms
- **Linear-inspired UI** - Clean, professional aesthetic inspired by Linear's design
- **Bidirectional Figma sync** - Edit tokens in code or Figma

### Quick Commands
```bash
cd frontend
bun run tokens:build    # Generate CSS from tokens
bun run tokens:watch    # Watch mode (auto-rebuild)
```

### Token Architecture (Three-Tier)
```
Primitives (raw values) → Semantic (theme-aware) → Components (UI-specific)
```

**Token files:**
```
frontend/tokens/
├── primitives/    # colors, spacing, typography, radius, shadow, motion
├── semantic/      # dark.tokens.json, light.tokens.json
└── style-dictionary.config.mjs
```

**Generated output:**
- `src/styles/tokens.css` - CSS custom properties
- `src/styles/tokens-dark.css` - Dark theme overrides
- `src/styles/tokens-light.css` - Light theme overrides
- `src/styles/tokens.json` - JSON for JavaScript

### Component Organization (Atomic Design)
```
frontend/src/components/
├── atoms/        # Button, Input, Badge, Label, Checkbox, Switch
├── molecules/    # Card, Dialog, Select, Tabs, Accordion, Dropdown
├── organisms/    # Sidebar, DataTable, Tool, ChainOfThought
└── features/     # chat/, billing/, settings/, admin/
```

**Import pattern:**
```tsx
import { Button } from "@/atoms/button"
import { Card } from "@/molecules/card"
import { Sidebar } from "@/organisms/sidebar"
```

### Design Documentation
- `docs/design-system.md` - Full design system guide
- `docs/figma-integration.md` - Figma setup with Tokens Studio
- `docs/linear-theme-migration.md` - Using Linear theme tokens
- `docs/theme.md` - Semantic color tokens and usage
- `frontend/docs/design-tokens.md` - W3C DTCG token system guide

## Code Style

See documentation for detailed guidelines:
- `docs/separation-of-concerns.md` - Component/hook patterns
- `docs/theme.md` - Semantic color tokens and usage
- `docs/design-system.md` - Full design system guide
- `docs/component-patterns.md` - Compound components, CVA variants

### Quick Reference

**Separation of Concerns**: Components render UI, hooks handle logic. Extract when 3+ state variables.

**Design Tokens**: Use semantic tokens like `--tokenAccentDefault`, `--tokenSuccessDefault`. Never hardcode colors.

**File Size**: Pages < 200 lines, Components < 300 lines, Hooks < 150 lines.

**Accessibility**: All icon buttons need `sr-only` labels. Use `transition-colors` instead of `transition-all`.

**Organization Context**: Pass `selectedOrganizationId` to API calls:
```tsx
const { selectedOrganizationId } = useUser()
await authFetch('/api/endpoint', token, {}, selectedOrganizationId)
```

