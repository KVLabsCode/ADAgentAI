import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import { initSentry } from "./lib/sentry";
import { initAnalytics, flushAnalytics } from "./lib/analytics";
import { errorHandler } from "./middleware/error-handler";
import healthRoutes from "./routes/health";
import chatRoutes from "./routes/chat";
import providerRoutes from "./routes/providers";
import billingRoutes from "./routes/billing";
import webhookRoutes from "./routes/webhooks";
import { publicBlog, adminBlog } from "./routes/blog";
import waitlistRoutes from "./routes/waitlist";
import agentRoutes from "./routes/agents";
import accountRoutes from "./routes/account";
import inviteLinksRoutes from "./routes/invite-links";
import internalRoutes from "./routes/internal";
import adSourcesRoutes from "./routes/ad-sources";
import fieldOptionsRoutes from "./routes/field-options";
import adminUsageRoutes from "./routes/admin/usage";
import adminConversationsRoutes from "./routes/admin/conversations";
import adminStatsRoutes from "./routes/admin/stats";
import testAuthRoutes from "./routes/test-auth";

// Initialize observability (as early as possible)
initSentry();
initAnalytics();

const app = new Hono();

// ============================================================
// Global Middleware
// ============================================================

// Request timing
app.use("*", timing());

// Request logging
app.use("*", logger());

// Security headers
app.use("*", secureHeaders());

// CORS configuration - supports multiple origins including Vercel previews
const allowedOrigins = [
  Bun.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3002",
  "https://ad-agent-ai.vercel.app",
  "https://www.internal.kovio.dev",
  "https://www.dashboard.kovio.dev",
];

// Add Vercel preview pattern if configured
const vercelProjectName = Bun.env.VERCEL_PROJECT_NAME;

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return allowedOrigins[0];

      // Check exact matches
      if (allowedOrigins.includes(origin)) return origin;

      // Allow Vercel preview deployments (pattern: *-username-projects.vercel.app)
      if (origin.endsWith(".vercel.app")) {
        // Allow all Vercel preview URLs for this project
        if (vercelProjectName && origin.includes(vercelProjectName)) {
          return origin;
        }
        // Also allow common Vercel patterns for the project
        if (origin.includes("sumanth-prasads-projects")) {
          return origin;
        }
      }

      // Fallback - don't allow
      console.warn(`CORS blocked origin: ${origin}`);
      return allowedOrigins[0];
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-stack-access-token", "x-organization-id"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400, // 24 hours
  })
);

// Global error handler
app.use("*", errorHandler);

// ============================================================
// Routes
// ============================================================

// Root endpoint for Render health checks (HEAD /)
app.get("/", (c) => {
  return c.json({ status: "ok", service: "kvlabs-api" });
});

// Health check endpoints
app.route("/health", healthRoutes);

// API version prefix
const api = new Hono();

// API info endpoint
api.get("/", (c) => {
  return c.json({
    name: "KVLabs API",
    version: "0.1.0",
    docs: "/api/docs",
  });
});

// Feature routes
api.route("/chat", chatRoutes);
api.route("/providers", providerRoutes);
api.route("/ad-sources", adSourcesRoutes);
api.route("/field-options", fieldOptionsRoutes);
api.route("/billing", billingRoutes);
api.route("/blog", publicBlog);
api.route("/admin/blog", adminBlog);
api.route("/waitlist", waitlistRoutes);
api.route("/admin/agents", agentRoutes);
api.route("/account", accountRoutes);
api.route("/invite-links", inviteLinksRoutes);
api.route("/internal", internalRoutes);
api.route("/admin/usage", adminUsageRoutes);
api.route("/admin/conversations", adminConversationsRoutes);
api.route("/admin/stats", adminStatsRoutes);

// Test auth route (only enabled in CI/test environments)
api.route("/test-auth", testAuthRoutes);

// Webhook routes (outside /api for cleaner URLs)
app.route("/webhooks", webhookRoutes);

app.route("/api", api);

// ============================================================
// Server (Bun native)
// ============================================================

const port = Number(Bun.env.PORT) || 3001;

console.log(`
╔══════════════════════════════════════════════════════════╗
║                    KVLabs API Server                      ║
╠══════════════════════════════════════════════════════════╣
║  Status:    Running                                       ║
║  Runtime:   Bun ${Bun.version.padEnd(40)}║
║  Port:      ${port.toString().padEnd(45)}║
║  Env:       ${(Bun.env.NODE_ENV || "development").padEnd(45)}║
║  Health:    http://localhost:${port}/health${" ".repeat(24)}║
║  Auth:      http://localhost:${port}/api/auth${" ".repeat(22)}║
╚══════════════════════════════════════════════════════════╝
`);

// Graceful shutdown handler
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await flushAnalytics();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await flushAnalytics();
  process.exit(0);
});

// Bun native server export
export default {
  port,
  fetch: app.fetch,
};

// Export app type for RPC client
export type AppType = typeof app;
