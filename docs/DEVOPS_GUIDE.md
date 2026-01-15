# ADAgentAI DevOps Guide
> Your lazy-developer-friendly guide to dev/stage/prod environments

---

## Wait, What's a DSN? (And Other Jargon)

Before we dive in, let's define some terms:

| Term | What it is | Example |
|------|------------|---------|
| **DSN** | "Data Source Name" - just a URL where you send data | `https://abc@sentry.io/123` |
| **Environment Variable** | A value your app reads at runtime (like a config setting) | `DATABASE_URL=postgres://...` |
| **Preview Deploy** | A temporary version of your app for testing a PR | `pr-123.vercel.app` |
| **Branch** | A copy of your code (Git) or database (Neon) | `main`, `DEV`, `feature/xyz` |

**Sentry DSN** = URL where errors get sent. If you see graphs in Sentry, it's already configured!
**PostHog Key** = ID for your analytics project. Same deal - graphs = configured.

---

## TL;DR - What You Already Have

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YOUR CURRENT SETUP                               │
├─────────────────────────────────────────────────────────────────────────┤
│  VERCEL (Frontend)          RENDER (Backend)         NEON (Database)   │
│  ─────────────────          ───────────────          ───────────────   │
│  ✅ ad-agent-ai             ✅ adagentai-api         ✅ kvlabs-platform│
│  ✅ Preview deploys ON      ❌ Preview deploys OFF   ✅ Auto-branches  │
│  ✅ main → production       ⚠️  DEV → production     ✅ Vercel sync    │
│                                                                         │
│  Current Domain: www.dashboard.kovio.dev                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Good news:** Vercel + Neon are already set up for preview environments! When you open a PR, Vercel creates a preview deployment AND Neon creates a database branch automatically.

**What's missing:** Render (your Python agent + API) doesn't have preview environments, and you're deploying from `DEV` branch instead of `main`.

---

## Concepts Explained Simply

### The Old Way (Shared Staging) - BAD
```
Developer A ─┐
Developer B ─┼─► [Staging] ─► [Production]
Developer C ─┘      ↑
                    └── ONE database, everyone's changes mixed together
                        If someone breaks it, EVERYONE is blocked
```

### The New Way (Preview Environments) - GOOD
```
Developer A's PR ─► [Preview A] + [DB Branch A] ─┐
Developer B's PR ─► [Preview B] + [DB Branch B] ─┼─► [Production]
Developer C's PR ─► [Preview C] + [DB Branch C] ─┘
                         ↑
                         └── Each PR gets its OWN isolated copy
                             Break yours? Only YOU are affected
```

---

## Vercel Environments Explained Simply

Based on the Vercel video you watched, here's what's happening:

### The Three Environments

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LOCAL                    PREVIEW                   PRODUCTION         │
│   (your computer)          (testing)                 (live site)        │
│                                                                         │
│   localhost:3000  ──PR──►  pr-123.vercel.app  ──merge──►  kovio.dev    │
│                                                                         │
│   VERCEL_ENV=              VERCEL_ENV=               VERCEL_ENV=        │
│   "development"            "preview"                 "production"       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### How Environment Variables Work

In Vercel dashboard (Settings → Environment Variables), you set **different values for each environment**:

