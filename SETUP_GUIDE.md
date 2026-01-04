# ADAgent Full Stack Setup Guide

This guide walks you through setting up all the services and environment variables needed to run ADAgent locally and in production.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                         Port: 3000                               │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   Hono API (Backend)        │   │   CrewAI Agent Service      │
│   Port: 3001                │   │   Port: 5000                │
│   - Authentication          │   │   - AI Chat                 │
│   - Billing (Polar)         │   │   - Ad Platform Queries     │
│   - Provider OAuth          │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   PostgreSQL (Neon)         │   │   Anthropic Claude API      │
│   - Users, Sessions         │   │   - LLM for AI Agent        │
│   - Provider Tokens         │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## Table of Contents

1. [Neon Database](#1-neon-database)
2. [Better Auth (Authentication)](#2-better-auth-authentication)
3. [Google OAuth](#3-google-oauth-for-login)
4. [Polar (Billing/Subscriptions)](#4-polar-billing--subscriptions)
5. [Anthropic API (AI)](#5-anthropic-api-ai-agent)
6. [Optional: Sentry & PostHog](#6-optional-observability)
7. [Complete Environment Files](#7-complete-environment-files)
8. [Running Locally](#8-running-locally)
9. [Production Deployment](#9-production-deployment-render)

---

## 1. Neon Database

Neon is a serverless PostgreSQL database. It's free for small projects.

### Steps:

1. **Go to [neon.tech](https://neon.tech)** and sign up
2. **Create a new project** (name it something like "adagent")
3. **Copy the connection string** from the dashboard
   - It looks like: `postgresql://neondb_owner:abc123@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Environment Variable:
```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT.aws.neon.tech/neondb?sslmode=require
```

### Initialize the Database:
```bash
cd backend/api
bun run db:push  # This creates all tables
```

---

## 2. Better Auth (Authentication)

Better Auth handles user sessions and OAuth. It needs a secret key.

### Steps:

1. **Generate a secure secret** (run this in terminal):
   ```bash
   openssl rand -base64 32
   ```
   Or use: https://generate-secret.vercel.app/32

2. **Set the URL** to your backend URL

### Environment Variables:
```bash
# For local development
BETTER_AUTH_SECRET=your-generated-32-char-secret-here
BETTER_AUTH_URL=http://localhost:3001

# For production (on Render)
BETTER_AUTH_SECRET=your-generated-32-char-secret-here
BETTER_AUTH_URL=https://adagentai-api.onrender.com
```

---

## 3. Google OAuth (For Login)

Users sign in with their Google account. You need to create OAuth credentials.

### Steps:

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**

2. **Create a new project** (or select existing)

3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable: **Google+ API** (for basic auth)

4. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in app name: "ADAgent"
   - Add your email as developer contact
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your email) while in testing mode

5. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "ADAgent Web"
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://localhost:3001
     https://your-frontend.vercel.app (for production)
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3001/api/auth/callback/google
     https://adagentai-api.onrender.com/api/auth/callback/google (for production)
     ```

6. **Copy the Client ID and Client Secret**

### Environment Variables:
```bash
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

---

## 4. Polar (Billing & Subscriptions)

Polar is like Stripe but simpler. It handles subscriptions and payments.

### How Polar Works:
- **Access Token**: Your API key to talk to Polar
- **Webhook Secret**: Validates webhook events from Polar
- **Price ID**: Each subscription plan has a unique ID

### Steps:

1. **Go to [polar.sh](https://polar.sh)** and sign up

2. **Create an Organization** (your business/project)

3. **Create a Product** (your subscription plan):
   - Go to "Products" → "Create Product"
   - Name: "Pro Plan" (or whatever you want)
   - Type: **Subscription**
   - Price: $29/month (or your price)
   - Save it

4. **Get the Price ID:**
   - After creating, click on the product
   - Look at the URL or find the Product ID
   - It looks like: `prod_xxx` or a UUID

5. **Get your Access Token:**
   - Go to Settings → "Access Tokens"
   - Create a new token with these scopes:
     - `customers:read`
     - `customers:write`
     - `subscriptions:read`
     - `checkouts:write`
     - `orders:read`
   - Copy the token (you only see it once!)

6. **Set up Webhooks:**
   - Go to Settings → "Webhooks"
   - Add endpoint URL: `https://your-api.onrender.com/webhooks/polar`
   - Select events: `subscription.created`, `subscription.updated`, `order.created`
   - Copy the webhook secret

### Environment Variables:
```bash
POLAR_ACCESS_TOKEN=polar_at_xxx...  # Your access token
POLAR_WEBHOOK_SECRET=whsec_xxx...   # From webhook setup
POLAR_DEFAULT_PRICE_ID=prod_xxx     # Your product/price ID
```

### Frontend Variable:
```bash
# In frontend/.env.local
NEXT_PUBLIC_POLAR_PRO_PRICE_ID=prod_xxx  # Same as POLAR_DEFAULT_PRICE_ID
```

---

## 5. Anthropic API (AI Agent)

The AI chatbot uses Claude from Anthropic.

### Steps:

1. **Go to [console.anthropic.com](https://console.anthropic.com)**

2. **Sign up and add billing** (pay-as-you-go)

3. **Create an API key:**
   - Go to "API Keys"
   - Click "Create Key"
   - Copy it immediately (shown only once)

### Environment Variable:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
```

---

## 6. Optional: Observability

### Sentry (Error Tracking)

1. Go to [sentry.io](https://sentry.io) and create a project
2. Copy the DSN from project settings

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### PostHog (Analytics)

1. Go to [posthog.com](https://posthog.com) and create a project
2. Copy the API key from project settings

```bash
POSTHOG_API_KEY=phc_xxx
POSTHOG_HOST=https://us.i.posthog.com
```

---

## 7. Complete Environment Files

### Backend API (`backend/api/.env`)

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx.aws.neon.tech/neondb?sslmode=require

# ============================================
# AUTHENTICATION (Better Auth)
# ============================================
BETTER_AUTH_SECRET=generate-a-32-char-secret-here
BETTER_AUTH_URL=http://localhost:3001

# ============================================
# GOOGLE OAUTH (for user login)
# ============================================
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# ============================================
# POLAR BILLING
# ============================================
POLAR_ACCESS_TOKEN=polar_at_xxx
POLAR_WEBHOOK_SECRET=whsec_xxx
POLAR_DEFAULT_PRICE_ID=prod_xxx

# ============================================
# APP CONFIG
# ============================================
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ============================================
# INTERNAL SERVICES
# ============================================
# Used for Python agent to call API securely
INTERNAL_API_KEY=generate-another-random-key-here

# ============================================
# OPTIONAL: OBSERVABILITY
# ============================================
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
# POSTHOG_API_KEY=phc_xxx
# POSTHOG_HOST=https://us.i.posthog.com
```

### Agent Service (`backend/.env`)

```bash
# ============================================
# AI PROVIDER
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# ============================================
# OPTIONAL: Google Service Account
# For AdMob/Ad Manager API access
# ============================================
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Frontend (`frontend/.env.local`)

```bash
# ============================================
# API ENDPOINTS
# ============================================
# Backend API (Hono)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Agent Service (CrewAI/Python)
NEXT_PUBLIC_AGENT_URL=http://localhost:5000

# ============================================
# POLAR BILLING
# ============================================
# Must match POLAR_DEFAULT_PRICE_ID in backend
NEXT_PUBLIC_POLAR_PRO_PRICE_ID=prod_xxx

# ============================================
# OPTIONAL: SANITY CMS (for blog)
# ============================================
# NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
# NEXT_PUBLIC_SANITY_DATASET=production
# SANITY_API_TOKEN=your-token
```

---

## 8. Running Locally

### Prerequisites
- Node.js 18+
- Bun (`npm install -g bun`)
- Python 3.11+

### Step 1: Set up environment files
Copy the templates above and fill in your values.

### Step 2: Install dependencies

```bash
# Backend API
cd backend/api
bun install

# Agent Service
cd ../
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Step 3: Initialize database

```bash
cd backend/api
bun run db:push
```

### Step 4: Start all services

**Terminal 1 - Backend API:**
```bash
cd backend/api
bun run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Agent Service:**
```bash
cd backend
python chat_server.py
# Runs on http://localhost:5000
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Step 5: Test it
1. Open http://localhost:3000
2. Try signing in with Google
3. Navigate to /billing to see subscription page
4. Try the chat (requires connected providers)

---

## 9. Production Deployment (Render)

Your `render.yaml` is already configured. Here's how to deploy:

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Add environment configuration"
git push
```

### Step 2: Connect to Render
1. Go to [render.com](https://render.com)
2. New → Blueprint
3. Connect your GitHub repo
4. Select the repo with `render.yaml`

### Step 3: Set Environment Variables in Render Dashboard

For **adagentai-api** service:
- `DATABASE_URL` → Your Neon connection string
- `BETTER_AUTH_SECRET` → Your generated secret
- `BETTER_AUTH_URL` → `https://adagentai-api.onrender.com`
- `GOOGLE_CLIENT_ID` → Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` → Your Google OAuth secret
- `POLAR_ACCESS_TOKEN` → Your Polar token
- `POLAR_WEBHOOK_SECRET` → Your webhook secret
- `POLAR_DEFAULT_PRICE_ID` → Your product ID
- `FRONTEND_URL` → `https://your-frontend-url.vercel.app`

For **adagentai-agent** service:
- `ANTHROPIC_API_KEY` → Your Anthropic API key

### Step 4: Update Frontend for Production

In Vercel (or wherever you deploy frontend), set:
- `NEXT_PUBLIC_API_URL` → `https://adagentai-api.onrender.com`
- `NEXT_PUBLIC_AGENT_URL` → `https://adagentai-agent.onrender.com`
- `NEXT_PUBLIC_POLAR_PRO_PRICE_ID` → Your product ID

---

## Quick Reference: What Each Service Does

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Neon** | PostgreSQL database | Yes, generous |
| **Better Auth** | User sessions & OAuth | Free (self-hosted) |
| **Google OAuth** | "Sign in with Google" | Free |
| **Polar** | Subscriptions & billing | Free + % per transaction |
| **Anthropic** | AI/Claude for chatbot | Pay-as-you-go (~$3/M tokens) |
| **Sentry** | Error tracking | Free tier available |
| **PostHog** | Analytics | Free tier available |

---

## Troubleshooting

### "404 on /api/billing/..."
→ Check `NEXT_PUBLIC_API_URL` is set correctly in frontend

### "Upgrade button doesn't work"
→ Check `NEXT_PUBLIC_POLAR_PRO_PRICE_ID` is set in frontend

### "Network error" in chat
→ Make sure the agent service is running on port 5000

### "Google OAuth redirect error"
→ Check redirect URIs in Google Console match your URLs exactly

### "Database connection failed"
→ Check `DATABASE_URL` format and that Neon project is active

---

## Need Help?

- Check service dashboards for error logs
- Ensure all environment variables are set (no typos!)
- For Polar issues: [polar.sh/docs](https://docs.polar.sh)
- For Better Auth: [better-auth.com/docs](https://www.better-auth.com/docs)
