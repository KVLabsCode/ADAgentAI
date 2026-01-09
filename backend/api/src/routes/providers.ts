import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "../db";
import { connectedProviders, userProviderPreferences, type NewConnectedProvider } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { trackProviderConnected } from "../lib/analytics";
import { safeEncrypt, safeDecrypt } from "../lib/crypto";
import { sql } from "drizzle-orm";

const providers = new Hono();

// Most routes require authentication
providers.use("*", async (c, next) => {
  const path = c.req.path;
  // Skip auth for internal endpoints (uses API key instead)
  if (path.includes("/internal/")) {
    return next();
  }
  // Skip auth for OAuth callbacks (Google redirects here without auth token)
  if (path.includes("/callback/")) {
    return next();
  }
  return requireAuth(c, next);
});

// ============================================================
// Schemas
// ============================================================

const providerTypeSchema = z.enum(["admob", "gam"]);

const toggleProviderSchema = z.object({
  isEnabled: z.boolean(),
});

// ============================================================
// OAuth Configuration
// ============================================================

const OAUTH_CONFIG = {
  admob: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/admob.readonly",
  },
  gam: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/dfp",
  },
} as const;

// ============================================================
// Helpers
// ============================================================

/**
 * Check if user is an admin/owner of the current organization
 * Returns true if personal context (no org) or if user is admin/owner
 */
async function isOrgAdmin(userId: string, organizationId: string | null): Promise<boolean> {
  // Personal context - user owns their own providers
  if (!organizationId) return true;

  // Check org membership role via Neon Auth
  const result = await db.execute(sql`
    SELECT role FROM neon_auth.member
    WHERE "userId" = ${userId}
    AND "organizationId" = ${organizationId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ role: string }>;
  if (!rows || rows.length === 0) return false;

  const role = rows[0].role;
  return role === "owner" || role === "admin";
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /providers - List user's connected providers
 * When in organization context, returns org-scoped providers with user's enabled preference
 * When in personal context, returns personal providers (organizationId is null)
 */
providers.get("/", async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;

  // Build filter: if org selected, filter by org; otherwise personal (null organizationId)
  const whereClause = organizationId
    ? and(eq(connectedProviders.userId, user.id), eq(connectedProviders.organizationId, organizationId))
    : and(eq(connectedProviders.userId, user.id), isNull(connectedProviders.organizationId));

  const orgProviders = await db.query.connectedProviders.findMany({
    where: whereClause,
    columns: {
      id: true,
      provider: true,
      publisherId: true,
      networkCode: true,
      accountName: true,
      isEnabled: true,
      lastSyncAt: true,
      createdAt: true,
      organizationId: true,
    },
  });

  // Get user's preferences for these providers
  const providerIds = orgProviders.map(p => p.id);
  const userPrefs = providerIds.length > 0
    ? await db.query.userProviderPreferences.findMany({
        where: and(
          eq(userProviderPreferences.userId, user.id),
          sql`${userProviderPreferences.providerId} = ANY(ARRAY[${sql.join(providerIds.map(id => sql`${id}::uuid`), sql`, `)}])`
        ),
      })
    : [];

  // Create a map of provider preferences
  const prefMap = new Map(userPrefs.map(p => [p.providerId, p.isEnabled]));

  // Check if user can manage providers (admin/owner)
  const canManage = await isOrgAdmin(user.id, organizationId);

  return c.json({
    providers: orgProviders.map((p) => ({
      id: p.id,
      type: p.provider,
      name: p.accountName || getProviderDisplayName(p.provider),
      identifier: p.provider === "admob" ? p.publisherId : p.networkCode,
      isEnabled: prefMap.get(p.id) ?? true, // Default to enabled if no preference
      lastSyncAt: p.lastSyncAt,
      connectedAt: p.createdAt,
      organizationId: p.organizationId,
    })),
    canManage, // Frontend uses this to show/hide connect/disconnect buttons
  });
});

/**
 * POST /providers/connect/:type - Initiate OAuth for provider
 * Returns the OAuth URL to redirect the user to
 * Requires org admin role when in organization context
 */
providers.post(
  "/connect/:type",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const user = c.get("user");
    const { type } = c.req.valid("param");

    // Check if user can manage providers (admin only for org context)
    const canManage = await isOrgAdmin(user.id, user.organizationId);
    if (!canManage) {
      return c.json({ error: "Only organization admins can connect providers" }, 403);
    }

    const config = OAUTH_CONFIG[type];

    // Encode user ID and org ID in state for the callback
    // Format: randomUUID:userId:organizationId (orgId can be empty)
    const stateData = {
      nonce: crypto.randomUUID(),
      userId: user.id,
      organizationId: user.organizationId || "",
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: Bun.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${Bun.env.BACKEND_URL}/api/providers/callback/${type}`,
      response_type: "code",
      scope: config.scope,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return c.json({
      authUrl,
      state,
      provider: type,
    });
  }
);