```
┌────────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Variable Name      │ Development     │ Preview         │ Production      │
├────────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ DATABASE_URL       │ (your local)    │ preview branch  │ main branch     │
│ API_URL            │ localhost:3001  │ staging-api     │ api.kovio.dev   │
│ SENTRY_DSN         │ (empty/skip)    │ staging project │ prod project    │
└────────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Key insight:** Vercel reads which environment you're in and picks the right value automatically!

### Your Current Vercel Setup

When you go to your Vercel project → Settings → Environment Variables, you'll see something like:

```
DATABASE_URL
├── Production: postgresql://...@ep-xxx.neon.tech/neondb     ← main branch
├── Preview: (auto-injected by Neon integration)             ← preview/[branch]
└── Development: (pull with `vercel env pull`)               ← for local
```

The Neon-Vercel integration automatically creates a database branch for each preview and injects the connection string. You don't have to do anything!

### Branch-Specific Previews (Advanced)

From the video: You can have **different preview values per branch**. Example:

```
ENV_VAR for Preview environment:
├── All branches: "preview"           ← default
├── staging branch: "staging"         ← specific override
└── qa branch: "qa"                   ← another override
```

This lets you have long-lived branches like `staging` or `qa` with their own configs.

### Staged Deployments & Manual Promotion (Advanced)

From the video: You can disable "auto-assign domains" so merging to main doesn't immediately go live.

**Why use this?**
- Test production build before it goes live
- QA approval step before release
- Rollback is just "promote the previous deployment"

**How it works:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ WITHOUT Staged Deployments (Default)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Merge to main ──► Build ──► Automatically live at kovio.dev          │
│                                    ↑                                    │
│                                    └── No going back easily!            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ WITH Staged Deployments                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Merge to main ──► Build ──► Staged (test at unique URL)              │
│                                    │                                    │
│                                    ▼                                    │
│                              [You test it]                              │
│                                    │                                    │
│                          ┌────────┴────────┐                           │
│                          ▼                  ▼                           │
│                    Click "Promote"    Something wrong?                  │
│                          │             Just don't promote               │
│                          ▼                                              │
│                    Now live at kovio.dev                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**How to enable:**

1. Go to Vercel → Project Settings → Git
2. Find "Production Branch" section
3. Turn OFF "Automatically expose System Environment Variables"
4. Turn OFF "Auto-assign Custom Production Domains"

**Now when you merge:**
- Build happens, gets a unique URL like `ad-agent-ai-xxx.vercel.app`
- Your production domains (kovio.dev) still point to the OLD deployment
- Test the new build at the unique URL
- When ready: Deployments → Click deployment → "Promote to Production"

**Rollback:**
If something breaks after promoting, just promote an older deployment instead!

---

### Why Neon Branching is Magic

Unlike regular databases where you'd need to copy GBs of data, Neon uses copy-on-write:

```
main branch (production data)
    │
    ├── preview/DEV ─────────────────── Your current preview branch
    │   └── Instant copy, same data, isolated changes
    │
    ├── preview/feature-xyz ─────────── PR preview branch
    │   └── Schema changes here don't affect main
    │
    └── preview/bugfix-123 ──────────── Another PR branch
        └── Can be deleted when PR merges
```

**Key insight:** These branches are INSTANT to create (milliseconds, not minutes) because Neon just creates pointers to existing data.

### Neon Branching = "Stashing" for Databases

Think of it like Git stash, but for your entire database:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TRADITIONAL DATABASE (Scary)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Want to test a schema change?                                        │
│                                                                         │
│   1. Backup production DB (takes 10+ minutes for large DBs)            │
│   2. Run migration on production                                       │
│   3. Something breaks? Restore from backup (another 10+ minutes)       │
│   4. Users are down the whole time 😱                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ NEON BRANCHING (Safe)                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Want to test a schema change?                                        │
│                                                                         │
│   1. Create branch from main (instant - milliseconds)                  │
│   2. Run migration on branch                                           │
│   3. Test it thoroughly                                                │
│   4. Works? Merge to main. Doesn't work? Delete branch                 │
│   5. Production never touched until you're ready ✅                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Safe Schema Changes with Neon

**Scenario:** You want to add a column to the `users` table.

**Without branching (dangerous):**
```bash
# Directly modify production - risky!
bun run db:push  # Hope nothing breaks...
```

**With branching (safe):**
```bash
# 1. Create a branch (or let Vercel do it via PR)
# Neon Console → Branches → Create Branch from main

# 2. Get the branch connection string
# Set DATABASE_URL to the branch URL

# 3. Test your migration on the branch
cd backend/api
DATABASE_URL="postgres://...@branch-endpoint/neondb" bun run db:push

# 4. Test your app against the branch
# Everything works?

