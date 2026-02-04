# External Integrations

**Analysis Date:** 2026-02-04

## APIs & External Services

**Ad Platforms:**
- AdMob (Google) - Ad network data and monetization
  - OAuth scope: `https://www.googleapis.com/auth/admob.readonly`
  - Implementation: `backend/api/src/routes/providers.ts`

- Google Ad Manager (GAM) - Ad inventory and order management
  - OAuth scope: `https://www.googleapis.com/auth/dfp`
  - Implementation: `backend/api/src/routes/providers.ts`

**Third-Party Ad Networks (via MCP tools):**
- AppLovin MAX - Mobile mediation platform
- Unity LevelPlay - Game monetization platform
- Mintegral - Ad network for mobile apps
- Liftoff - User acquisition platform
- InMobi - Mobile advertising network
- Pangle (ByteDance) - Ad network
- DT Exchange - Inventory management

**LLM Providers:**
- Anthropic (Claude) - Primary LLM for agentic workflows
  - SDK: `langchain-anthropic` 1.0.0+
  - Models: Claude Haiku (router), Claude 3.5 Sonnet (specialists)
  - Auth: `ANTHROPIC_API_KEY` env var
  - Implementation: `backend/chat/graph/nodes/router.py`, `backend/chat/graph/nodes/specialist.py`

- OpenRouter (Alternative) - LLM routing/fallback
  - SDK: `langchain-openai`
  - Auth: `OPENROUTER_API_KEY` env var

**Embeddings:**
- Voyage AI - Text embeddings for semantic search
  - Auth: `VOYAGE_API_KEY` env var

## Data Storage

**Databases:**
- Neon PostgreSQL - Primary data storage
  - Connection: `DATABASE_URL` env var
  - Client: `@neondatabase/serverless` (Bun), `psycopg[binary]` (Python)
  - Schema: `backend/api/src/db/schema.ts` (Drizzle ORM)
  - Key tables:
    - `users` - Legacy user data (migrating to Neon Auth)
    - `connectedProviders` - OAuth tokens for AdMob/GAM (JWE encrypted)
    - `chatSessions`, `messages` - Chat history and state
    - `runSummaries` - LLM execution metrics for billing/usage
    - `adSources` - API-key credentials for mediation networks (AES-256-GCM encrypted)
    - `blogPosts` - Blog content (legacy, Sanity CMS preferred)

**File Storage:**
- None - No object storage (S3, Cloudflare R2) detected
- Images served from: Google user avatars (lh3.googleusercontent.com), Sanity CDN (cdn.sanity.io)

**Caching:**
- None detected in primary stack
- React Query handles client-side data caching
- Next.js experimental staleTimes for route-level cache (30s dynamic, 180s static)

## Authentication & Identity

**Auth Provider:**
- Neon Auth - Session-based authentication with JWT fallback
  - Implementation: `backend/api/src/lib/neon-auth.ts`, `frontend/src/lib/neon-auth/`
  - Session validation: Database lookup in `neon_auth.session` table
  - JWT validation: JWKS from `NEON_AUTH_URL/.well-known/jwks.json`
  - Supports both session tokens and JWT verification

**OAuth 2.0 (User Login):**
- Google OAuth - Primary authentication method
  - OAuth endpoints: `accounts.google.com/o/oauth2/v2/auth`, `oauth2.googleapis.com/token`
  - Client credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars
  - Redirect URIs: `http://localhost:3001/api/auth/callback` (dev), production URLs
  - User data flow: OAuth → Neon Auth → Session tokens

**Provider OAuth (Ad Platform Credentials):**
- AdMob OAuth - User authorizes app to read AdMob data
  - Tokens encrypted in `connectedProviders.accessToken` (JWE via `BETTER_AUTH_SECRET`)
  - Storage: `backend/api/src/db/schema.ts` lines 147-173
  - Encryption/Decryption: `backend/api/src/lib/crypto.ts`

- GAM OAuth - Similar to AdMob, encrypted storage

## Monitoring & Observability

**Error Tracking:**
- Sentry (Bun backend) - Error capturing and performance monitoring
  - SDK: `@sentry/bun` 10.36.0
  - DSN: `SENTRY_DSN` env var
  - Configuration: `backend/api/src/lib/sentry.ts`
  - Sanitizes headers: Strips `authorization`, `cookie` headers before sending

