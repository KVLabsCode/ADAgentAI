import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { connectedProviders, type NewConnectedProvider } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { trackProviderConnected } from "../lib/analytics";

const providers = new Hono();

// All provider routes require authentication
providers.use("*", requireAuth);

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
        `${Bun.env.FRONTEND_URL}/settings/providers?error=${error}`
      );
    }

    if (!code) {
      return c.redirect(
        `${Bun.env.FRONTEND_URL}/settings/providers?error=no_code`
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
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existing.refreshToken,
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
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          publisherId: providerData.publisherId,
          networkCode: providerData.networkCode,
          accountName: providerData.accountName,
        } satisfies NewConnectedProvider);
      }

      // Track successful connection
      trackProviderConnected(user.id, type, true);

      return c.redirect(
        `${Bun.env.FRONTEND_URL}/settings/providers?success=${type}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);

      // Track failed connection
      trackProviderConnected(user.id, type, false);

      return c.redirect(
        `${Bun.env.FRONTEND_URL}/settings/providers?error=oauth_failed`
      );
    }
  }
);

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

// ============================================================
// Helpers
// ============================================================

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
