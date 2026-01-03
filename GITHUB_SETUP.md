# GitHub Repository Setup

## 1. Push Code
```bash
git init
git remote add origin https://github.com/YOUR_ORG/adagentai.git
git add .
git commit -m "Initial commit: Platform backend"
git push -u origin main
```

## 2. Repository Secrets
Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Auth secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `POLAR_ACCESS_TOKEN` | Polar billing token |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `POSTHOG_API_KEY` | PostHog analytics key |

## 3. Branch Protection (Optional)
**Settings → Branches → Add rule** for `main`:
- ✅ Require status checks (ci / api-test)
- ✅ Require PR reviews

## 4. CI will auto-run on:
- Push to `main` / `develop`
- Pull requests to `main` / `develop`

Workflow: `.github/workflows/ci.yml`
