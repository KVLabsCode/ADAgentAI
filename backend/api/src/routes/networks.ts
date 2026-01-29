import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../db";
import { networkCredentials, type NewNetworkCredential } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { safeEncrypt, safeDecrypt } from "../lib/crypto";

const networks = new Hono();

// Most routes require authentication
networks.use("*", async (c, next) => {
  const path = c.req.path;
  // Skip auth for internal endpoints (uses API key instead)
  if (path.includes("/internal/")) {
    return next();
  }
  return requireAuth(c, next);
});

// ============================================================
// Network Definitions
// ============================================================

/**
 * Network configuration with required credential fields.
 * These are the API-key based networks (not OAuth).
 */
export const NETWORK_CONFIGS = {
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

export type NetworkName = keyof typeof NETWORK_CONFIGS;

// ============================================================
// Schemas
// ============================================================

const networkNameSchema = z.enum([
  "applovin",
  "unity",
  "liftoff",
  "inmobi",
  "mintegral",
  "pangle",
  "dtexchange",
]);

const connectNetworkSchema = z.object({
  credentials: z.record(z.string(), z.string()),
});

const toggleNetworkSchema = z.object({
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
 * GET /networks/config - Get network configuration schemas
 * Returns the field definitions for each network (for form generation)
 */
networks.get("/config", async (c) => {
  return c.json({ networks: NETWORK_CONFIGS });
});

/**
 * GET /networks - List user's connected networks
 */
networks.get("/", async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;

  const whereClause = organizationId
    ? and(eq(networkCredentials.userId, user.id), eq(networkCredentials.organizationId, organizationId))
    : and(eq(networkCredentials.userId, user.id), isNull(networkCredentials.organizationId));

  const credentials = await db.query.networkCredentials.findMany({
    where: whereClause,
    columns: {
      id: true,
      networkName: true,
      isEnabled: true,
      lastVerifiedAt: true,
      createdAt: true,
      credentials: true,
    },
  });

  // Check if user can manage networks
  const canManage = await isOrgAdmin(user.id, organizationId);

  // Mask credentials for display
  const networksWithMaskedCreds = credentials.map((cred) => ({
    id: cred.id,
    networkName: cred.networkName,
    displayName: NETWORK_CONFIGS[cred.networkName as NetworkName]?.displayName || cred.networkName,
    isEnabled: cred.isEnabled,
    lastVerifiedAt: cred.lastVerifiedAt,
    connectedAt: cred.createdAt,
    maskedCredentials: maskCredentials(cred.credentials as Record<string, string>),
  }));

  return c.json({
    networks: networksWithMaskedCreds,
    canManage,
  });
});

/**
 * POST /networks/:network - Connect a network with credentials
 */
networks.post(
  "/:network",
  zValidator("param", z.object({ network: networkNameSchema })),
  zValidator("json", connectNetworkSchema),
  async (c) => {
    const user = c.get("user");
    const { network } = c.req.valid("param");
    const { credentials } = c.req.valid("json");

    // Check if user can manage networks
    const canManage = await isOrgAdmin(user.id, user.organizationId);
    if (!canManage) {
      return c.json({ error: "Only organization admins can connect networks" }, 403);
    }

    // Validate required fields
    const config = NETWORK_CONFIGS[network];
    for (const field of config.fields) {
      if (field.required && !credentials[field.key]) {
        return c.json({ error: `${field.label} is required` }, 400);
      }
    }

    // Encrypt credentials
    const encryptedCredentials = await encryptCredentials(credentials);

    // Check if network already connected
    const whereClause = user.organizationId
      ? and(
          eq(networkCredentials.userId, user.id),
          eq(networkCredentials.organizationId, user.organizationId),
          eq(networkCredentials.networkName, network)
        )
      : and(
          eq(networkCredentials.userId, user.id),
          isNull(networkCredentials.organizationId),
          eq(networkCredentials.networkName, network)
        );

    const existing = await db.query.networkCredentials.findFirst({
      where: whereClause,
    });

    if (existing) {
      // Update existing
      await db
        .update(networkCredentials)
        .set({
          credentials: encryptedCredentials,
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(networkCredentials.id, existing.id));

      return c.json({
        id: existing.id,
        networkName: network,
        displayName: config.displayName,
        isEnabled: true,
        message: "Network credentials updated",
      });
    }

    // Insert new
    const [inserted] = await db
      .insert(networkCredentials)
      .values({
        userId: user.id,
        organizationId: user.organizationId,
        networkName: network,
        credentials: encryptedCredentials,
        isEnabled: true,
      } satisfies NewNetworkCredential)
      .returning({ id: networkCredentials.id });

    return c.json({
      id: inserted.id,
      networkName: network,
      displayName: config.displayName,
      isEnabled: true,
      message: "Network connected successfully",
    }, 201);
  }
);

/**
 * DELETE /networks/:id - Disconnect a network
 */
networks.delete("/:id", async (c) => {
  const user = c.get("user");
  const networkId = c.req.param("id");

  // Check if user can manage networks
  const canManage = await isOrgAdmin(user.id, user.organizationId);
  if (!canManage) {
    return c.json({ error: "Only organization admins can disconnect networks" }, 403);
  }

  // Validate ownership and org context
  const whereClause = user.organizationId
    ? and(
        eq(networkCredentials.id, networkId),
        eq(networkCredentials.userId, user.id),
        eq(networkCredentials.organizationId, user.organizationId)
      )
    : and(
        eq(networkCredentials.id, networkId),
        eq(networkCredentials.userId, user.id),
        isNull(networkCredentials.organizationId)
      );

  const [deleted] = await db
    .delete(networkCredentials)
    .where(whereClause)
    .returning();

  if (!deleted) {
    return c.json({ error: "Network not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * PATCH /networks/:id/toggle - Enable/disable network
 */
networks.patch(
  "/:id/toggle",
  zValidator("json", toggleNetworkSchema),
  async (c) => {
    const user = c.get("user");
    const networkId = c.req.param("id");
    const { isEnabled } = c.req.valid("json");

    // Validate ownership
    const network = await db.query.networkCredentials.findFirst({
      where: eq(networkCredentials.id, networkId),
    });

    if (!network) {
      return c.json({ error: "Network not found" }, 404);
    }

    // Check access (same org context)
    const userOrgId = user.organizationId;
    const networkOrgId = network.organizationId;
    if (networkOrgId !== userOrgId) {
      return c.json({ error: "Network not found" }, 404);
    }

    await db
      .update(networkCredentials)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(networkCredentials.id, networkId));

    return c.json({ id: networkId, isEnabled });
  }
);

/**
 * POST /networks/:network/verify - Verify network credentials
 * Makes a test API call to verify credentials work
 */
networks.post(
  "/:network/verify",
  zValidator("param", z.object({ network: networkNameSchema })),
  zValidator("json", connectNetworkSchema),
  async (c) => {
    const { network } = c.req.valid("param");
    const { credentials } = c.req.valid("json");

    // TODO: Implement actual verification for each network
    // For now, just validate required fields are present
    const config = NETWORK_CONFIGS[network];
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
 * GET /networks/internal/list - List user's enabled networks
 * Protected by internal API key
 */
networks.get("/internal/list", async (c) => {
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.query("userId");
  const organizationId = c.req.query("organizationId");

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const whereClause = organizationId
    ? and(
        eq(networkCredentials.userId, userId),
        eq(networkCredentials.organizationId, organizationId),
        eq(networkCredentials.isEnabled, true)
      )
    : and(
        eq(networkCredentials.userId, userId),
        isNull(networkCredentials.organizationId),
        eq(networkCredentials.isEnabled, true)
      );

  const credentials = await db.query.networkCredentials.findMany({
    where: whereClause,
    columns: {
      id: true,
      networkName: true,
    },
  });

  return c.json({
    networks: credentials.map((c) => ({
      id: c.id,
      name: c.networkName,
      displayName: NETWORK_CONFIGS[c.networkName as NetworkName]?.displayName || c.networkName,
    })),
  });
});

/**
 * POST /networks/internal/credentials - Get decrypted credentials for a network
 * Protected by internal API key
 */
networks.post("/internal/credentials", async (c) => {
  const apiKey = c.req.header("x-internal-api-key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json() as {
    userId: string;
    networkName: string;
    organizationId?: string;
  };
  const { userId, networkName, organizationId } = body;

  if (!userId || !networkName) {
    return c.json({ error: "userId and networkName are required" }, 400);
  }

  const whereClause = organizationId
    ? and(
        eq(networkCredentials.userId, userId),
        eq(networkCredentials.organizationId, organizationId),
        eq(networkCredentials.networkName, networkName),
        eq(networkCredentials.isEnabled, true)
      )
    : and(
        eq(networkCredentials.userId, userId),
        isNull(networkCredentials.organizationId),
        eq(networkCredentials.networkName, networkName),
        eq(networkCredentials.isEnabled, true)
      );

  const credential = await db.query.networkCredentials.findFirst({
    where: whereClause,
  });

  if (!credential) {
    return c.json({ error: "Network not connected or disabled" }, 404);
  }

  // Decrypt and return credentials
  const decrypted = await decryptCredentials(credential.credentials as Record<string, string>);

  return c.json({
    networkName: credential.networkName,
    credentials: decrypted,
  });
});

export default networks;
