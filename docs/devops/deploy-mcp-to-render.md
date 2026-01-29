# Deploy AdMob MCP Server to Render

## Context
The AdMob MCP server (`backend/admob_mcp/`) already supports HTTP transport via FastMCP's `streamable_http`. We need to deploy it to Render so it can be used with LangSmith Agent Builder.

## Current State
- MCP server code: `backend/admob_mcp/server.py`
- Already supports: `TRANSPORT=http PORT=8000 python -m admob_mcp.server`
- Endpoint: `/mcp` (streamable HTTP)

## Tasks

### 1. Add Render MCP to Claude Code
```bash
claude mcp add --transport http render https://mcp.render.com/mcp --header "Authorization: Bearer <RENDER_API_KEY>"
```
Get API key from: https://dashboard.render.com/settings#api-keys

### 2. Create render.yaml for the MCP Server
Create `backend/admob_mcp/render.yaml`:
```yaml
services:
  - type: web
    name: admob-mcp-server
    runtime: python
    buildCommand: pip install -e .
    startCommand: python -m admob_mcp.server
    envVars:
      - key: TRANSPORT
        value: http
      - key: PORT
        value: 10000
      - key: ADMOB_ACCESS_TOKEN
        sync: false  # Set manually in Render dashboard
    healthCheckPath: /mcp
```

### 3. Create Dockerfile (Alternative)
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY backend/admob_mcp/ ./admob_mcp/
COPY backend/pyproject.toml ./

RUN pip install --no-cache-dir -e .

ENV TRANSPORT=http
ENV PORT=10000

EXPOSE 10000

CMD ["python", "-m", "admob_mcp.server"]
```

### 4. Deploy via Render MCP
Once Render MCP is configured, use these commands:
```
# List workspaces
mcp__render__list_workspaces

# Create the service
mcp__render__create_web_service with:
- name: admob-mcp-server
- repo: https://github.com/KVLabsCode/ADAgentAI
- branch: main
- buildCommand: cd backend && pip install -e .
- startCommand: cd backend && python -m admob_mcp.server
- envVars: TRANSPORT=http, PORT=10000

# Add secrets
mcp__render__update_environment_variables with:
- ADMOB_ACCESS_TOKEN: <token>
```

### 5. Configure in LangSmith Agent Builder
Once deployed, add the MCP server URL to Agent Builder:
- URL: `https://admob-mcp-server.onrender.com/mcp`
- Auth: Static Headers with `Authorization: Bearer <token>` if needed

## Files to Reference
- `backend/admob_mcp/server.py` - Main server code (line 142-148 for HTTP transport)
- `backend/admob_mcp/tools/` - All tool definitions
- `backend/pyproject.toml` - Dependencies

## Authentication Notes
The MCP server uses Google OAuth. Options:
1. Pass `ADMOB_ACCESS_TOKEN` as env var (short-lived)
2. Use service account via `GOOGLE_APPLICATION_CREDENTIALS`
3. Implement OAuth 2.1 flow for Agent Builder (complex)

For testing, use option 1 or 2. For production, consider implementing proper OAuth flow.
