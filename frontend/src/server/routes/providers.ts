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
  console.log(`[isOrgAdmin] userId: ${userId}, organizationId: ${organizationId}`);
  // Personal context - user owns their own providers
  if (!organizationId) {
    console.log('[isOrgAdmin] Personal context - returning true');
    return true;
  }

  // Check org membership role via Neon Auth
  const result = await db.execute(sql`
    SELECT role FROM neon_auth.member
    WHERE "userId" = ${userId}
    AND "organizationId" = ${organizationId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ role: string }>;
  if (!rows || rows.length === 0) {
    console.log('[isOrgAdmin] No membership found - returning false');
    return false;
  }

  const role = rows[0].role;
  const isAdmin = role === "owner" || role === "admin";
  console.log(`[isOrgAdmin] Role: ${role}, isAdmin: ${isAdmin}`);
  return isAdmin;
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

  console.log(`[Providers GET] userId: ${user.id}, organizationId: ${organizationId || 'personal (null)'}`);

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
  console.log(`[Providers GET] canManage: ${canManage}, providerCount: ${orgProviders.length}`);

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
 * GET /providers/:id - Get single provider details
 * Returns provider info with account details
 */
providers.get("/:id", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

  // Build filter with org context
  const whereClause = user.organizationId
    ? and(
        eq(connectedProviders.id, providerId),
        eq(connectedProviders.userId, user.id),
        eq(connectedProviders.organizationId, user.organizationId)
      )
    : and(
        eq(connectedProviders.id, providerId),
        eq(connectedProviders.userId, user.id),
        isNull(connectedProviders.organizationId)
      );

  const provider = await db.query.connectedProviders.findFirst({
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

  if (!provider) {
    return c.json({ error: "Provider not found" }, 404);
  }

  // Get user's preference for this provider
  const userPref = await db.query.userProviderPreferences.findFirst({
    where: and(
      eq(userProviderPreferences.userId, user.id),
      eq(userProviderPreferences.providerId, providerId)
    ),
  });

  // Check if user can manage providers (admin/owner)
  const canManage = await isOrgAdmin(user.id, user.organizationId);

  return c.json({
    provider: {
      id: provider.id,
      type: provider.provider,
      name: provider.accountName || getProviderDisplayName(provider.provider),
      identifier: provider.provider === "admob" ? provider.publisherId : provider.networkCode,
      isEnabled: userPref?.isEnabled ?? true, // Default to enabled if no preference
      lastSyncAt: provider.lastSyncAt,
      connectedAt: provider.createdAt,
      organizationId: provider.organizationId,
      // Additional detail fields
      publisherId: provider.publisherId,
      networkCode: provider.networkCode,
      accountName: provider.accountName,
    },
    canManage,
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

    // Get the origin from the request to redirect back to the same domain
    const origin = c.req.header("origin") || c.req.header("referer")?.split("/").slice(0, 3).join("/") || process.env.FRONTEND_URL!;

    // Encode user ID, org ID, and origin in state for the callback
    // Format: randomUUID:userId:organizationId:origin (orgId can be empty)
    const stateData = {
      nonce: crypto.randomUUID(),
      userId: user.id,
      organizationId: user.organizationId || "",
      origin: origin,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.BACKEND_URL}/api/providers/callback/${type}`,
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

    // Extract user info and origin from state parameter first
    let userId: string;
    let organizationId: string | null;
    let origin: string;

    if (!stateParam) {
      return c.redirect(
        `${process.env.FRONTEND_URL}/providers?error=invalid_state`
      );
    }

    try {
      const stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as {
        nonce: string;
        userId: string;
        organizationId: string;
        origin?: string;
      };
      userId = stateData.userId;
      organizationId = stateData.organizationId || null;
      origin = stateData.origin || process.env.FRONTEND_URL!;
    } catch {
      return c.redirect(
        `${process.env.FRONTEND_URL}/providers?error=invalid_state`
      );
    }

    if (error) {
      return c.redirect(
        `${origin}/providers?error=${error}`
      );
    }

    if (!code) {
      return c.redirect(
        `${origin}/providers?error=no_code`
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
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${process.env.BACKEND_URL}/api/providers/callback/${type}`,
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

      // Check if provider already connected (must match organization scope)
      const existing = await db.query.connectedProviders.findFirst({
        where: and(
          eq(connectedProviders.userId, userId),
          eq(connectedProviders.provider, type),
          // Must match organization context: org-scoped or personal (null)
          organizationId
            ? eq(connectedProviders.organizationId, organizationId)
            : isNull(connectedProviders.organizationId)
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
        `${origin}/providers?success=${type}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);

      // Track failed connection
      trackProviderConnected(userId, type, false);

      return c.redirect(
        `${origin}/providers?error=oauth_failed`
      );
    }
  }
);

