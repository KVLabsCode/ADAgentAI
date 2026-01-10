# ADAgentAI

AI-powered assistant for managing AdMob and Google Ad Manager accounts. Ask questions in plain English and get instant insights about your ad performance.

## Features

- **Natural Language Queries** - Ask "What was my revenue yesterday?" or "Show me top performing ad units"
- **Multi-Platform Support** - Connect both AdMob and Google Ad Manager accounts
- **Real-Time Insights** - Get up-to-date information without waiting for reports
- **Secure OAuth** - Industry-standard authentication with Google
- **Human-in-Loop** - Dangerous operations require user approval before execution

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
│                     http://localhost:3000                       │
└─────────────────────────────────────────────────────────────────┘
                  │                           │
                  ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   API Server (Hono + Bun)   │   │   Chat Agent (FastAPI)      │
│   http://localhost:3001     │   │   http://localhost:5000     │
│   - Authentication          │   │   - SSE Streaming           │
│   - Billing (Polar)         │   │   - CrewAI Orchestration    │
│   - Provider OAuth          │   │   - MCP Tool Execution      │
└─────────────────────────────┘   └─────────────────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   PostgreSQL (Neon)         │   │   Anthropic Claude API      │
│   - Users, Sessions         │   │   - LLM for AI Agent        │
│   - Provider Tokens         │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **API Server** | Hono, Bun, Drizzle ORM |
| **Database** | Neon PostgreSQL |
| **Auth** | Better Auth + Google OAuth |
| **Billing** | Polar |
| **AI Agent** | FastAPI, CrewAI, SSE Streaming |
| **LLM** | Anthropic Claude |
| **MCP Tools** | FastMCP (AdMob, Google Ad Manager) |
| **Blog CMS** | Sanity |

## Project Structure

```
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (authenticated)/  # Protected routes
│   │   │   └── (public)/         # Public routes
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities
│   └── scripts/             # Dev utilities
│
├── backend/
│   ├── api/                 # Hono API server
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── db/          # Drizzle schema
│   │   │   └── lib/         # Auth, utilities
│   │   └── tests/           # API tests
│   │
│   ├── chat/                # Modular chat package
│   │   ├── streaming/       # SSE events & state
│   │   ├── approval/        # Human-in-loop system
│   │   ├── routing/         # Query classification
│   │   └── hooks/           # CrewAI hooks
│   │
│   ├── ad_platform_crew/    # CrewAI agents
│   ├── admob_mcp/           # AdMob MCP server
│   ├── admanager_mcp/       # Ad Manager MCP server
│   └── chat_server.py       # FastAPI entry point
│
├── studio-sanity/           # Sanity CMS studio (blog)
└── .github/workflows/       # CI pipeline
```

## Getting Started

### Prerequisites

- Node.js 20+
- Bun 1.0+
- Python 3.11+

### Installation

NOTE: Make sure you have `pnpm` installed. If not, run `npm install -g pnpm@latest-10`.

```bash
# Frontend dependencies
cd frontend && pnpm install

# API dependencies
cd ../backend/api && pnpm install

# Python dependencies
cd .. && pip install -r requirements.txt
```

### Database Setup

```bash
cd backend/api
pnpm run db:push      # Create tables
pnpm run db:studio    # Open Drizzle Studio (optional)
```

### Run Development

```bash
cd frontend && pnpm dev
```

This starts all three services concurrently:
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Chat Agent**: http://localhost:5000

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API server URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_AGENT_URL` | Chat agent URL (default: `http://localhost:5000`) |
| `NEXT_PUBLIC_POLAR_PRO_PRICE_ID` | Polar subscription product ID |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity CMS project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (e.g., `production`) |
| `SANITY_API_TOKEN` | Sanity API token (for mutations) |

### API Server (`backend/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | API server URL for auth callbacks |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `POLAR_ACCESS_TOKEN` | Polar API access token |
| `POLAR_WEBHOOK_SECRET` | Polar webhook secret |
| `POLAR_DEFAULT_PRICE_ID` | Default subscription price ID |
| `FRONTEND_URL` | Frontend URL for CORS |
| `INTERNAL_API_KEY` | Shared key for agent → API communication |
| `PORT` | Server port (default: `3001`) |

### Chat Agent (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `API_URL` | API server URL for provider data |
| `INTERNAL_API_KEY` | Must match API server's key |

## External Services

| Service | Purpose | Setup |
|---------|---------|-------|
| [Neon](https://neon.tech) | PostgreSQL database | Create project, copy connection string |
| [Google Cloud](https://console.cloud.google.com) | OAuth for user login | Create OAuth credentials, set redirect URIs |
| [Polar](https://polar.sh) | Subscriptions & billing | Create product, get access token, configure webhook |
| [Anthropic](https://console.anthropic.com) | Claude AI | Get API key |
| [Sanity](https://sanity.io) | Blog CMS (optional) | Create project, deploy studio |

## CI/CD

### GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on push/PR to `main` and `develop`:

- **api-test**: Type checking and unit tests
- **api-coverage**: Test coverage report

### Repository Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Auth secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

### Branch Protection (Recommended)

For `main` branch:
- Require status checks (CI must pass)
- Require PR reviews

## Deployment

### Render (Backend)

The `render.yaml` configures:
- **adagentai-api**: Hono API server
- **adagentai-agent**: FastAPI chat agent

### Vercel (Frontend)

Deploy frontend to Vercel with environment variables pointing to Render services.

## License

Private - All rights reserved.
