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
- Chat agent service on http://localhost:5000

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
- `frontend/src/app/(authenticated)/layout.tsx` - Wraps with `<CopilotKit runtimeUrl={...}>`
- `frontend/src/app/(authenticated)/chat/page.tsx` - Uses `<CopilotChat />` component
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
- `backend/admob_mcp/` - AdMob MCP server (FastMCP)
- `backend/admanager_mcp/` - Google Ad Manager MCP server

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
- `NEXT_PUBLIC_COPILOTKIT_URL` - CopilotKit agent URL (default: http://localhost:5000/copilotkit)
- `NEXT_PUBLIC_SANITY_*` - Sanity CMS for blog

### API (`backend/api/.env`)
- `DATABASE_URL` - Neon PostgreSQL connection
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` - Auth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `POLAR_ACCESS_TOKEN` - Billing integration

### Agent (`backend/.env`)
- `ANTHROPIC_API_KEY` - LLM provider
- `API_URL`, `INTERNAL_API_KEY` - API communication