# 5. Now safely apply to production
DATABASE_URL="postgres://...@main-endpoint/neondb" bun run db:push
```

### Point-in-Time Recovery (Time Travel)

Neon keeps a history of your data. If something goes wrong:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ OOPS! Bad migration broke production data                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Option 1: Create branch from past point-in-time                      │
│   ─────────────────────────────────────────────────────────────────    │
│   Neon Console → Branches → Create Branch                              │
│   → Select "Time" instead of "Head"                                    │
│   → Pick timestamp from before the bad migration                       │
│   → Now you have your data back!                                       │
│                                                                         │
│   Option 2: Reset branch to parent                                     │
│   ─────────────────────────────────────────────────────────────────    │
│   Neon Console → Branches → Select branch → Reset from parent          │
│   → Branch goes back to match main at creation time                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Your Neon plan includes:** 24-hour history retention (can be extended on paid plans)

### Your Current Neon Branches

You already have these branches (created automatically by Vercel):

```
main                                         ← Production
preview/DEV                                  ← Your DEV branch preview
preview/refactor/langgraph-token-tracking    ← PR preview
preview/add-claude-github-actions-*          ← PR preview
... and more
```

The Vercel-Neon integration creates these automatically when you open PRs!

---

## Your Naming Conventions

### Git Branches
```
main                          # Production (protected)
DEV                           # Development/staging
feature/P-123-feature-name    # Features (P-123 = Linear ticket)
bugfix/P-456-bug-description  # Bug fixes
hotfix/urgent-fix             # Emergency production fixes
```

### Neon Database Branches
```
main                                    # Production database
preview/DEV                             # Staging database (synced with DEV branch)
preview/feature/P-123-feature-name      # Auto-created by Vercel for PRs
preview/bugfix/P-456-bug-description    # Auto-created by Vercel for PRs
```

### Service Names (Proposed)
| Environment | Frontend (Vercel) | API (Render) | Agent (Render) | Database (Neon) |
|-------------|-------------------|--------------|----------------|-----------------|
| Production  | ad-agent-ai | adagentai-api-prod | adagentai-agent-prod | main |
| Staging     | (preview deploys) | adagentai-api-staging | adagentai-agent-staging | preview/DEV |
| Preview     | (auto per PR) | (manual or service group) | (manual or service group) | preview/[branch] |

### Environment Variables Naming
```bash
# Production
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/neondb
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/production
POSTHOG_API_KEY=phc_production_xxx

# Staging (use different Sentry/PostHog projects!)
DATABASE_URL=postgresql://...@ep-yyy.us-east-2.aws.neon.tech/neondb
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/staging
POSTHOG_API_KEY=phc_staging_xxx

# Preview (auto-injected by Vercel-Neon integration)
DATABASE_URL=postgresql://...@ep-zzz.us-east-2.aws.neon.tech/neondb
```

---

## Setup Checklist

### Step 1: Understand Your Branch Situation

**Your thinking was correct!** `main` = production, `DEV` = development/staging. That's the right mental model.

**The problem:** Your Render services are configured like this:

```
┌──────────────────────────────────────────────────────────────────────┐
│ WHAT YOU HAVE NOW                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Git: DEV branch ──► Render: adagentai-api.onrender.com             │
│                           ↑                                          │
│                           └── This URL looks like "production"       │
│                               but it's running DEV code!             │
│                                                                      │
│  Meanwhile: main branch ──► ??? (nothing deploys from main)         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**What this means:** When someone visits your "production" API URL, they're actually getting whatever's on your DEV branch. This is backwards!

**Two options to fix this:**

#### Option A: Keep it Simple (Recommended for now)
Just rename what you have. Your DEV branch IS your production:

```bash
# Make DEV your main production branch
git checkout DEV
git branch -m main main-old    # Rename old main
git branch -m DEV main         # DEV becomes main
git push origin main --force   # Update remote

# Then update Render to deploy from "main"
```

#### Option B: Proper Setup (More work, better long-term)
Create separate services for staging vs production:

