import { PostHog } from "posthog-node";

let posthog: PostHog | null = null;

/**
 * Initialize PostHog for product analytics
 */
export function initAnalytics() {
  const apiKey = Bun.env.POSTHOG_API_KEY;
  const host = Bun.env.POSTHOG_HOST || "https://us.i.posthog.com";

  if (!apiKey) {
    console.warn("POSTHOG_API_KEY not configured, analytics disabled");
    return;
  }

  posthog = new PostHog(apiKey, {
    host,
    // Flush events every 30 seconds or when 20 events are queued
    flushAt: 20,
    flushInterval: 30000,
  });

  console.log("PostHog initialized for product analytics");
}

/**
 * Track an event with properties
 */
export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  if (!posthog) return;

  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: "kvlabs-api",
      environment: Bun.env.NODE_ENV || "development",
    },
  });
}

/**
 * Identify a user with their properties
 */
export function identifyUser(
  distinctId: string,
  properties: Record<string, unknown>
) {
  if (!posthog) return;

  posthog.identify({
    distinctId,
    properties,
  });
}

/**
 * Track user sign-up
 */
export function trackSignUp(userId: string, email: string, provider: string) {
  trackEvent(userId, "user_signed_up", {
    email,
    auth_provider: provider,
  });
}

/**
 * Track provider connection
 */
export function trackProviderConnected(
  userId: string,
  provider: "admob" | "gam",
  success: boolean
) {
  trackEvent(userId, "provider_connected", {
    provider,
    success,
  });
}

/**
 * Track chat session
 */
export function trackChatSession(
  userId: string,
  sessionId: string,
  messageCount: number
) {
  trackEvent(userId, "chat_session", {
    session_id: sessionId,
    message_count: messageCount,
  });
}

/**
 * Track subscription event
 */
export function trackSubscription(
  userId: string,
  action: "checkout_started" | "subscribed" | "canceled",
  plan?: string
) {
  trackEvent(userId, `subscription_${action}`, {
    plan,
  });
}

/**
 * Flush all pending events (call on shutdown)
 */
export async function flushAnalytics() {
  if (!posthog) return;
  await posthog.shutdown();
}

export { posthog };
