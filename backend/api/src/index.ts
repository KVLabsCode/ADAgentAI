import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import { auth } from "./lib/auth";
import { initSentry } from "./lib/sentry";
import { initAnalytics, flushAnalytics } from "./lib/analytics";
import { errorHandler } from "./middleware/error-handler";
import healthRoutes from "./routes/health";
import chatRoutes from "./routes/chat";
import providerRoutes from "./routes/providers";
import billingRoutes from "./routes/billing";
import webhookRoutes from "./routes/webhooks";
import { publicBlog, adminBlog } from "./routes/blog";

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

// CORS configuration
app.use(
  "*",
  cors({
    origin: Bun.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400, // 24 hours
  })
);

// Global error handler
app.use("*", errorHandler);

// ============================================================
// Routes
// ============================================================

// Health check endpoints
app.route("/health", healthRoutes);

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

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
api.route("/billing", billingRoutes);
api.route("/blog", publicBlog);
api.route("/admin/blog", adminBlog);

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
