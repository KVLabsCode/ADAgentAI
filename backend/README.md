# ADAgentAI Backend

AI-powered ad monetization assistant with LangGraph.

## Components

- **chat/** - LangGraph agent with SSE streaming
- **api/** - Hono API server (auth, billing, providers)
- **admob_mcp/** - AdMob MCP server
- **admanager_mcp/** - Google Ad Manager MCP server

## Setup

```bash
# Install dependencies with uv
uv sync

# Run the chat agent
uv run python chat_server.py
```

## Environment

All environment variables should be in `backend/.env`. See `.env` for required variables.