```
┌──────────────────────────────────────────────────────────────────────┐
│ PROPER SETUP                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  main branch ──► adagentai-api.onrender.com (PRODUCTION)            │
│                                                                      │
│  DEV branch  ──► adagentai-api-staging.onrender.com (STAGING)       │
│                                                                      │
│  PR branches ──► (preview environments, if you set up render.yaml)  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**For Option B**, change Render settings:
1. Go to https://dashboard.render.com/web/srv-d5copulactks73cp2h60 (API)
2. Settings → Build & Deploy → Branch → Change to `main`
3. Repeat for https://dashboard.render.com/web/srv-d5coq7i4d50c7389qtfg (Agent)
4. Create new services for staging (see Step 2)

### Step 2: Create Staging Services on Render

Create new Render services for staging that deploy from `DEV`:

| Service | Name | Branch | URL |
|---------|------|--------|-----|
| API Staging | `adagentai-api-staging` | `DEV` | adagentai-api-staging.onrender.com |
| Agent Staging | `adagentai-agent-staging` | `DEV` | adagentai-agent-staging.onrender.com |

---

## Observability Tools & Environments

### How Each Tool Handles Environments

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LANGSMITH (AI Tracing)                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Uses "Projects" as environments:                                       │
│                                                                         │
│    LANGSMITH_PROJECT=adagentai-prod     ← Production traces here       │
│    LANGSMITH_PROJECT=adagentai-staging  ← Staging traces here          │
│    LANGSMITH_PROJECT=adagentai-eval     ← Evaluation runs here         │
│                                                                         │
│  Each project is completely separate (different dashboards, datasets)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SENTRY (Error Tracking)                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Option A: One project, tag by environment (simpler)                    │
│    - Same DSN everywhere                                                │
│    - Sentry auto-detects environment from VERCEL_ENV                    │
│    - Filter in dashboard: environment:production                        │
│                                                                         │
│  Option B: Separate projects (recommended for larger teams)             │
│    - Different DSN per environment                                      │
│    - Cleaner separation of prod vs staging noise                        │
│                                                                         │
│  Your code at backend/api/src/lib/sentry.ts already supports this!     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ POSTHOG (Analytics)                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  One project, filter by property:                                       │
│    - Same API key everywhere                                            │
│    - Add environment as a property on all events                        │
│    - Filter in dashboard: environment = production                      │
│                                                                         │
│  Why one project? You want to see user journeys across environments.   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Environment Variables Summary

```bash
# ============================================
# LANGSMITH
# ============================================
LANGSMITH_API_KEY=lsv2_pt_xxx           # Same key everywhere (your account)
LANGSMITH_PROJECT=adagentai-prod        # Change per environment!
LANGSMITH_TRACING_V2=true               # Enable tracing

# ============================================
# SENTRY (Option A - one project)
# ============================================
SENTRY_DSN=https://xxx@oYYY.ingest.sentry.io/ZZZ  # Same DSN
# Sentry reads VERCEL_ENV automatically for environment tag

# ============================================
# SENTRY (Option B - separate projects)
# ============================================
# Production
SENTRY_DSN=https://xxx@oYYY.ingest.sentry.io/prod-project
# Staging
SENTRY_DSN=https://yyy@oYYY.ingest.sentry.io/staging-project

# ============================================
# POSTHOG
# ============================================
POSTHOG_API_KEY=phc_xxx                 # Same key everywhere
POSTHOG_HOST=https://us.i.posthog.com   # Same host
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx         # Frontend (same as above)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Secrets for GitHub Actions

Add these to GitHub → Settings → Secrets → Actions:

```
# Sentry
SENTRY_AUTH_TOKEN      # From sentry.io → Settings → Auth Tokens
SENTRY_ORG             # Your Sentry organization slug
SENTRY_PROJECT         # Project name (e.g., adagentai-api)

# LangSmith
LANGSMITH_API_KEY      # From smith.langchain.com → Settings → API Keys

# Anthropic (for LangSmith evals)
ANTHROPIC_API_KEY      # Your API key
```

---

### Step 3: Set Up Sentry Projects

Create separate Sentry projects for each environment:

```
Organization: Your Org
├── adagentai-api-prod      # Production API errors
├── adagentai-api-staging   # Staging API errors
├── adagentai-agent-prod    # Production Agent errors
└── adagentai-agent-staging # Staging Agent errors
```

Then set environment-specific DSNs:
```bash
# Production (Render prod services)
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/adagentai-api-prod

# Staging (Render staging services)
SENTRY_DSN=https://yyy@o123.ingest.sentry.io/adagentai-api-staging
```

### Step 4: Set Up PostHog Environments

PostHog approach - use ONE project but filter by environment:

```typescript
// In your PostHog init
posthog.init(POSTHOG_KEY, {
  // ... other options
  loaded: (posthog) => {
    // Tag all events with environment
    posthog.register({
      environment: process.env.NODE_ENV, // 'production' | 'development' | 'preview'
    });
  },
});
```

Then in PostHog dashboard, create filtered views:
- Production: `environment = production`
- Staging: `environment = development`
- Preview: `environment = preview`

---

## GitHub Actions Workflows

Create these files to automate deployments:

