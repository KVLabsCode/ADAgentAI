/**
 * Field Options Routes
 *
 * Provides dynamic field options for parameter forms (apps, ad_units, mediation_groups, ad_sources).
 * This route replaces the chat server's /chat/field-options endpoint for better performance
 * by removing the extra HTTP hop through the chat server.
 *
 * Performance improvement: ~50ms saved per request by eliminating HTTP hop
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "../db";
import { connectedProviders } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { safeDecrypt, safeEncrypt } from "../lib/crypto";
import { getCachedAdMobData, buildCacheKey } from "../lib/admob-cache";

// Single source of truth for supported networks (shared with Python)
import { supportedNetworks } from "../lib/supported-networks";

const fieldOptions = new Hono();

// All routes require authentication
fieldOptions.use("/*", requireAuth);

// ============================================================
// Schemas
// ============================================================

const fieldTypeSchema = z.enum([
  "apps",
  "ad_units",
  "mediation_groups",
  "ad_sources",
  "bidding_ad_sources",
  "waterfall_ad_sources",
]);

const querySchema = z.object({
  // accountId is the publisherId (e.g., "pub-123") - we look up the provider by this
  accountId: z.string().min(1),
  platform: z.string().optional(),
  adFormat: z.string().optional(),
  appId: z.string().optional(),
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
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

/**
 * Get a valid access token for a provider, refreshing if necessary
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
  const needsRefresh =
    !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

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
 * Normalize network name for matching against supported-networks.json
 * Strips "(bidding)" suffix and lowercases
 */
function normalizeNetworkName(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(bidding\)\s*/g, "")
    .replace(/\s*\(sdk\)\s*/g, "")
    .replace(/\s*waterfall\s*/g, "")
    .trim();
}

/**
 * Check if an ad source is coming soon for bidding
 * Uses supportedNetworks from shared JSON (single source of truth)
 */
function isComingSoonBidding(title: string): boolean {
  const normalized = normalizeNetworkName(title);
  return !supportedNetworks.bidding[normalized as keyof typeof supportedNetworks.bidding];
}

/**
 * Check if an ad source is coming soon for waterfall
 * Uses supportedNetworks from shared JSON (single source of truth)
 */
