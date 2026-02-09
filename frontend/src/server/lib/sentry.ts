import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Should be called as early as possible in the application
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn("SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "0.1.0",

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },

    // Ignore common non-actionable errors
    ignoreErrors: [
      "AbortError",
      "Network request failed",
      "Load failed",
    ],
  });

  console.log("Sentry initialized for error tracking");
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with optional level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

export { Sentry };
