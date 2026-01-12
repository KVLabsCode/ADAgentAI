# ADAgentAI Frontend

Next.js frontend for ADAgentAI - an AI-powered assistant for managing AdMob and Google Ad Manager accounts.

## Getting Started

Run the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This starts all services concurrently:
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Chat Agent**: http://localhost:5000

## Individual Services

```bash
# Frontend only
bun run dev:frontend

# Run tests
bun run test:e2e
bun run lint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [ADAgentAI Documentation](../README.md)
