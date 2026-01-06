# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADAgent is an AI-powered assistant for managing AdMob and Google Ad Manager accounts through natural language. Users can ask questions like "What was my revenue yesterday?" and get instant insights.

## Development Commands

### Start All Services (Recommended)
```bash
cd frontend && npm run dev
```
This runs concurrently:
- Next.js frontend on http://localhost:3000
- Hono API server on http://localhost:3001
- CrewAI agent service on http://localhost:5000

### Individual Services
```bash
# Frontend only
cd frontend && npm run dev:frontend

# API server only
cd backend/api && bun --hot src/index.ts

# Agent service only
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
1. **Frontend** (`frontend/`) - Next.js 16 App Router with React 19
2. **API Server** (`backend/api/`) - Hono + Bun handling auth, billing, chat proxy
3. **Agent Service** (`backend/chat_server.py`) - FastAPI + CrewAI for AI queries

### Data Flow
```
Frontend → API Server → Agent Service → MCP Tools → Google APIs
                ↓
          Neon PostgreSQL (auth, sessions, chat history)
```

### Frontend Structure
- `frontend/src/app/(authenticated)/` - Protected routes (chat, billing, settings)
- `frontend/src/app/(public)/` - Public routes (landing, login, blog)
- `frontend/src/components/` - React components with shadcn/ui
- `frontend/src/lib/api.ts` - API client for backend communication

### API Server Structure (`backend/api/`)
- `src/index.ts` - Hono app entry, middleware, route mounting
- `src/routes/` - Route handlers (chat, billing, providers, webhooks)
- `src/lib/auth.ts` - Better Auth configuration with Google OAuth
- `src/db/schema.ts` - Drizzle ORM schema (users, sessions, providers, messages)
- `src/middleware/` - Auth validation, error handling

### Agent Service Structure
- `backend/chat_server.py` - FastAPI SSE streaming server
- `backend/ad_platform_crew/` - CrewAI agents and factory pattern
  - `factory/agent_factory.py` - Creates platform-specific agents with filtered tools
  - `crew.py` - Main crew definition
  - `tools/` - MCP client wrappers for CrewAI
- `backend/admob_mcp/` - AdMob MCP server (FastMCP)
- `backend/admanager_mcp/` - Google Ad Manager MCP server

### Authentication Flow
- Google OAuth via Better Auth
- Session cookies stored in Neon PostgreSQL
- API validates sessions via middleware
- Agent service validates via API (internal key)

### Provider Connection Flow
- Users connect AdMob/GAM via OAuth in frontend
- Tokens stored encrypted in `connected_providers` table
- Agent service retrieves tokens via API to call Google APIs

## Key Patterns

### MCP Tools Pattern
MCP servers (`admob_mcp`, `admanager_mcp`) expose tools via FastMCP. The agent service uses `MCPClient` to call these tools programmatically during CrewAI task execution.

### Agent Factory Pattern
`AgentFactory` creates CrewAI agents with capability-filtered tool sets (inventory, reporting, mediation) to solve the "too many tools" problem for LLMs.

### SSE Streaming
Agent responses stream via Server-Sent Events from `chat_server.py` to frontend. Events include: routing, agent, thought, tool, tool_result, result, done.

## Environment Variables

### Frontend (`frontend/.env`)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_SANITY_*` - Sanity CMS for blog

### API (`backend/api/.env`)
- `DATABASE_URL` - Neon PostgreSQL connection
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` - Auth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `POLAR_ACCESS_TOKEN` - Billing integration

### Agent (`backend/.env`)
- `ANTHROPIC_API_KEY` - LLM provider
- `API_URL`, `INTERNAL_API_KEY` - API communication
