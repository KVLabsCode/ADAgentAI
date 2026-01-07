# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADAgentAI is an AI-powered assistant for managing AdMob and Google Ad Manager accounts through natural language. Users can ask questions like "What was my revenue yesterday?" and get instant insights.

## Development Commands

### Start All Services (Recommended)
```bash
cd frontend && npm run dev
```
This runs concurrently:
- Next.js frontend on http://localhost:3000
- Hono API server on http://localhost:3001
- Chat agent service on http://localhost:5000

### Individual Services
```bash
# Frontend only
cd frontend && npm run dev:frontend

# API server only
cd backend/api && bun --hot src/index.ts

# Chat agent service only
cd backend && python chat_server.py
```

### Testing
```bash
# API tests
cd backend/api && bun run test:run

# Type checking
cd backend/api && bun run typecheck
cd frontend && npm run lint
```

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
3. **Chat Agent** (`backend/chat_server.py`) - FastAPI + SSE + CrewAI streaming

### Data Flow
```
Frontend (SSE) → Chat Agent → CrewAI Agents → MCP Tools
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
- `backend/chat_server.py` - Main FastAPI server (~150 lines)
- `backend/chat/` - Modular chat package:
  - `streaming/` - SSE events, stream state, main processor
  - `approval/` - Tool approval system (dangerous tools, human-in-loop)
  - `routing/` - Query classification and routing
  - `hooks/` - CrewAI @before_tool_call and @after_tool_call
  - `crew/` - CrewAI crew builder
  - `utils/` - Helpers (providers, text parsing)
- `backend/ad_platform_crew/` - CrewAI agents and factory pattern
  - `factory/agent_factory.py` - Creates platform-specific agents
  - `tools/` - MCP client wrappers for CrewAI
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
Backend streams CrewAI execution via SSE with interleaved events:
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
1. Stream detects dangerous tool in CrewAI output
2. Emits `tool_approval_required` SSE event with approval_id
3. Frontend shows approval UI (Allow/Deny buttons)
4. User clicks → POST `/chat/approve-tool`
5. Hook unblocks, tool executes or is denied

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