/**
 * GET /providers/callback/:type - OAuth callback handler
 * Exchanges code for tokens and stores the connection
 * Note: This route skips auth middleware - user info comes from state parameter
 */
providers.get(
  "/callback/:type",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const { type } = c.req.valid("param");
    const code = c.req.query("code");
    const stateParam = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?error=${error}`
      );
    }

    if (!code) {
      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?error=no_code`
      );
    }

    // Extract user info from state parameter
    if (!stateParam) {
      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?error=invalid_state`
      );
    }

    let userId: string;
    let organizationId: string | null;
    try {
      const stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as {
        nonce: string;
        userId: string;
        organizationId: string;
      };
      userId = stateData.userId;
      organizationId = stateData.organizationId || null;
    } catch {
      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?error=invalid_state`
      );
    }

    const config = OAUTH_CONFIG[type];

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: Bun.env.GOOGLE_CLIENT_ID!,
          client_secret: Bun.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${Bun.env.BACKEND_URL}/api/providers/callback/${type}`,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for tokens");
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      // Fetch provider-specific identifiers
      const providerData = await fetchProviderData(type, tokens.access_token);

      // Encrypt tokens before storing
      const encryptedAccessToken = await safeEncrypt(tokens.access_token);
      const encryptedRefreshToken = await safeEncrypt(tokens.refresh_token);

      // Check if provider already connected
      const existing = await db.query.connectedProviders.findFirst({
        where: and(
          eq(connectedProviders.userId, userId),
          eq(connectedProviders.provider, type)
        ),
      });

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      if (existing) {
        // Update existing connection
        await db
          .update(connectedProviders)
          .set({
            accessToken: encryptedAccessToken!,
            refreshToken: encryptedRefreshToken || existing.refreshToken,
            tokenExpiresAt: expiresAt,
            publisherId: providerData.publisherId,
            networkCode: providerData.networkCode,
            accountName: providerData.accountName,
            isEnabled: true,
            updatedAt: new Date(),
          })
          .where(eq(connectedProviders.id, existing.id));
      } else {
        // Create new connection with organization context
        await db.insert(connectedProviders).values({
          userId: userId,
          organizationId: organizationId, // null = personal scope, otherwise org-scoped
          provider: type,
          accessToken: encryptedAccessToken!,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          publisherId: providerData.publisherId,
          networkCode: providerData.networkCode,
          accountName: providerData.accountName,
        } satisfies NewConnectedProvider);
      }

      // Track successful connection
      trackProviderConnected(userId, type, true);

      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?success=${type}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);

      // Track failed connection
      trackProviderConnected(userId, type, false);

      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?error=oauth_failed`
      );
    }
  }
);

/**
 * GET /providers/:id/apps - List apps for an AdMob provider
 */