function isComingSoonWaterfall(title: string): boolean {
  const normalized = normalizeNetworkName(title);
  // AdMob Network doesn't have a waterfall variant
  if (normalized === "admob network") return true;
  return !supportedNetworks.waterfall[normalized as keyof typeof supportedNetworks.waterfall];
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /field-options/:fieldType - Get field options
 *
 * Query params:
 *   - providerId (required): Provider UUID
 *   - platform (optional): Filter by platform (IOS, ANDROID)
 *   - adFormat (optional): Filter by ad format (BANNER, INTERSTITIAL, REWARDED, etc.)
 *   - appId (optional): Filter by app ID
 */
fieldOptions.get(
  "/:fieldType",
  zValidator("param", z.object({ fieldType: fieldTypeSchema })),
  zValidator("query", querySchema),
  async (c) => {
    const user = c.get("user");
    const { fieldType } = c.req.valid("param");
    const { accountId, platform: _platform, adFormat, appId } = c.req.valid("query");

    // Determine actual field type and filter for ad sources
    let actualFieldType = fieldType;
    let adSourceFilter: "bidding" | "waterfall" | null = null;

    if (fieldType === "bidding_ad_sources") {
      actualFieldType = "ad_sources";
      adSourceFilter = "bidding";
    } else if (fieldType === "waterfall_ad_sources") {
      actualFieldType = "ad_sources";
      adSourceFilter = "waterfall";
    }

    // Look up provider by publisherId (accountId) and validate ownership
    const whereClause = user.organizationId
      ? and(
          eq(connectedProviders.publisherId, accountId),
          eq(connectedProviders.userId, user.id),
          eq(connectedProviders.organizationId, user.organizationId)
        )
      : and(
          eq(connectedProviders.publisherId, accountId),
          eq(connectedProviders.userId, user.id),
          isNull(connectedProviders.organizationId)
        );

    const provider = await db.query.connectedProviders.findFirst({
      where: whereClause,
    });

    if (!provider) {
      return c.json({ options: [] });
    }

    if (provider.provider !== "admob") {
      return c.json({ options: [] });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(provider);
    if (!accessToken) {
      return c.json({ options: [], error: "Token unavailable" });
    }

    // Normalize account ID format for AdMob API
    const admobAccountId = provider.publisherId?.startsWith("pub-")
      ? provider.publisherId
      : `pub-${provider.publisherId}`;

    try {
      // Map field type to AdMob API endpoint
      const endpointMap: Record<string, string> = {
        apps: `https://admob.googleapis.com/v1/accounts/${admobAccountId}/apps?pageSize=100`,
        ad_units: `https://admob.googleapis.com/v1/accounts/${admobAccountId}/adUnits?pageSize=100`,
        mediation_groups: `https://admob.googleapis.com/v1/accounts/${admobAccountId}/mediationGroups?pageSize=100`,
        ad_sources: `https://admob.googleapis.com/v1beta/accounts/${admobAccountId}/adSources?pageSize=100`,
      };

      const endpoint = endpointMap[actualFieldType];
      if (!endpoint) {
        return c.json({ options: [] });
      }

      // Phase 4 optimization: Cache AdMob API responses
      // Cache key includes filters for ad_units (platform, adFormat, appId filtering happens post-fetch)
      const cacheKey = buildCacheKey(actualFieldType, admobAccountId);

      // Define expected response type for AdMob API
      interface AdMobApiResponse {
        apps?: Array<{
          name?: string;
          appId?: string;
          platform?: string;
          manualAppInfo?: { displayName?: string };
          linkedAppInfo?: { displayName?: string };
        }>;
        adUnits?: Array<{
          name?: string;
          adUnitId?: string;
          displayName?: string;
          adFormat?: string;
          appId?: string;
        }>;
        mediationGroups?: Array<{
          name?: string;
          mediationGroupId?: string;
          displayName?: string;
          state?: string;
        }>;
        adSources?: Array<{
          name?: string;
          adSourceId?: string;
          title?: string;
        }>;
      }

      const data = await getCachedAdMobData<AdMobApiResponse>(
        cacheKey,
        async () => {
          const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            console.error(
              `[field-options] AdMob API error for ${actualFieldType}:`,
              await response.text()
            );
            throw new Error("Failed to fetch from AdMob");
          }

          return response.json() as Promise<AdMobApiResponse>;
        }
      ).catch((error) => {
        console.error(`[field-options] Cache/fetch error:`, error);
        return null;
      });

      if (!data) {
        return c.json({ options: [], error: "Failed to fetch from AdMob" });
      }
      let options: Array<{
        value: string;
        label: string;
        disabled?: boolean;
        comingSoon?: boolean;
        adFormat?: string;
        appId?: string;
      }> = [];

      // Process based on field type
      if (actualFieldType === "apps") {
        const apps = data.apps || [];

        const seen = new Set<string>();
        options = apps
          .filter((app) => {
            const id = app.appId || app.name?.split("/").pop() || "";
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((app) => ({
            value: app.appId || app.name?.split("/").pop() || "",
            label:
              app.linkedAppInfo?.displayName ||
              app.manualAppInfo?.displayName ||
              "Unnamed App",
          }));
      } else if (actualFieldType === "ad_units") {
        const adUnits = data.adUnits || [];

        const seen = new Set<string>();
        options = adUnits
          .filter((unit) => {
            const id = unit.adUnitId || "";
            if (!id || seen.has(id)) return false;
            seen.add(id);

            // Apply adFormat filter
            if (adFormat && unit.adFormat) {
              if (unit.adFormat.toUpperCase() !== adFormat.toUpperCase()) {
                return false;
              }
            }

            // Apply appId filter
            if (appId && unit.appId) {
              if (unit.appId !== appId) {
                return false;
              }
            }

            return true;
          })
          .map((unit) => {
            const fullId = unit.adUnitId || "";
            const shortId = fullId.split("/").pop()?.slice(-4) || "";
            return {
              value: fullId,
              label: `${unit.displayName || "Unnamed"} (${unit.adFormat || "Unknown"}) #${shortId}`,
              adFormat: unit.adFormat,
              appId: unit.appId,
            };
          });
      } else if (actualFieldType === "mediation_groups") {
        const groups = data.mediationGroups || [];

        const seen = new Set<string>();
        options = groups
          .filter((group) => {
            const id =
              group.mediationGroupId || group.name?.split("/").pop() || "";
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((group) => ({
            value:
              group.mediationGroupId || group.name?.split("/").pop() || "",
            label: `${group.displayName || "Unnamed"} (${group.state || "Unknown"})`,
          }));
      } else if (actualFieldType === "ad_sources") {
        const sources = data.adSources || [];

        const seen = new Set<string>();
        const filteredSources = sources.filter((source) => {
          const id = source.adSourceId || source.name?.split("/").pop() || "";
          if (!id || seen.has(id)) return false;
          seen.add(id);

          const title = source.title || "";
          const titleLower = title.toLowerCase();

          if (adSourceFilter === "bidding") {
            // Include if has "(bidding)" OR is exactly "AdMob Network"
            const isAdmobBidding = titleLower === "admob network";
            const hasBiddingSuffix = titleLower.includes("(bidding)");
            return isAdmobBidding || hasBiddingSuffix;
          } else if (adSourceFilter === "waterfall") {
            // Exclude bidding variants but NOT "AdMob Network"
            const hasBiddingSuffix = titleLower.includes("(bidding)");
            const isAdmobBidding = titleLower === "admob network";
            return !hasBiddingSuffix && !isAdmobBidding;
          }

          return true;
        });

        options = filteredSources.map((source) => {
          const title = source.title || "Unknown Network";
          let disabled = false;
          let comingSoon = false;

          // Check if coming soon
          if (adSourceFilter === "bidding" && isComingSoonBidding(title)) {
            disabled = true;
            comingSoon = true;
          } else if (
            adSourceFilter === "waterfall" &&
            isComingSoonWaterfall(title)
          ) {
            disabled = true;
            comingSoon = true;
          }

          return {
            value: source.adSourceId || source.name?.split("/").pop() || "",
            label: title,
            disabled,
            comingSoon,
          };
        });
      }

      return c.json({ options });
    } catch (error) {
      console.error(`[field-options] Error fetching ${actualFieldType}:`, error);
      return c.json({ options: [], error: "Failed to fetch options" });
    }
  }
);

export default fieldOptions;
