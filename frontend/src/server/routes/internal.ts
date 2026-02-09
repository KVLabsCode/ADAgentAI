/**
 * Internal API endpoints for service-to-service communication.
 * Protected by internal API key (not user auth).
 * Used by chat agent, LangGraph nodes, etc.
 */

import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../db";
import { connectedProviders, userProviderPreferences, runSummaries } from "../db/schema";
import { safeDecrypt } from "../lib/crypto";

const internal = new Hono();

// ============================================================
// Types
// ============================================================

interface AdMobApp {
  id: string;
  name: string;
  platform: "ANDROID" | "IOS" | "UNKNOWN";
  enabled: boolean;
}

interface AdMobAccount {
  id: string;
  publisherId: string;
  displayName: string;
  enabled: boolean;
  apps: AdMobApp[];
}

interface GAMNetwork {
  id: string;
  networkCode: string;
  displayName: string;
  enabled: boolean;
}

interface EntitiesResponse {
  admob: {
    accounts: AdMobAccount[];
  };
  gam: {
    networks: GAMNetwork[];
  };
  cached: boolean;
  cachedAt?: string;
}

// ============================================================
// In-memory cache (5 minute TTL)
// ============================================================

interface CacheEntry {
  data: EntitiesResponse;
  timestamp: number;
}

const entityCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, organizationId: string | null): string {
  return `${userId}:${organizationId || "personal"}`;
}

function getCachedEntities(userId: string, organizationId: string | null): EntitiesResponse | null {
  const key = getCacheKey(userId, organizationId);
  const entry = entityCache.get(key);

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    entityCache.delete(key);
    return null;
  }

  return {
    ...entry.data,
    cached: true,
    cachedAt: new Date(entry.timestamp).toISOString(),
  };
}

function setCachedEntities(
  userId: string,
  organizationId: string | null,
  data: Omit<EntitiesResponse, "cached" | "cachedAt">
): void {
  const key = getCacheKey(userId, organizationId);
  entityCache.set(key, {
    data: { ...data, cached: false },
    timestamp: Date.now(),
  });
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of entityCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      entityCache.delete(key);
    }
  }
}, 60 * 1000); // Every minute

// ============================================================
// Middleware: Verify internal API key
// ============================================================