### `.github/workflows/preview-deploy.yml`
```yaml
name: Preview Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get PR Info
        id: pr
        run: |
          echo "branch=${{ github.head_ref }}" >> $GITHUB_OUTPUT
          echo "sha=${{ github.event.pull_request.head.sha }}" >> $GITHUB_OUTPUT

      # Vercel handles frontend preview automatically via GitHub integration
      # Neon creates DB branch automatically via Vercel integration

      # For Render preview (optional - requires Render Blueprint):
      # Render will auto-create preview if you have render.yaml configured

      - name: Comment Preview URLs
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const branch = '${{ steps.pr.outputs.branch }}';

            // Vercel preview URL pattern
            const vercelPreview = `https://ad-agent-ai-git-${branch.replace(/\//g, '-')}-sumanth-prasads-projects.vercel.app`;

            const body = `## 🚀 Preview Deployment

            | Service | URL |
            |---------|-----|
            | Frontend | ${vercelPreview} |
            | Database | \`preview/${branch}\` (Neon branch) |

            > Note: Backend preview requires Render Blueprint setup (see DEVOPS_GUIDE.md)
            `;

            github.rest.issues.createComment({
              issue_number: prNumber,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### `.github/workflows/production-deploy.yml`
```yaml
name: Production Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed for Sentry release

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install Dependencies
        run: |
          cd backend/api
          bun install

      - name: Run Database Migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd backend/api
          bun run db:push

      # ============================================
      # SENTRY RELEASE TRACKING
      # ============================================
      # This tells Sentry "this code is now in production"
      # So when errors happen, you know which commit caused them
      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: adagentai-api
        with:
          environment: production
          version: ${{ github.sha }}

      # Vercel auto-deploys main branch
      # Render auto-deploys if configured to watch main branch

      - name: Cleanup Preview Branches
        if: github.event_name == 'push'
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
        run: |
          # Delete old preview branches older than 7 days
          # This keeps your Neon project clean
          echo "Cleanup would run here - implement based on your needs"
```

### `.github/workflows/sentry-sourcemaps.yml` (Frontend Source Maps)
```yaml
# Upload source maps so Sentry shows readable stack traces
name: Upload Source Maps to Sentry

on:
  push:
    branches: [main]

jobs:
  sentry-sourcemaps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install and Build
        run: |
          cd frontend
          bun install
          bun run build

      - name: Upload Source Maps
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: adagentai-frontend
        with:
          environment: production
          sourcemaps: './frontend/.next'
          version: ${{ github.sha }}
```

### `.github/workflows/langsmith-eval.yml` (Optional - AI Quality Testing)
```yaml
# Run LangSmith evaluations to test AI quality before deploy
# Only enable this once you have evaluation datasets set up
name: LangSmith Evaluation

on:
  pull_request:
    paths:
      - 'backend/chat/**'  # Only run when chat code changes

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run LangSmith Evaluation
        env:
          LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
          LANGSMITH_PROJECT: adagentai-eval  # Separate project for evals
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cd backend
          # Example: python -m pytest tests/eval/ --langsmith
          echo "Add your evaluation script here"
          # See: https://docs.smith.langchain.com/evaluation
```

---

## render.yaml Blueprint (For Full Preview Environments)

Create this file in your repo root to enable Render preview environments:

```yaml
# render.yaml
previewsEnabled: true
previewsExpireAfterDays: 7

services:
  # API Service
  - type: web
    name: adagentai-api
    runtime: node
    region: oregon
    plan: starter
    branch: main
    buildCommand: cd backend/api && bun install
    startCommand: cd backend/api && bun start
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false  # Set manually per environment
      - key: BETTER_AUTH_SECRET
        sync: false
      - key: SENTRY_DSN
        sync: false
    previews:
      generation: automatic
      expireAfterDays: 3
      plan: starter

  # Agent Service
  - type: web
    name: adagentai-agent
    runtime: python
    region: oregon
    plan: starter
    branch: main
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn chat_server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: API_URL
        sync: false
    previews:
      generation: automatic
      expireAfterDays: 3
      plan: starter
```

---

## Environment Variables Reference

### Required Secrets (GitHub Actions)

Add these to your GitHub repo: Settings → Secrets → Actions

```
DATABASE_URL          # Production Neon connection string
NEON_API_KEY          # From Neon Console → Account → API Keys
NEON_PROJECT_ID       # restless-art-39326510 (your project)
VERCEL_TOKEN          # From Vercel → Account Settings → Tokens
RENDER_API_KEY        # From Render → Account Settings → API Keys
```

### Per-Environment Variables

| Variable | Production | Staging | Preview |
|----------|------------|---------|---------|
| `DATABASE_URL` | main branch | preview/DEV | Auto by Vercel-Neon |
| `SENTRY_DSN` | prod project | staging project | staging project |
| `POSTHOG_API_KEY` | Same key | Same key | Same key |
| `POSTHOG_HOST` | Same host | Same host | Same host |
| `BETTER_AUTH_URL` | dashboard.kovio.dev | staging.kovio.dev | [preview-url] |
| `NEXT_PUBLIC_API_URL` | api.kovio.dev | api-staging.kovio.dev | [preview-api] |

---

## Database Migration Workflow

### Safe Schema Changes (The Lazy Way)

```bash
# 1. Create a feature branch
git checkout -b feature/add-new-column

# 2. Make schema changes in backend/api/src/db/schema.ts
# ... edit file ...

# 3. Generate migration
cd backend/api
bun run db:generate

# 4. Test locally (uses your local DATABASE_URL)
bun run db:push

# 5. Commit and push
git add .
git commit -m "feat: add new column to users table"
git push -u origin feature/add-new-column

# 6. Open PR → Vercel creates preview + Neon creates DB branch
#    Your migration runs against the PREVIEW branch, not production!

# 7. Test in preview environment

# 8. Merge PR → GitHub Action runs migration against production
```

### Rollback Strategy

If a migration goes wrong:

```bash
# Option 1: Neon Time Travel (within 7 days)
# Go to Neon Console → Branches → main → Restore to point-in-time

# Option 2: Reset from backup branch
neon branches reset main --parent backup-before-migration

# Option 3: Manual SQL rollback
# Write a down migration and run it
```

---

## Quick Reference Commands

```bash
# Local Development
cd frontend && bun run dev              # Start all services

# Database
cd backend/api && bun run db:studio     # Open Drizzle Studio
cd backend/api && bun run db:push       # Push schema changes
cd backend/api && bun run db:generate   # Generate migrations

# Testing
cd frontend && bun run lint             # Type check
cd backend/api && bun run test:run      # Run API tests
cd frontend && bun run test:e2e         # Run E2E tests

# Git Workflow
git checkout -b feature/P-123-description  # New feature
git push -u origin feature/P-123-description # Push and create PR
```

---

## Monitoring & Debugging

### Sentry Error Tracking

Your code already supports Sentry (`backend/api/src/lib/sentry.ts`). Just add the DSN:

```bash
# In Render environment variables
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
```

Sentry will auto-capture:
- Uncaught exceptions
- Unhandled promise rejections
- Error boundaries (React)

### PostHog Analytics

Your code already supports PostHog (`frontend/src/components/providers/posthog-provider.tsx`). Add:

```bash
# In Vercel environment variables
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # or eu.posthog.com
```

Track custom events:
```typescript
import posthog from 'posthog-js';

// Track user actions
posthog.capture('chat_message_sent', {
  provider: 'admob',
  message_length: 150,
});
```

---

## Architecture Diagram

```
                                    ┌─────────────────────┐
                                    │   GitHub Repository │
                                    │   (KVLabsCode/      │
                                    │    ADAgentAI)       │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
           │    Vercel     │          │    Render     │          │     Neon      │
           │   (Frontend)  │          │   (Backend)   │          │  (Database)   │
           └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
                   │                          │                          │
        ┌──────────┴──────────┐    ┌──────────┴──────────┐    ┌──────────┴──────────┐
        │                     │    │                     │    │                     │
        ▼                     ▼    ▼                     ▼    ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Production  │      │  Preview     │      │  Production  │      │    main      │
│  (main)      │      │  (per PR)    │      │  (main)      │      │   branch     │
│              │      │              │      │              │      │              │
│ dashboard.   │      │ pr-123.      │      │ api.kovio.   │      │ Production   │
│ kovio.dev    │      │ vercel.app   │      │ dev          │      │ data         │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                                                   │                     │
                                                   │              ┌──────┴──────┐
                                                   │              │             │
                                                   │              ▼             ▼
                                                   │      ┌──────────────┐ ┌──────────────┐
                                                   │      │ preview/DEV  │ │ preview/     │
                                                   │      │              │ │ feature-xyz  │
                                                   │      │ Staging      │ │ PR preview   │
                                                   │      │ data         │ │ data         │
                                                   │      └──────────────┘ └──────────────┘
                                                   │              ▲
                                                   └──────────────┘
                                                 (staging points here)
```

---

## Next Steps

1. **Quick Wins (Do Today)**
   - [ ] Change Render services to deploy from `main` branch
   - [ ] Add `SENTRY_DSN` to Render environment variables
   - [ ] Add PostHog environment variables to Vercel

2. **This Week**
   - [ ] Create staging services on Render
   - [ ] Set up separate Sentry projects for staging/prod
   - [ ] Add the GitHub Actions workflows above

3. **Later**
   - [ ] Add `render.yaml` for full preview environments
   - [ ] Set up custom domains (staging.kovio.dev)
   - [ ] Add Playwright tests to CI pipeline

---

## Local vs Vercel: Why Builds Fail

### The Problem

You run `bun run lint` locally → passes ✅
You push to Vercel → build fails ❌

**Why?** Vercel runs `next build`, which is stricter than `eslint` or `tsc`.

### What's Different

| Check | What It Catches | Strictness |
|-------|-----------------|------------|
| `bun run lint` | ESLint rules | Medium |
| `tsc --noEmit` | TypeScript errors | Medium |
| `next build` | TS + ESLint + Turbopack + more | **Strict** |

Next.js build additionally checks:
- Unused variables (treats as errors)
- Import resolution (stricter with Turbopack)
- Server/client component boundaries
- Missing dependencies

### The Fix: Run the Same Check Locally

**Before pushing, always run:**

```bash
cd frontend && bun run build
```

This is **exactly** what Vercel runs. If it passes locally, it passes on Vercel.

### Add a Verify Script

Your `frontend/package.json` should have:

```json
{
  "scripts": {
    "dev": "...",
    "build": "next build",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "verify": "bun run typecheck && bun run lint && bun run build"
  }
}
```

Then run `bun run verify` before pushing to catch everything.

### Automate It (Optional)

Add to `.github/workflows/typecheck.yml`:

```yaml
name: Type Check

on:
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd frontend && bun install
      - run: cd frontend && bun run build
```

Now PRs will fail fast before Vercel even tries to deploy.

---

## Bun Runtime on Vercel (Optional)

### What Is It?

You're already using Bun locally when you run `bun run dev`. But on Vercel, your serverless functions (API routes) run on **Node.js** by default.

Enabling Bun runtime means Vercel runs your functions with Bun instead of Node.js.

### Why Enable It?

| Reason | Benefit |
|--------|---------|
| Consistency | Local dev = production (both use Bun) |
| Speed | Bun is faster for CPU-bound tasks |
| Hype | It's the cool new thing 😎 |

### How to Enable

Create `frontend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x"
}
```

And update `frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build",
    "start": "bun run --bun next start"
  }
}
```

### Does It Help Local Dev?

**No** - you're already using Bun locally. This setting only affects Vercel's servers.

But it ensures **consistency**: what works locally works in production (same runtime).

---

## Your Daily Workflow (Once Set Up)

Here's what your life looks like after setup:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Start a feature                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   git checkout -b feature/P-123-add-cool-thing                         │
│   # Make your changes...                                                │
│   git push -u origin feature/P-123-add-cool-thing                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Open a PR (automatic magic happens!)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   GitHub PR opened                                                      │
│        │                                                                │
│        ├──► Vercel: Creates preview at pr-123.vercel.app               │
│        │                                                                │
│        └──► Neon: Creates DB branch preview/feature/P-123-...          │
│                   (instant copy of production data!)                    │
│                                                                         │
│   You get a comment with preview URLs. Share with teammates!           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Test in preview                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Visit pr-123.vercel.app                                              │
│   - Frontend: Your new changes                                         │
│   - Database: Isolated copy (break it, nobody cares!)                  │
│   - Make schema changes? Only affects YOUR preview branch              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Merge PR (production deploy)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Click "Merge" on GitHub                                              │
│        │                                                                │
│        ├──► Vercel: Deploys to kovio.dev (production)                  │
│        │                                                                │
│        ├──► GitHub Action: Runs migrations on production DB            │
│        │                                                                │
│        └──► Neon: Preview branch can be deleted (cleanup)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**That's it!** No manual deployments, no "oops I broke staging", no "which database am I connected to?". Just push code and let the machines handle the rest.

---

## Useful Links

- [Neon Branching Docs](https://neon.tech/docs/introduction/branching)
- [Vercel Environments](https://vercel.com/docs/deployments/environments) ← The video you watched
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Vercel Manual Promotion](https://vercel.com/docs/deployments/managing-deployments#manually-promoting-to-production)
- [Render Preview Environments](https://render.com/docs/preview-environments)
- [Vercel + Neon Integration](https://neon.tech/docs/guides/vercel)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