**Analytics:**
- PostHog - Product analytics and event tracking
  - SDK: `posthog-node` (backend), `posthog-js` (frontend)
  - API key: `POSTHOG_API_KEY` (backend), `NEXT_PUBLIC_POSTHOG_KEY` (frontend)
  - Host: `https://us.i.posthog.com` (default)
  - Tracked events: `user_signed_up`, `provider_connected`, `chat_session`, `subscription_*`
  - Implementation: `backend/api/src/lib/analytics.ts`, `frontend/src/components/providers/posthog-provider.tsx`

**LangSmith (LLM Observability):**
- LangSmith - LangGraph execution tracing and debugging
  - API key: `LANGSMITH_API_KEY` env var
  - Project: `LANGSMITH_PROJECT` env var (default: "adagentai")
  - Tracing: `LANGSMITH_TRACING=true`
  - Sampling: `LANGSMITH_SAMPLING_RATE` (default: 1.0)
  - Integration: `from langsmith import traceable` decorator in `backend/chat/graph/`

**Logs:**
- Console logging (both frontend and backend)
- Structured logging in backend via Hono middleware: `backend/api/src/index.ts` (logger middleware)
- Python backend logs via FastAPI/Uvicorn

## CI/CD & Deployment

**Hosting:**
- Vercel - Frontend (Next.js) + API routes for Node.js
  - Deployment: Git push to main branch
  - Preview deployments: Feature branch previews
  - Environment variables: Set via Vercel dashboard
  - CORS origins configured for Vercel URLs: `*.vercel.app`, `sumanth-prasads-projects.vercel.app`

- Render/Railway/Other - Chat agent service (Python FastAPI)
  - Port: 5001 (dev), 5000 (production)
  - Environment: Managed Python runtime

**CI Pipeline:**
- GitHub Actions (inferred from `.github/` directory)
- Pre-commit hooks: Husky integration (`husky` 9.1.7) in `backend/api/.husky`
- Type checking: `tsc --noEmit` (TypeScript)
- Linting: ESLint for frontend

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection (Neon)
- `ANTHROPIC_API_KEY` - Claude LLM access
- `NEON_AUTH_URL` - Auth endpoint
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth

**Optional but important:**
- `POLAR_ACCESS_TOKEN` - Billing integration (required if billing enabled)
- `SENTRY_DSN` - Error tracking (optional but recommended)
- `POSTHOG_API_KEY` - Analytics (optional)
- `LANGSMITH_API_KEY` - LLM tracing (optional but useful for debugging)
- `SMTP_USER`, `SMTP_PASS` - Email notifications (optional)

**Secrets location:**
- `.env` files (NOT committed, in `.gitignore`)
- Vercel Environment Variables dashboard (production)
- Render/Railway project settings (chat agent)
- Local development: `frontend/.env`, `backend/.env`

## Webhooks & Callbacks

**Incoming:**
- Polar webhook - Billing events (subscription updates, charges)
  - Endpoint: `POST /webhooks/polar` (inferred from `backend/api/src/routes/webhooks.ts`)
  - Secret: `POLAR_WEBHOOK_SECRET` env var
  - Events: `subscription.created`, `subscription.updated`, `order.created`

**Outgoing:**
- None detected (no webhook senders to external services)

## Content Management

**Blog/CMS:**
- Sanity - Headless CMS for blog posts
  - Project ID: `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - Dataset: `NEXT_PUBLIC_SANITY_DATASET`
  - Read token: `SANITY_API_READ_TOKEN` (server-side)
  - Write token: `SANITY_API_WRITE_TOKEN` (admin only)
  - API version: `2024-01-01`
  - CDN: Enabled in production, disabled for editing
  - GROQ queries: `frontend/src/lib/sanity.ts`
  - Studio: `studio-sanity/` directory (Sanity UI)

## Billing

**Payment Processor:**
- Polar (polar.sh) - SaaS billing platform
  - SDK: `@polar-sh/sdk` 0.42.2
  - Access token: `POLAR_ACCESS_TOKEN` env var
  - Webhook secret: `POLAR_WEBHOOK_SECRET`
  - Default price ID: `POLAR_DEFAULT_PRICE_ID` env var
  - Implementation: `backend/api/src/routes/billing.ts`
  - Features:
    - Checkout creation with custom metadata
    - Customer portal for managing subscriptions
    - Invoice retrieval
    - Subscription status queries

## Email

**Email Service:**
- Gmail SMTP - Outbound email for notifications
  - Host: `smtp.gmail.com`
  - Port: 465 (TLS)
  - User: `SMTP_USER` env var
  - Password: `SMTP_PASS` env var (Gmail app password)
  - From name: `SMTP_FROM_NAME` env var
  - Implementation: `backend/api/src/lib/email.ts`
  - Use cases: Waitlist confirmations, access invites

---

*Integration audit: 2026-02-04*