internal.use("*", async (c, next) => {
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

// ============================================================
// Helpers
// ============================================================

/**
 * Refresh an access token using a refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

/**
 * Get valid access token for a provider, refreshing if needed
 */
async function getValidAccessToken(
  provider: typeof connectedProviders.$inferSelect
): Promise<string | null> {
  const decryptedAccessToken = await safeDecrypt(provider.accessToken);
  const decryptedRefreshToken = await safeDecrypt(provider.refreshToken);

  if (!decryptedAccessToken) return null;

  // Check if token needs refresh (5 min before expiry)
  const now = new Date();
  const expiresAt = provider.tokenExpiresAt;
  const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (needsRefresh && decryptedRefreshToken) {
    try {
      const newTokens = await refreshAccessToken(decryptedRefreshToken);
      // Note: We don't persist the refreshed token here to avoid race conditions
      // The providers.ts routes handle token persistence
      return newTokens.access_token;
    } catch (error) {
      console.error("[internal/entities] Token refresh failed:", error);
      // Return existing token, might still work
      return decryptedAccessToken;
    }
  }

  return decryptedAccessToken;
}

/**
 * Fetch apps for an AdMob account
 */
async function fetchAdMobApps(
  publisherId: string,
  accessToken: string
): Promise<AdMobApp[]> {
  try {
    const accountId = publisherId.startsWith("pub-") ? publisherId : `pub-${publisherId}`;

    const response = await fetch(
      `https://admob.googleapis.com/v1/accounts/${accountId}/apps?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.error("[internal/entities] AdMob apps API error:", await response.text());
      return [];
    }

    const data = (await response.json()) as {
      apps?: Array<{
        name?: string;
        appId?: string;
        platform?: string;
        manualAppInfo?: { displayName?: string };
        linkedAppInfo?: { displayName?: string };
      }>;
    };

    return (data.apps || []).map((app) => ({
      id: app.appId || app.name?.split("/").pop() || "",
      name: app.linkedAppInfo?.displayName || app.manualAppInfo?.displayName || "Unnamed App",
      platform: (app.platform as "ANDROID" | "IOS") || "UNKNOWN",
      enabled: true, // Apps don't have individual enabled status
    }));
  } catch (error) {
    console.error("[internal/entities] Error fetching AdMob apps:", error);
    return [];
  }
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /internal/entities - Fetch all entities for a user
 *
 * Returns all connected providers and their entities (apps, networks)
 * for use in entity grounding and context injection.
 *
 * Query params:
 *   - userId (required): User ID
 *   - organizationId (optional): Organization ID (null = personal context)
 *   - includeApps (optional): Whether to fetch apps for AdMob accounts (default: true)
 *
 * Response includes:
 *   - admob.accounts: List of AdMob accounts with apps
 *   - gam.networks: List of GAM networks
 *   - cached: Whether response was served from cache
 */
internal.get("/entities", async (c) => {
  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId") || null;
  const includeApps = c.req.query("includeApps") !== "false";

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  // Check cache first
  const cached = getCachedEntities(userId, organizationId);
  if (cached) {
    return c.json(cached);
  }

  // Build filter for organization context
  const whereClause = organizationId
    ? and(
        eq(connectedProviders.userId, userId),
        eq(connectedProviders.organizationId, organizationId)
      )
    : and(
        eq(connectedProviders.userId, userId),
        isNull(connectedProviders.organizationId)
      );

  // Fetch all providers
  const providers = await db.query.connectedProviders.findMany({
    where: whereClause,
  });

  // Get user's preferences for these providers
  const providerIds = providers.map((p) => p.id);
  const userPrefs =
    providerIds.length > 0
      ? await db.query.userProviderPreferences.findMany({
          where: and(
            eq(userProviderPreferences.userId, userId),
            sql`${userProviderPreferences.providerId} = ANY(ARRAY[${sql.join(
              providerIds.map((id) => sql`${id}::uuid`),
              sql`, `
            )}])`
          ),
        })
      : [];

  // Create preference map
  const prefMap = new Map(userPrefs.map((p) => [p.providerId, p.isEnabled]));

  // Separate by provider type
  const admobProviders = providers.filter((p) => p.provider === "admob");
  const gamProviders = providers.filter((p) => p.provider === "gam");

  // Build AdMob accounts with apps
  const admobAccounts: AdMobAccount[] = [];
  for (const provider of admobProviders) {
    const isEnabled = prefMap.get(provider.id) !== false;

    let apps: AdMobApp[] = [];
    if (includeApps && provider.publisherId) {
      const accessToken = await getValidAccessToken(provider);
      if (accessToken) {
        apps = await fetchAdMobApps(provider.publisherId, accessToken);
      }
    }

    admobAccounts.push({
      id: provider.id,
      publisherId: provider.publisherId || "",
      displayName: provider.accountName || `AdMob Account (${provider.publisherId})`,
      enabled: isEnabled,
      apps,
    });
  }

  // Build GAM networks
  const gamNetworks: GAMNetwork[] = gamProviders.map((provider) => ({
    id: provider.id,
    networkCode: provider.networkCode || "",
    displayName: provider.accountName || `GAM Network (${provider.networkCode})`,
    enabled: prefMap.get(provider.id) !== false,
  }));

  const response: EntitiesResponse = {
    admob: { accounts: admobAccounts },
    gam: { networks: gamNetworks },
    cached: false,
  };

  // Cache the response
  setCachedEntities(userId, organizationId, response);

  return c.json(response);
});

/**
 * POST /internal/entities/invalidate - Invalidate cache for a user
 *
 * Call this when providers are connected/disconnected or preferences change.
 */
internal.post("/entities/invalidate", async (c) => {
  const body = (await c.req.json()) as { userId: string; organizationId?: string };
  const { userId, organizationId } = body;

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const key = getCacheKey(userId, organizationId || null);
  const deleted = entityCache.delete(key);

  return c.json({ success: true, invalidated: deleted });
});

// ============================================================
// Run Summaries - Store metrics from chat runs
// ============================================================

interface RunSummaryPayload {
  user_id: string;
  organization_id?: string | null;
  langsmith_run_id: string;
  thread_id?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  tool_calls?: number;
  latency_ms?: number | null;
  status?: string;
  error_message?: string | null;
  service?: string | null;
  capability?: string | null;
  model?: string | null;
  total_cost?: number | null;
  created_at?: string | null;
}

/**
 * POST /internal/run-summaries - Save a run summary from the chat agent
 *
 * This endpoint receives metrics from completed LangGraph runs
 * and stores them in the run_summaries table for analytics.
 */
internal.post("/run-summaries", async (c) => {
  try {
    const payload = (await c.req.json()) as RunSummaryPayload;

    if (!payload.user_id) {
      return c.json({ error: "user_id is required" }, 400);
    }

    if (!payload.langsmith_run_id) {
      return c.json({ error: "langsmith_run_id is required" }, 400);
    }

    // Insert the run summary
    const [inserted] = await db.insert(runSummaries).values({
      userId: payload.user_id,
      organizationId: payload.organization_id || null,
      langsmithRunId: payload.langsmith_run_id,
      inputTokens: payload.input_tokens || 0,
      outputTokens: payload.output_tokens || 0,
      totalTokens: payload.total_tokens || 0,
      toolCalls: payload.tool_calls || 0,
      latencyMs: payload.latency_ms || null,
      status: (payload.status as "success" | "error" | "cancelled") || "success",
      errorMessage: payload.error_message || null,
      service: payload.service || null,
      capability: payload.capability || null,
      model: payload.model || null,
      totalCost: payload.total_cost || null,
      createdAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    }).returning({ id: runSummaries.id });

    console.log(`[internal/run-summaries] Saved run summary: ${inserted.id} for user ${payload.user_id}`);

    return c.json({ success: true, id: inserted.id }, 201);
  } catch (error) {
    console.error("[internal/run-summaries] Error saving run summary:", error);
    return c.json({ error: "Failed to save run summary" }, 500);
  }
});

export default internal;
