import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../db";
import { adSources, connectedProviders, type NewAdSource } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { safeEncrypt, safeDecrypt } from "../lib/crypto";

const adSourcesRouter = new Hono();

// Most routes require authentication
adSourcesRouter.use("*", async (c, next) => {
  const path = c.req.path;
  // Skip auth for internal endpoints (uses API key instead)
  if (path.includes("/internal/")) {
    return next();
  }
  return requireAuth(c, next);
});

// ============================================================
// Ad Source Definitions
// ============================================================

/**
 * Ad source configuration with required credential fields.
 * These are the API-key based ad sources (not OAuth).
 */
export const AD_SOURCE_CONFIGS = {
  applovin: {
    displayName: "AppLovin MAX",
    description: "AppLovin MAX mediation platform",
    fields: [
      { key: "api_key", label: "API Key", type: "password" as const, required: true, helpText: "Find this in AppLovin Dashboard > Account > Keys" },
    ],
    docsUrl: "https://dash.applovin.com/documentation/mediation/max/api-overview",
  },
  unity: {
    displayName: "Unity LevelPlay",
    description: "Unity LevelPlay (formerly ironSource)",
    fields: [
      { key: "secret_key", label: "Secret Key", type: "password" as const, required: true, helpText: "API secret key from Unity Dashboard" },
      { key: "refresh_token", label: "Refresh Token", type: "password" as const, required: true, helpText: "OAuth refresh token for Unity API" },
    ],
    docsUrl: "https://developers.is.com/ironsource-mobile/air/api-overview/",
  },
  liftoff: {
    displayName: "Liftoff Monetize",
    description: "Liftoff (formerly Vungle) monetization",
    fields: [
      { key: "api_key", label: "API Key", type: "password" as const, required: true, helpText: "Reporting API key from Liftoff Dashboard" },
    ],
    docsUrl: "https://support.vungle.com/hc/en-us/articles/360002922151-Publisher-Reporting-API",
  },
  inmobi: {
    displayName: "InMobi",
    description: "InMobi mobile advertising",
    fields: [
      { key: "username", label: "Username", type: "text" as const, required: true, helpText: "API username (email)" },
      { key: "api_key", label: "API Key", type: "password" as const, required: true, helpText: "API secret key from InMobi" },
    ],
    docsUrl: "https://support.inmobi.com/monetize/reporting-api/getting-started-with-the-api",
  },
  mintegral: {
    displayName: "Mintegral",
    description: "Mintegral advertising platform",
    fields: [
      { key: "skey", label: "Secret Key", type: "password" as const, required: true, helpText: "Publisher reporting API key" },
    ],
    docsUrl: "https://cdn-adn-https.rayjump.com/cdn-adn/reporting_api/MintegralRA.html",
  },
  pangle: {
    displayName: "Pangle",
    description: "Pangle (TikTok for Business)",
    fields: [
      { key: "user_id", label: "User ID", type: "text" as const, required: true, helpText: "Publisher user ID" },
      { key: "role_id", label: "Role ID", type: "text" as const, required: true, helpText: "Role ID for API access" },
      { key: "secure_key", label: "Secure Key", type: "password" as const, required: true, helpText: "API secure key" },
    ],
    docsUrl: "https://www.pangleglobal.com/integration/reporting-api-v2",
  },
  dtexchange: {
    displayName: "DT Exchange",
    description: "Digital Turbine Exchange",
    fields: [
      { key: "api_key", label: "API Key", type: "password" as const, required: true, helpText: "Reporting API key" },
    ],
    docsUrl: "https://developer.digitalturbine.com/hc/en-us/articles/360010915938-Reporting-API",
  },
} as const;

export type AdSourceName = keyof typeof AD_SOURCE_CONFIGS;

// ============================================================
// Schemas
// ============================================================

const adSourceNameSchema = z.enum([
  "applovin",
  "unity",
  "liftoff",
  "inmobi",
  "mintegral",
  "pangle",
  "dtexchange",
]);

