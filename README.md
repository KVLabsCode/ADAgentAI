# ADAgent

AI-powered assistant for managing AdMob and Google Ad Manager accounts. Ask questions in plain English and get instant insights about your ad performance.

## Features

- **Natural Language Queries** - Ask questions like "What was my revenue yesterday?" or "Show me top performing ad units"
- **Multi-Platform Support** - Connect both AdMob and Google Ad Manager accounts
- **Real-Time Insights** - Get up-to-date information without waiting for reports
- **Secure OAuth** - Industry-standard authentication with Google

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Sanity CMS (blog)

### Backend
- Hono + Bun (API server)
- Better Auth (authentication)
- Neon PostgreSQL (database)
- Polar (billing/subscriptions)

### AI Agent
- CrewAI (agent orchestration)
- Flask (streaming API)
- Custom MCP tools for AdMob/GAM APIs

## Project Structure

```
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom React hooks
│   │   └── lib/       # Utilities and configurations
│   └── scripts/       # Utility scripts (blog seeding, etc.)
│
├── backend/
│   ├── api/           # Hono API server (auth, billing, chat)
│   ├── ad_platform_crew/  # CrewAI agent service
│   ├── admob_mcp/     # AdMob MCP tools
│   └── admanager_mcp/ # Google Ad Manager MCP tools
│
└── render.yaml        # Render deployment configuration
```

## Getting Started

### Prerequisites
- Node.js 20+
- Bun 1.0+
- Python 3.11+
- PostgreSQL (Neon recommended)

### Environment Variables

Create `.env` files in both `frontend/` and `backend/api/`:

**Frontend (.env)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SANITY_PROJECT_ID=your-sanity-project-id
NEXT_PUBLIC_SANITY_DATASET=production
```

**Backend API (.env)**
```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
POLAR_ACCESS_TOKEN=your-polar-token
```

### Development

```bash
# Install dependencies
cd frontend && npm install
cd ../backend/api && bun install
cd ../.. && pip install -r backend/requirements.txt

# Run all services (from frontend directory)
npm run dev
```

This starts:
- Frontend on http://localhost:3000
- API server on http://localhost:3001
- Agent service on http://localhost:5000

## Deployment

The project is configured for deployment on Render using `render.yaml`:

- **Frontend**: Static site (Next.js)
- **API**: Web service (Bun)
- **Agent**: Web service (Python/Flask)

## License

Private - All rights reserved.