providers.get("/:id/apps", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: and(
      eq(connectedProviders.id, providerId),
      eq(connectedProviders.userId, user.id)
    ),
  });

  if (!provider) {
    return c.json({ error: "Provider not found" }, 404);
  }

  // Only AdMob supports apps listing
  if (provider.provider !== "admob") {
    return c.json({ apps: [], message: "Apps listing only supported for AdMob" });
  }

  // Decrypt stored token
  const decryptedAccessToken = await safeDecrypt(provider.accessToken);
  const decryptedRefreshToken = await safeDecrypt(provider.refreshToken);

  // Check if token needs refresh
  const now = new Date();
  const expiresAt = provider.tokenExpiresAt;
  const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  let accessToken = decryptedAccessToken;

  if (needsRefresh && decryptedRefreshToken) {
    try {
      const newTokens = await refreshAccessToken(decryptedRefreshToken);
      accessToken = newTokens.access_token;

      // Update stored tokens
      const encryptedAccessToken = await safeEncrypt(newTokens.access_token);
      const encryptedRefreshToken = await safeEncrypt(newTokens.refresh_token);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await db
        .update(connectedProviders)
        .set({
          accessToken: encryptedAccessToken!,
          refreshToken: encryptedRefreshToken || provider.refreshToken,
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(connectedProviders.id, provider.id));
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }

  try {
    // Fetch apps from AdMob API
    const accountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    const response = await fetch(
      `https://admob.googleapis.com/v1/accounts/${accountId}/apps?pageSize=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AdMob apps API error:", errorText);
      return c.json({ apps: [], error: "Failed to fetch apps" });
    }

    const data = (await response.json()) as {
      apps?: Array<{
        name?: string;
        appId?: string;
        platform?: string;
        manualAppInfo?: { displayName?: string };
        linkedAppInfo?: { appStoreId?: string; displayName?: string };
        appApprovalState?: string;
      }>;
    };

    const apps = (data.apps || []).map((app) => ({
      id: app.appId || app.name?.split("/").pop() || "",
      name: app.linkedAppInfo?.displayName || app.manualAppInfo?.displayName || "Unnamed App",
      platform: app.platform || "UNKNOWN",
      appStoreId: app.linkedAppInfo?.appStoreId,
      approvalState: app.appApprovalState,
    }));

    return c.json({ apps });
  } catch (error) {
    console.error("Error fetching apps:", error);
    return c.json({ apps: [], error: "Failed to fetch apps" });
  }
});

/**
 * DELETE /providers/:id - Disconnect provider
 * Requires org admin role when in organization context
 */
providers.delete("/:id", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

  // Check if user can manage providers (admin only for org context)
  const canManage = await isOrgAdmin(user.id, user.organizationId);
  if (!canManage) {
    return c.json({ error: "Only organization admins can disconnect providers" }, 403);
  }

  const [deleted] = await db
    .delete(connectedProviders)
    .where(
      and(
        eq(connectedProviders.id, providerId),
        eq(connectedProviders.userId, user.id)
      )
    )
    .returning();

  if (!deleted) {
    return c.json({ error: "Provider not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * PATCH /providers/:id/toggle - Enable/disable provider for user's queries
 * This is a per-user preference, any org member can toggle for themselves
 */
providers.patch(
  "/:id/toggle",
  zValidator("json", toggleProviderSchema),
  async (c) => {
    const user = c.get("user");
    const providerId = c.req.param("id");
    const { isEnabled } = c.req.valid("json");

    // Verify provider exists and user has access
    const provider = await db.query.connectedProviders.findFirst({
      where: eq(connectedProviders.id, providerId),
    });

    if (!provider) {
      return c.json({ error: "Provider not found" }, 404);
    }

    // Check user has access (same org or personal provider)
    const userOrgId = user.organizationId;
    const providerOrgId = provider.organizationId;
    if (providerOrgId !== userOrgId) {
      return c.json({ error: "Provider not found" }, 404);
    }

    // Upsert user preference
    const existingPref = await db.query.userProviderPreferences.findFirst({
      where: and(
        eq(userProviderPreferences.userId, user.id),
        eq(userProviderPreferences.providerId, providerId)
      ),
    });

    if (existingPref) {
      // Update existing preference
      await db
        .update(userProviderPreferences)
        .set({ isEnabled, updatedAt: new Date() })
        .where(eq(userProviderPreferences.id, existingPref.id));
    } else {
      // Create new preference
      await db.insert(userProviderPreferences).values({
        userId: user.id,
        providerId,
        isEnabled,
      });
    }

    return c.json({
      id: providerId,
      isEnabled,
    });
  }
);

/**
 * GET /providers/:type/token - Get valid access token (auto-refreshes if needed)
 * Used by internal services (CrewAI, MCP) to get tokens without manual refresh
 */
providers.get(
  "/:type/token",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const user = c.get("user");
    const { type } = c.req.valid("param");

    // Find the provider connection
    const provider = await db.query.connectedProviders.findFirst({
      where: and(
        eq(connectedProviders.userId, user.id),
        eq(connectedProviders.provider, type),
        eq(connectedProviders.isEnabled, true)
      ),
    });

    if (!provider) {
      return c.json({ error: "Provider not connected" }, 404);
    }

    // Decrypt stored tokens
    const decryptedAccessToken = await safeDecrypt(provider.accessToken);
    const decryptedRefreshToken = await safeDecrypt(provider.refreshToken);

    // Check if token needs refresh (refresh 5 min before expiry)
    const now = new Date();
    const expiresAt = provider.tokenExpiresAt;
    const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

    if (needsRefresh && decryptedRefreshToken) {
      try {
        const newTokens = await refreshAccessToken(decryptedRefreshToken);

        // Encrypt new tokens before storing
        const encryptedAccessToken = await safeEncrypt(newTokens.access_token);
        const encryptedRefreshToken = await safeEncrypt(newTokens.refresh_token);

        // Update stored tokens
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        await db
          .update(connectedProviders)
          .set({
            accessToken: encryptedAccessToken!,
            refreshToken: encryptedRefreshToken || provider.refreshToken,
            tokenExpiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(connectedProviders.id, provider.id));

        return c.json({
          accessToken: newTokens.access_token,
          expiresAt: newExpiresAt.toISOString(),
          provider: type,
        });
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Return existing token if refresh fails (might still work)
        return c.json({
          accessToken: decryptedAccessToken,
          expiresAt: expiresAt?.toISOString(),
          provider: type,
          warning: "Token refresh failed, using existing token",
        });
      }
    }

    return c.json({
      accessToken: decryptedAccessToken,
      expiresAt: expiresAt?.toISOString(),
      provider: type,
    });
  }
);

/**
 * GET /providers/internal/list - Internal endpoint for fetching user's providers
 * Protected by internal API key. Used by chat server.
 * Supports organization filtering via organizationId query param
 * Respects user's enabled preferences
 */
providers.get("/internal/list", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId"); // Optional organization filter

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  // Build filter based on organization context (no longer filter by isEnabled at org level)
  const whereClause = organizationId
    ? and(
        eq(connectedProviders.userId, userId),
        eq(connectedProviders.organizationId, organizationId)
      )
    : and(
        eq(connectedProviders.userId, userId),
        isNull(connectedProviders.organizationId)
      );

  const orgProviders = await db.query.connectedProviders.findMany({
    where: whereClause,
    columns: {
      id: true,
      provider: true,
      publisherId: true,
      networkCode: true,
      accountName: true,
      organizationId: true,
    },
  });

  // Get user's preferences for these providers
  const providerIds = orgProviders.map(p => p.id);
  const userPrefs = providerIds.length > 0
    ? await db.query.userProviderPreferences.findMany({
        where: and(
          eq(userProviderPreferences.userId, userId),
          sql`${userProviderPreferences.providerId} = ANY(ARRAY[${sql.join(providerIds.map(id => sql`${id}::uuid`), sql`, `)}])`
        ),
      })
    : [];

  // Create a map of provider preferences
  const prefMap = new Map(userPrefs.map(p => [p.providerId, p.isEnabled]));

  // Filter to only enabled providers (default true if no preference)
  const enabledProviders = orgProviders.filter(p => prefMap.get(p.id) !== false);

  return c.json({
    providers: enabledProviders.map((p) => ({
      id: p.id,
      type: p.provider,
      name: p.accountName || getProviderDisplayName(p.provider),
      identifier: p.provider === "admob" ? p.publisherId : p.networkCode,
      organizationId: p.organizationId,
    })),
  });
});

/**
 * POST /providers/internal/token - Internal endpoint for services (no user auth)
 * Protected by internal API key. Supports organization filtering.
 * Respects user's enabled preferences
 */
providers.post("/internal/token", async (c) => {
  console.log("[InternalToken] Request received");

  // Verify internal API key
  const apiKey = c.req.header("X-Internal-Key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  console.log(`[InternalToken] Key provided: ${apiKey ? 'yes' : 'no'}`);
  console.log(`[InternalToken] Key expected: ${expectedKey ? 'yes' : 'no'}`);
  console.log(`[InternalToken] Keys match: ${apiKey === expectedKey}`);

  if (apiKey !== expectedKey) {
    console.log("[InternalToken] Unauthorized - key mismatch");
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json() as { userId: string; provider: "admob" | "gam"; organizationId?: string };
  const { userId, provider: providerType, organizationId } = body;

  console.log(`[InternalToken] Looking up ${providerType} for user ${userId}, org ${organizationId || 'personal'}`);

  if (!userId || !providerType) {
    return c.json({ error: "userId and provider are required" }, 400);
  }

  // Build filter based on organization context (no longer filter by isEnabled at org level)
  const whereClause = organizationId
    ? and(
        eq(connectedProviders.userId, userId),
        eq(connectedProviders.organizationId, organizationId),
        eq(connectedProviders.provider, providerType)
      )
    : and(
        eq(connectedProviders.userId, userId),
        isNull(connectedProviders.organizationId),
        eq(connectedProviders.provider, providerType)
      );

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: whereClause,
  });

  if (!provider) {
    console.log("[InternalToken] Provider not found");
    return c.json({ error: "Provider not connected" }, 404);
  }

  // Check user's preference for this provider
  const userPref = await db.query.userProviderPreferences.findFirst({
    where: and(
      eq(userProviderPreferences.userId, userId),
      eq(userProviderPreferences.providerId, provider.id)
    ),
  });

  // If user has explicitly disabled this provider, don't return token
  if (userPref && !userPref.isEnabled) {
    console.log("[InternalToken] Provider disabled by user preference");
    return c.json({ error: "Provider disabled by user" }, 403);
  }

  console.log(`[InternalToken] Found provider, token encrypted: ${provider.accessToken?.startsWith('eyJ') ? 'JWE' : 'unknown'}`);

  // Decrypt stored tokens
  const decryptedAccessToken = await safeDecrypt(provider.accessToken);
  const decryptedRefreshToken = await safeDecrypt(provider.refreshToken);

  console.log(`[InternalToken] Decrypted token length: ${decryptedAccessToken?.length || 0}`);

  // Check if token needs refresh
  const now = new Date();
  const expiresAt = provider.tokenExpiresAt;
  const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (needsRefresh && decryptedRefreshToken) {
    try {
      const newTokens = await refreshAccessToken(decryptedRefreshToken);

      // Encrypt new tokens before storing
      const encryptedAccessToken = await safeEncrypt(newTokens.access_token);
      const encryptedRefreshToken = await safeEncrypt(newTokens.refresh_token);

      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await db
        .update(connectedProviders)
        .set({
          accessToken: encryptedAccessToken!,
          refreshToken: encryptedRefreshToken || provider.refreshToken,
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(connectedProviders.id, provider.id));

      return c.json({
        accessToken: newTokens.access_token,
        expiresAt: newExpiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }

  return c.json({
    accessToken: decryptedAccessToken,
    expiresAt: expiresAt?.toISOString(),
  });
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
      client_id: Bun.env.GOOGLE_CLIENT_ID!,
      client_secret: Bun.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

function getProviderDisplayName(provider: "admob" | "gam"): string {
  return provider === "admob" ? "Google AdMob" : "Google Ad Manager";
}

async function fetchProviderData(
  type: "admob" | "gam",
  accessToken: string
): Promise<{
  publisherId?: string;
  networkCode?: string;
  accountName?: string;
}> {
  if (type === "admob") {
    // Fetch AdMob account info
    const response = await fetch(
      "https://admob.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as {
        account?: Array<{
          publisherId?: string;
          name?: string;
        }>;
      };
      const account = data.account?.[0];
      return {
        publisherId: account?.publisherId,
        accountName: account?.name,
      };
    }
  } else {
    // Fetch GAM network info
    // GAM uses SOAP API, simplified here - in production use proper API client
    return {
      networkCode: "placeholder",
      accountName: "Google Ad Manager Account",
    };
  }

  return {};
}

export default providers;