const connectAdSourceSchema = z.object({
  credentials: z.record(z.string(), z.string()),
  providerId: z.string().uuid().optional(), // Required in body, linked to parent provider
});

const toggleAdSourceSchema = z.object({
  isEnabled: z.boolean(),
});

// ============================================================
// Helpers
// ============================================================

/**
 * Check if user is an admin/owner of the current organization
 */
async function isOrgAdmin(userId: string, organizationId: string | null): Promise<boolean> {
  if (!organizationId) {
    return true; // Personal context
  }

  const result = await db.execute(sql`
    SELECT role FROM neon_auth.member
    WHERE "userId" = ${userId}
    AND "organizationId" = ${organizationId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ role: string }>;
  if (!rows || rows.length === 0) {
    return false;
  }

  const role = rows[0].role;
  return role === "owner" || role === "admin";
}

/**
 * Encrypt credentials object using AES-256-GCM
 */
async function encryptCredentials(credentials: Record<string, string>): Promise<Record<string, string>> {
  const encrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    const encryptedValue = await safeEncrypt(value);
    if (encryptedValue) {
      encrypted[key] = encryptedValue;
    }
  }
  return encrypted;
}

/**
 * Decrypt credentials object
 */
async function decryptCredentials(credentials: Record<string, string>): Promise<Record<string, string>> {
  const decrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    const decryptedValue = await safeDecrypt(value);
    if (decryptedValue) {
      decrypted[key] = decryptedValue;
    }
  }
  return decrypted;
}

/**
 * Mask credentials for display (show only first/last 4 chars)
 */
function maskCredentials(credentials: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value.length > 8) {
      masked[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
    } else {
      masked[key] = "********";
    }
  }
  return masked;
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /ad-sources/config - Get ad source configuration schemas
 * Returns the field definitions for each ad source (for form generation)
 */
adSourcesRouter.get("/config", async (c) => {
  return c.json({ adSources: AD_SOURCE_CONFIGS });
});

/**
 * GET /ad-sources - List user's connected ad sources
 * Optionally filter by providerId query param
 */
adSourcesRouter.get("/", async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;
  const providerIdFilter = c.req.query("providerId");

  let whereClause = organizationId
    ? and(eq(adSources.userId, user.id), eq(adSources.organizationId, organizationId))
    : and(eq(adSources.userId, user.id), isNull(adSources.organizationId));

  // Add provider filter if specified
  if (providerIdFilter) {
    whereClause = and(whereClause, eq(adSources.providerId, providerIdFilter));
  }

  const sources = await db.query.adSources.findMany({
    where: whereClause,
    columns: {
      id: true,
      adSourceName: true,
      isEnabled: true,
      lastVerifiedAt: true,
      createdAt: true,
      credentials: true,
      providerId: true,
    },
  });

  // Check if user can manage ad sources
  const canManage = await isOrgAdmin(user.id, organizationId);

  // Mask credentials for display
  const adSourcesWithMaskedCreds = sources.map((source) => ({
    id: source.id,
    adSourceName: source.adSourceName,
    displayName: AD_SOURCE_CONFIGS[source.adSourceName as AdSourceName]?.displayName || source.adSourceName,
    isEnabled: source.isEnabled,
    lastVerifiedAt: source.lastVerifiedAt,
    connectedAt: source.createdAt,
    providerId: source.providerId,
    maskedCredentials: maskCredentials(source.credentials as Record<string, string>),
  }));

  return c.json({
    adSources: adSourcesWithMaskedCreds,
    canManage,
  });
});

/**
 * POST /ad-sources/:adSource - Connect an ad source with credentials
 * Requires providerId in body to link to parent provider
 */
adSourcesRouter.post(
  "/:adSource",
  zValidator("param", z.object({ adSource: adSourceNameSchema })),
  zValidator("json", connectAdSourceSchema),
  async (c) => {
    const user = c.get("user");
    const { adSource } = c.req.valid("param");
    const { credentials, providerId } = c.req.valid("json");

    // Check if user can manage ad sources
    const canManage = await isOrgAdmin(user.id, user.organizationId);
    if (!canManage) {
      return c.json({ error: "Only organization admins can connect ad sources" }, 403);
    }

    // Validate providerId if provided
    if (providerId) {
      const provider = await db.query.connectedProviders.findFirst({
        where: and(
          eq(connectedProviders.id, providerId),
          eq(connectedProviders.userId, user.id),
          user.organizationId
            ? eq(connectedProviders.organizationId, user.organizationId)
            : isNull(connectedProviders.organizationId)
        ),
      });

      if (!provider) {
        return c.json({ error: "Provider not found or not accessible" }, 404);
      }
    }

    // Validate required fields
    const config = AD_SOURCE_CONFIGS[adSource];
    for (const field of config.fields) {
      if (field.required && !credentials[field.key]) {
        return c.json({ error: `${field.label} is required` }, 400);
      }
    }

    // Encrypt credentials
    const encryptedCredentials = await encryptCredentials(credentials);

    // Build where clause for checking existing
    let existingWhereClause = user.organizationId
      ? and(
          eq(adSources.userId, user.id),
          eq(adSources.organizationId, user.organizationId),
          eq(adSources.adSourceName, adSource)
        )
      : and(
          eq(adSources.userId, user.id),
          isNull(adSources.organizationId),
          eq(adSources.adSourceName, adSource)
        );

    // If providerId specified, scope to that provider
    if (providerId) {
      existingWhereClause = and(existingWhereClause, eq(adSources.providerId, providerId));
    }

    const existing = await db.query.adSources.findFirst({
      where: existingWhereClause,
    });

    if (existing) {
      // Update existing
      await db
        .update(adSources)
        .set({
          credentials: encryptedCredentials,
          isEnabled: true,
          providerId: providerId || existing.providerId,
          updatedAt: new Date(),
        })
        .where(eq(adSources.id, existing.id));

      return c.json({
        id: existing.id,
        adSourceName: adSource,
        displayName: config.displayName,
        isEnabled: true,
        providerId: providerId || existing.providerId,
        message: "Ad source credentials updated",
      });
    }

    // Insert new
    const [inserted] = await db
      .insert(adSources)
      .values({
        userId: user.id,
        organizationId: user.organizationId,
        providerId: providerId,
        adSourceName: adSource,
        credentials: encryptedCredentials,
        isEnabled: true,
      } satisfies NewAdSource)
      .returning({ id: adSources.id });

    return c.json({
      id: inserted.id,
      adSourceName: adSource,
      displayName: config.displayName,
      isEnabled: true,
      providerId: providerId,
      message: "Ad source connected successfully",
    }, 201);
  }
);

/**
 * DELETE /ad-sources/:id - Disconnect an ad source
 */
adSourcesRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const adSourceId = c.req.param("id");

  // Check if user can manage ad sources
  const canManage = await isOrgAdmin(user.id, user.organizationId);
  if (!canManage) {
    return c.json({ error: "Only organization admins can disconnect ad sources" }, 403);
  }

  // Validate ownership and org context
  const whereClause = user.organizationId
    ? and(
        eq(adSources.id, adSourceId),
        eq(adSources.userId, user.id),
        eq(adSources.organizationId, user.organizationId)
      )
    : and(
        eq(adSources.id, adSourceId),
        eq(adSources.userId, user.id),
        isNull(adSources.organizationId)
      );

  const [deleted] = await db
    .delete(adSources)
    .where(whereClause)
    .returning();

  if (!deleted) {
    return c.json({ error: "Ad source not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * PATCH /ad-sources/:id/toggle - Enable/disable ad source
 */
adSourcesRouter.patch(
  "/:id/toggle",
  zValidator("json", toggleAdSourceSchema),
  async (c) => {
    const user = c.get("user");
    const adSourceId = c.req.param("id");
    const { isEnabled } = c.req.valid("json");

    // Validate ownership
    const source = await db.query.adSources.findFirst({
      where: eq(adSources.id, adSourceId),
    });

    if (!source) {
      return c.json({ error: "Ad source not found" }, 404);
    }

    // Check access (same org context)
    const userOrgId = user.organizationId;
    const sourceOrgId = source.organizationId;
    if (sourceOrgId !== userOrgId) {
      return c.json({ error: "Ad source not found" }, 404);
    }

    await db
      .update(adSources)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(adSources.id, adSourceId));

    return c.json({ id: adSourceId, isEnabled });
  }
);

/**
 * POST /ad-sources/:adSource/verify - Verify ad source credentials
 * Makes a test API call to verify credentials work
 */
adSourcesRouter.post(
  "/:adSource/verify",
  zValidator("param", z.object({ adSource: adSourceNameSchema })),
  zValidator("json", connectAdSourceSchema),
  async (c) => {
    const { adSource } = c.req.valid("param");
    const { credentials } = c.req.valid("json");

    // TODO: Implement actual verification for each ad source
    // For now, just validate required fields are present
    const config = AD_SOURCE_CONFIGS[adSource];
    for (const field of config.fields) {
      if (field.required && !credentials[field.key]) {
        return c.json({ valid: false, error: `${field.label} is required` });
      }
    }

    // Placeholder: In production, make actual API call to verify
    return c.json({
      valid: true,
      message: "Credentials format is valid",
    });
  }
);

// ============================================================
// Internal Routes (for chat agent)
// ============================================================

/**
 * GET /ad-sources/internal/list - List user's enabled ad sources
 * Protected by internal API key
 */
adSourcesRouter.get("/internal/list", async (c) => {
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");
  const providerIdFilter = c.req.query("providerId");

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  let whereClause = organizationId
    ? and(
        eq(adSources.userId, userId),
        eq(adSources.organizationId, organizationId),
        eq(adSources.isEnabled, true)
      )
    : and(
        eq(adSources.userId, userId),
        isNull(adSources.organizationId),
        eq(adSources.isEnabled, true)
      );

  // Add provider filter if specified
  if (providerIdFilter) {
    whereClause = and(whereClause, eq(adSources.providerId, providerIdFilter));
  }

  const sources = await db.query.adSources.findMany({
    where: whereClause,
    columns: {
      id: true,
      adSourceName: true,
      providerId: true,
    },
  });

  return c.json({
    adSources: sources.map((s) => ({
      id: s.id,
      name: s.adSourceName,
      displayName: AD_SOURCE_CONFIGS[s.adSourceName as AdSourceName]?.displayName || s.adSourceName,
      providerId: s.providerId,
    })),
  });
});

/**
 * POST /ad-sources/internal/credentials - Get decrypted credentials for an ad source
 * Protected by internal API key
 */
adSourcesRouter.post("/internal/credentials", async (c) => {
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json() as {
    userId: string;
    adSourceName: string;
    organizationId?: string;
    providerId?: string;
  };
  const { userId, adSourceName, organizationId, providerId } = body;

  if (!userId || !adSourceName) {
    return c.json({ error: "userId and adSourceName are required" }, 400);
  }

  let whereClause = organizationId
    ? and(
        eq(adSources.userId, userId),
        eq(adSources.organizationId, organizationId),
        eq(adSources.adSourceName, adSourceName),
        eq(adSources.isEnabled, true)
      )
    : and(
        eq(adSources.userId, userId),
        isNull(adSources.organizationId),
        eq(adSources.adSourceName, adSourceName),
        eq(adSources.isEnabled, true)
      );

  // Add provider filter if specified
  if (providerId) {
    whereClause = and(whereClause, eq(adSources.providerId, providerId));
  }

  const source = await db.query.adSources.findFirst({
    where: whereClause,
  });

  if (!source) {
    return c.json({ error: "Ad source not connected or disabled" }, 404);
  }

  // Decrypt and return credentials
  const decrypted = await decryptCredentials(source.credentials as Record<string, string>);

  return c.json({
    adSourceName: source.adSourceName,
    credentials: decrypted,
    providerId: source.providerId,
  });
});

export default adSourcesRouter;
