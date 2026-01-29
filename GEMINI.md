# GEMINI.md

This document provides a comprehensive overview of the ADAgentAI project, designed to be used as a context for interacting with the Gemini CLI.

## Project Overview

ADAgentAI is an AI-powered assistant for managing AdMob and Google Ad Manager accounts. It allows users to ask questions in plain English and get instant insights about their ad performance.

The project is a monorepo with a frontend, backend, and several other packages.

*   **Frontend:** The frontend is a Next.js application written in TypeScript. It uses Tailwind CSS for styling and shadcn/ui for components. The application is served from the `frontend` directory.

*   **Backend:** The backend consists of two main services:
    *   **API Server:** A Hono API server written in TypeScript that runs on Bun. It handles authentication, billing, and provider OAuth. The API server is located in the `backend/api` directory.
    *   **Chat Agent:** A FastAPI server that provides a chat interface for interacting with the AI agent. It uses LangGraph for state management and SSE for streaming and communicates with the Anthropic Claude LLM. The chat agent is located in the `backend/` directory and its main entry point is `chat_server.py`.

*   **Database:** The application uses a Neon PostgreSQL database to store user data, sessions, and provider tokens. The database schema is managed with Drizzle ORM.

## Building and Running

### Prerequisites

*   Bun 1.0+
*   Python 3.11+
*   uv (Python package manager)

### Installation

1.  **Frontend Dependencies:**
    ```bash
    cd frontend && bun install
    ```

2.  **API Dependencies:**
    ```bash
    cd backend/api && bun install
    ```

3.  **Python Dependencies:**
    ```bash
    cd backend && uv sync
    ```

### Database Setup

1.  Navigate to the `backend/api` directory:
    ```bash
    cd backend/api
    ```

2.  Create the database tables:
    ```bash
    bun run db:push
    ```

3.  (Optional) Open Drizzle Studio to view and manage the database:
    ```bash
    bun run db:studio
    ```

### Running the Application

To run all services concurrently, navigate to the `frontend` directory and run the `dev` command:

```bash
cd frontend && bun run dev
```

This will start the following services:

*   **Frontend:** `http://localhost:3000`
*   **API Server:** `http://localhost:3001`
*   **Chat Agent:** `http://localhost:5001`

## Development Conventions

### Testing

*   **End-to-end Tests:** The project uses Playwright for end-to-end testing. To run the tests, use the following command in the `frontend` directory:
    ```bash
    bun run test:e2e
    ```

*   **API Tests:** The API server has a suite of unit tests. To run the tests, use the following command in the `backend/api` directory:
    ```bash
    bun run test:run
    ```

### Design System

The project has a comprehensive design system with W3C DTCG tokens, atomic design principles, and a Linear-inspired UI. To build the CSS from the design tokens, run the following command in the `frontend` directory:

```bash
bun run tokens:build
```

### Key Patterns

*   **SSE Streaming:** The frontend uses a custom chat UI with SSE (Server-Sent Events) for streaming. The backend streams LangGraph execution via SSE with interleaved events.
*   **Tool Approval (Human-in-Loop):** Dangerous tools require user approval.
*   **Unified MCP:** `backend/mcp_servers/` provides 252 tools for 9 ad networks (AdMob, Unity, etc.).
*   **Query Classification:** A lightweight LLM call classifies user queries to route to appropriate specialists.