/**
 * GET /providers/:id/apps - List apps for an AdMob provider
 * SECURITY: Validates provider belongs to user's current org context
 */
providers.get("/:id/apps", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

  // Find the provider connection with org validation
  const provider = await db.query.connectedProviders.findFirst({
    where: and(
      eq(connectedProviders.id, providerId),
      eq(connectedProviders.userId, user.id),
      // SECURITY: Ensure provider belongs to user's current org context
      user.organizationId
        ? eq(connectedProviders.organizationId, user.organizationId)
        : isNull(connectedProviders.organizationId)
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
 * SECURITY: Validates provider belongs to user's current org context
 */
providers.delete("/:id", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

  // Check if user can manage providers (admin only for org context)
  const canManage = await isOrgAdmin(user.id, user.organizationId);
  if (!canManage) {
    return c.json({ error: "Only organization admins can disconnect providers" }, 403);
  }

  // SECURITY: Ensure provider belongs to user's current org context
  const [deleted] = await db
    .delete(connectedProviders)
    .where(
      and(
        eq(connectedProviders.id, providerId),
        eq(connectedProviders.userId, user.id),
        // Validate org context to prevent cross-org deletion
        user.organizationId
          ? eq(connectedProviders.organizationId, user.organizationId)
          : isNull(connectedProviders.organizationId)
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
 * Used by internal services (LangGraph, MCP) to get tokens without manual refresh
 * SECURITY: Validates provider belongs to user's current org context
 */
providers.get(
  "/:type/token",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const user = c.get("user");
    const { type } = c.req.valid("param");

    // Find the provider connection with org validation
    // SECURITY: Ensure provider belongs to user's current org context
    const provider = await db.query.connectedProviders.findFirst({
      where: and(
        eq(connectedProviders.userId, user.id),
        eq(connectedProviders.provider, type),
        eq(connectedProviders.isEnabled, true),
        // Validate org context
        user.organizationId
          ? eq(connectedProviders.organizationId, user.organizationId)
          : isNull(connectedProviders.organizationId)
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
  const expectedKey = process.env.INTERNAL_API_KEY;

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
 * GET /providers/internal/apps - Internal endpoint for fetching apps for a provider
 * Protected by internal API key.
 * SECURITY: Validates provider belongs to userId/org if provided
 */
providers.get("/internal/apps", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const providerId = c.req.query("providerId");
  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");

  if (!providerId) {
    return c.json({ error: "providerId is required" }, 400);
  }

  // Find the provider connection with ownership validation if userId provided
  const provider = await db.query.connectedProviders.findFirst({
    where: eq(connectedProviders.id, providerId),
  });

  if (!provider || provider.provider !== "admob") {
    return c.json({ apps: [] });
  }

  // SECURITY: Validate provider ownership if userId provided
  if (userId) {
    if (provider.userId !== userId) {
      return c.json({ apps: [], error: "Provider not owned by user" });
    }
    // Validate org context matches
    const requestedOrg = organizationId || null;
    if (provider.organizationId !== requestedOrg) {
      return c.json({ apps: [], error: "Provider not in current org context" });
    }
  }

  // Get valid access token (with refresh if needed)
  const accessToken = await getValidAccessToken(provider);
  if (!accessToken) {
    return c.json({ apps: [], error: "Token unavailable" });
  }

  try {
    const accountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    const response = await fetch(
      `https://admob.googleapis.com/v1/accounts/${accountId}/apps?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return c.json({ apps: [], error: "Failed to fetch apps" });
    }

    const data = (await response.json()) as {
      apps?: Array<{
        name?: string;
        appId?: string;
        platform?: string;
        manualAppInfo?: { displayName?: string };
        linkedAppInfo?: { appStoreId?: string; displayName?: string };
      }>;
    };

    // Deduplicate by appId to avoid duplicates in dropdown
    const seen = new Set<string>();
    const apps = (data.apps || [])
      .filter((app) => {
        const id = app.appId || app.name?.split("/").pop() || "";
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((app) => ({
        value: app.appId || app.name?.split("/").pop() || "",
        label: app.linkedAppInfo?.displayName || app.manualAppInfo?.displayName || "Unnamed App",
      }));

    return c.json({ apps });
  } catch (error) {
    console.error("Error fetching apps:", error);
    return c.json({ apps: [], error: "Failed to fetch apps" });
  }
});

/**
 * GET /providers/internal/ad-units - Internal endpoint for fetching ad units for a provider
 * Protected by internal API key.
 * SECURITY: Validates provider belongs to userId/org if provided
 *
 * Query params:
 *   - providerId (required): Provider UUID
 *   - userId (optional): For ownership validation
 *   - organizationId (optional): For org context validation
 *   - platform (optional): Filter by platform (IOS, ANDROID)
 *   - adFormat (optional): Filter by ad format (BANNER, INTERSTITIAL, REWARDED, etc.)
 *   - appId (optional): Filter by app ID
 */
providers.get("/internal/ad-units", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const providerId = c.req.query("providerId");
  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");
  // Filter parameters for cascading dependencies
  const platformFilter = c.req.query("platform"); // IOS, ANDROID
  const adFormatFilter = c.req.query("adFormat"); // BANNER, INTERSTITIAL, REWARDED, etc.
  const appIdFilter = c.req.query("appId"); // Filter by specific app

  if (!providerId) {
    return c.json({ error: "providerId is required" }, 400);
  }

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: eq(connectedProviders.id, providerId),
  });

  if (!provider || provider.provider !== "admob") {
    return c.json({ adUnits: [] });
  }

  // SECURITY: Validate provider ownership if userId provided
  if (userId) {
    if (provider.userId !== userId) {
      return c.json({ adUnits: [], error: "Provider not owned by user" });
    }
    // Validate org context matches
    const requestedOrg = organizationId || null;
    if (provider.organizationId !== requestedOrg) {
      return c.json({ adUnits: [], error: "Provider not in current org context" });
    }
  }

  // Get valid access token (with refresh if needed)
  const accessToken = await getValidAccessToken(provider);
  if (!accessToken) {
    return c.json({ adUnits: [], error: "Token unavailable" });
  }

  try {
    const accountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    const response = await fetch(
      `https://admob.googleapis.com/v1/accounts/${accountId}/adUnits?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return c.json({ adUnits: [], error: "Failed to fetch ad units" });
    }

    const data = (await response.json()) as {
      adUnits?: Array<{
        name?: string;
        adUnitId?: string;
        displayName?: string;
        adFormat?: string;
        appId?: string;
      }>;
    };

    // Use full adUnitId (ca-app-pub-xxx/yyy) to match what agent writes
    // Deduplicate by adUnitId to avoid duplicates in dropdown
    const seen = new Set<string>();
    const adUnits = (data.adUnits || [])
      .filter((unit) => {
        const id = unit.adUnitId || "";
        if (!id || seen.has(id)) return false;
        seen.add(id);

        // Apply platform filter if specified
        // Ad units don't directly have platform, but we can filter via appId lookup
        // For now, skip platform filtering at ad unit level (done via app selection)

        // Apply adFormat filter if specified
        if (adFormatFilter && unit.adFormat) {
          // Normalize comparison (AdMob returns formats like BANNER, INTERSTITIAL, etc.)
          if (unit.adFormat.toUpperCase() !== adFormatFilter.toUpperCase()) {
            return false;
          }
        }

        // Apply appId filter if specified
        if (appIdFilter && unit.appId) {
          if (unit.appId !== appIdFilter) {
            return false;
          }
        }

        return true;
      })
      .map((unit) => {
        // Extract short ID suffix (last 4 digits) to differentiate same-named ad units
        const fullId = unit.adUnitId || "";
        const shortId = fullId.split("/").pop()?.slice(-4) || "";
        return {
          value: fullId,
          label: `${unit.displayName || "Unnamed"} (${unit.adFormat || "Unknown"}) #${shortId}`,
          // Include metadata for frontend validation
          adFormat: unit.adFormat,
          appId: unit.appId,
        };
      });

    console.log(`[ad-units] Returning ${adUnits.length} ad units (filters: platform=${platformFilter}, adFormat=${adFormatFilter}, appId=${appIdFilter})`);
    return c.json({ adUnits });
  } catch (error) {
    console.error("Error fetching ad units:", error);
    return c.json({ adUnits: [], error: "Failed to fetch ad units" });
  }
});

/**
 * GET /providers/internal/mediation-groups - Internal endpoint for fetching mediation groups
 * Protected by internal API key.
 * SECURITY: Validates provider belongs to userId/org if provided
 */
providers.get("/internal/mediation-groups", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const providerId = c.req.query("providerId");
  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");

  if (!providerId) {
    return c.json({ error: "providerId is required" }, 400);
  }

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: eq(connectedProviders.id, providerId),
  });

  if (!provider || provider.provider !== "admob") {
    return c.json({ mediationGroups: [] });
  }

  // SECURITY: Validate provider ownership if userId provided
  if (userId) {
    if (provider.userId !== userId) {
      return c.json({ mediationGroups: [], error: "Provider not owned by user" });
    }
    // Validate org context matches
    const requestedOrg = organizationId || null;
    if (provider.organizationId !== requestedOrg) {
      return c.json({ mediationGroups: [], error: "Provider not in current org context" });
    }
  }

  // Get valid access token (with refresh if needed)
  const accessToken = await getValidAccessToken(provider);
  if (!accessToken) {
    return c.json({ mediationGroups: [], error: "Token unavailable" });
  }

  try {
    const accountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    const response = await fetch(
      `https://admob.googleapis.com/v1/accounts/${accountId}/mediationGroups?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return c.json({ mediationGroups: [], error: "Failed to fetch mediation groups" });
    }

    const data = (await response.json()) as {
      mediationGroups?: Array<{
        name?: string;
        mediationGroupId?: string;
        displayName?: string;
        state?: string;
      }>;
    };

    // Deduplicate by mediationGroupId to avoid duplicates in dropdown
    const seen = new Set<string>();
    const mediationGroups = (data.mediationGroups || [])
      .filter((group) => {
        const id = group.mediationGroupId || group.name?.split("/").pop() || "";
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((group) => ({
        value: group.mediationGroupId || group.name?.split("/").pop() || "",
        label: `${group.displayName || "Unnamed"} (${group.state || "Unknown"})`,
      }));

    return c.json({ mediationGroups });
  } catch (error) {
    console.error("Error fetching mediation groups:", error);
    return c.json({ mediationGroups: [], error: "Failed to fetch mediation groups" });
  }
});

/**
 * GET /providers/internal/ad-sources - Internal endpoint for fetching ad sources (ad networks)
 * Protected by internal API key.
 * SECURITY: Validates provider belongs to userId/org if provided
 */
providers.get("/internal/ad-sources", async (c) => {
  console.log("[ad-sources] Request received");

  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    console.log("[ad-sources] Unauthorized - API key mismatch");
    return c.json({ error: "Unauthorized" }, 401);
  }

  const providerId = c.req.query("providerId");
  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");
  console.log(`[ad-sources] providerId=${providerId}, userId=${userId}, orgId=${organizationId}`);

  if (!providerId) {
    console.log("[ad-sources] Missing providerId");
    return c.json({ error: "providerId is required" }, 400);
  }

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: eq(connectedProviders.id, providerId),
  });
  console.log(`[ad-sources] Found provider:`, provider ? { id: provider.id, type: provider.provider, publisherId: provider.publisherId } : null);

  if (!provider || provider.provider !== "admob") {
    console.log("[ad-sources] Provider not found or not admob");
    return c.json({ adSources: [] });
  }

  // SECURITY: Validate provider ownership if userId provided
  if (userId) {
    if (provider.userId !== userId) {
      return c.json({ adSources: [], error: "Provider not owned by user" });
    }
    // Validate org context matches
    const requestedOrg = organizationId || null;
    if (provider.organizationId !== requestedOrg) {
      return c.json({ adSources: [], error: "Provider not in current org context" });
    }
  }

  // Get valid access token (with refresh if needed)
  const accessToken = await getValidAccessToken(provider);
  if (!accessToken) {
    return c.json({ adSources: [], error: "Token unavailable" });
  }

  try {
    const accountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    console.log(`[ad-sources] Fetching from AdMob API for account: ${accountId}`);
    const response = await fetch(
      `https://admob.googleapis.com/v1beta/accounts/${accountId}/adSources?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(`[ad-sources] AdMob API response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ad-sources] AdMob API error: ${errorText}`);
      return c.json({ adSources: [], error: "Failed to fetch ad sources" });
    }

    const data = (await response.json()) as {
      adSources?: Array<{
        name?: string;
        adSourceId?: string;
        title?: string;
      }>;
    };
    console.log(`[ad-sources] Raw API response:`, JSON.stringify(data, null, 2));

    // Deduplicate by adSourceId to avoid duplicates in dropdown
    const seen = new Set<string>();
    const adSources = (data.adSources || [])
      .filter((source) => {
        const id = source.adSourceId || source.name?.split("/").pop() || "";
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((source) => ({
        value: source.adSourceId || source.name?.split("/").pop() || "",
        label: source.title || "Unknown Network",
      }));

    console.log(`[ad-sources] Returning ${adSources.length} ad sources`);
    return c.json({ adSources });
  } catch (error) {
    console.error("Error fetching ad sources:", error);
    return c.json({ adSources: [], error: "Failed to fetch ad sources" });
  }
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
  const expectedKey = process.env.INTERNAL_API_KEY;

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
 * Get a valid access token for a provider, refreshing if necessary
 */
async function getValidAccessToken(provider: typeof connectedProviders.$inferSelect): Promise<string | null> {
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

      // Encrypt and store new tokens
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

      return newTokens.access_token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Return existing token, might still work
      return decryptedAccessToken;
    }
  }

  return decryptedAccessToken;
}

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
