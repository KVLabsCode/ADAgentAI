import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { connectedProviders, type NewConnectedProvider } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { trackProviderConnected } from "../lib/analytics";
import { safeEncrypt, safeDecrypt } from "../lib/crypto";

const providers = new Hono();

// Most routes require authentication
providers.use("*", async (c, next) => {
  // Skip auth for internal endpoints (uses API key instead)
  const path = c.req.path;
  if (path.includes("/internal/")) {
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
// Routes
// ============================================================

/**
 * GET /providers - List user's connected providers
 */
providers.get("/", async (c) => {
  const user = c.get("user");

  const userProviders = await db.query.connectedProviders.findMany({
    where: eq(connectedProviders.userId, user.id),
    columns: {
      id: true,
      provider: true,
      publisherId: true,
      networkCode: true,
      accountName: true,
      isEnabled: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  return c.json({
    providers: userProviders.map((p) => ({
      id: p.id,
      type: p.provider,
      name: p.accountName || getProviderDisplayName(p.provider),
      identifier: p.provider === "admob" ? p.publisherId : p.networkCode,
      isEnabled: p.isEnabled,
      lastSyncAt: p.lastSyncAt,
      connectedAt: p.createdAt,
    })),
  });
});

/**
 * POST /providers/connect/:type - Initiate OAuth for provider
 * Returns the OAuth URL to redirect the user to
 */
providers.post(
  "/connect/:type",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const { type } = c.req.valid("param");
    const config = OAUTH_CONFIG[type];

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: Bun.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${Bun.env.BETTER_AUTH_URL}/api/providers/callback/${type}`,
      response_type: "code",
      scope: config.scope,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    // In production, store state in session/cache for verification
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
 */
providers.get(
  "/callback/:type",
  zValidator("param", z.object({ type: providerTypeSchema })),
  async (c) => {
    const user = c.get("user");
    const { type } = c.req.valid("param");
    const code = c.req.query("code");
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
          redirect_uri: `${Bun.env.BETTER_AUTH_URL}/api/providers/callback/${type}`,
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
          eq(connectedProviders.userId, user.id),
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
        // Create new connection
        await db.insert(connectedProviders).values({
          userId: user.id,
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
      trackProviderConnected(user.id, type, true);

      return c.redirect(
        `${Bun.env.FRONTEND_URL}/providers?success=${type}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);

      // Track failed connection
      trackProviderConnected(user.id, type, false);

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
 */
providers.delete("/:id", async (c) => {
  const user = c.get("user");
  const providerId = c.req.param("id");

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
 * PATCH /providers/:id/toggle - Enable/disable provider for chat
 */
providers.patch(
  "/:id/toggle",
  zValidator("json", toggleProviderSchema),
  async (c) => {
    const user = c.get("user");
    const providerId = c.req.param("id");
    const { isEnabled } = c.req.valid("json");

    const [updated] = await db
      .update(connectedProviders)
      .set({ isEnabled, updatedAt: new Date() })
      .where(
        and(
          eq(connectedProviders.id, providerId),
          eq(connectedProviders.userId, user.id)
        )
      )
      .returning();

    if (!updated) {
      return c.json({ error: "Provider not found" }, 404);
    }

    return c.json({
      id: updated.id,
      isEnabled: updated.isEnabled,
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
 */
providers.get("/internal/list", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const userProviders = await db.query.connectedProviders.findMany({
    where: and(
      eq(connectedProviders.userId, userId),
      eq(connectedProviders.isEnabled, true)
    ),
    columns: {
      id: true,
      provider: true,
      publisherId: true,
      networkCode: true,
      accountName: true,
    },
  });

  return c.json({
    providers: userProviders.map((p) => ({
      id: p.id,
      type: p.provider,
      name: p.accountName || getProviderDisplayName(p.provider),
      identifier: p.provider === "admob" ? p.publisherId : p.networkCode,
    })),
  });
});

/**
 * POST /providers/internal/token - Internal endpoint for services (no user auth)
 * Protected by internal API key
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

  const body = await c.req.json() as { userId: string; provider: "admob" | "gam" };
  const { userId, provider: providerType } = body;

  console.log(`[InternalToken] Looking up ${providerType} for user ${userId}`);

  if (!userId || !providerType) {
    return c.json({ error: "userId and provider are required" }, 400);
  }

  // Find the provider connection
  const provider = await db.query.connectedProviders.findFirst({
    where: and(
      eq(connectedProviders.userId, userId),
      eq(connectedProviders.provider, providerType),
      eq(connectedProviders.isEnabled, true)
    ),
  });

  if (!provider) {
    console.log("[InternalToken] Provider not found");
    return c.json({ error: "Provider not connected" }, 404);
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
