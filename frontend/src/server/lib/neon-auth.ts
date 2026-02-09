/**
 * Neon Auth token validation for backend API
 *
 * Validates both:
 * 1. Session tokens - by querying neon_auth.session table
 * 2. JWT tokens - by verifying with JWKS (used when cookie caching is enabled)
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import * as jose from "jose";

interface NeonAuthUser {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  role: string | null; // 'admin' or 'user' - set in Neon Console
  organizationId: string | null; // Organization ID from JWT claims (if multi-tenant)
}

type ValidateTokenResult = {
  success: true;
  user: NeonAuthUser;
} | {
  success: false;
  error: string;
}

// Cache JWKS to avoid fetching on every request
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get or create JWKS remote key set
 */
async function getJWKS(): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  // Neon Auth JWKS endpoint - get from env or use default pattern
  const neonAuthUrl = process.env.NEON_AUTH_URL || "";
  const jwksUrl = neonAuthUrl
    ? `${neonAuthUrl}/.well-known/jwks.json`
    : null;

  if (!jwksUrl) {
    throw new Error("NEON_AUTH_URL not configured");
  }

  console.log("[NeonAuth] Fetching JWKS from:", jwksUrl);
  jwksCache = jose.createRemoteJWKSet(new URL(jwksUrl));
  jwksCacheTime = now;
  return jwksCache;
}

/**
 * Extract organization ID from JWT payload
 * Checks common claim names: org, org_id, organization_id
 */
function extractOrgFromJWT(payload: jose.JWTPayload): string | null {
  // Check common organization claim names
  const orgClaims = ['org', 'org_id', 'organization_id', 'orgId', 'organizationId'];
  for (const claim of orgClaims) {
    const value = payload[claim];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return null;
}

/**
 * Look up user role from database (for JWT tokens that don't include role)
 */
async function getUserRoleFromDB(userId: string): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT role FROM neon_auth."user"
      WHERE id = ${userId}
      LIMIT 1
    `);
    const rows = result.rows as Array<{ role: string | null }>;
    return rows[0]?.role || null;
  } catch (error) {
    console.error("[NeonAuth] Failed to lookup user role:", error);
    return null;
  }
}

/**
 * Validate a JWT token using JWKS
 */
async function validateJWT(token: string): Promise<ValidateTokenResult> {
  try {
    const jwks = await getJWKS();
    const { payload } = await jose.jwtVerify(token, jwks);

    // Extract organization from JWT claims
    const organizationId = extractOrgFromJWT(payload);

    // Get role from database - JWT "role" claim is often just "authenticated"
    // which is a Neon Auth default, not our app's actual role (admin/user)
    let role: string | null = null;
    if (payload.sub) {
      role = await getUserRoleFromDB(payload.sub as string);
    }

    console.log("[NeonAuth] JWT validated, user:", payload.sub, payload.email, "org:", organizationId, "role:", role);

    return {
      success: true,
      user: {
        id: payload.sub as string,
        primaryEmail: (payload.email as string) || null,
        displayName: (payload.name as string) || null,
        profileImageUrl: null, // JWT doesn't include image
        role,
        organizationId,
      },
    };
  } catch (error) {
    console.error("[NeonAuth] JWT validation error:", error);
    return { success: false, error: "Invalid JWT" };
  }
}

/**
 * Validate a session token from the database
 */
async function validateSessionToken(sessionToken: string): Promise<ValidateTokenResult> {
  try {
    const result = await db.execute(sql`
      SELECT
        s.id as session_id,
        s."userId" as user_id,
        s."expiresAt" as expires_at,
        u.id,
        u.email,
        u.name,
        u.image,
        u.role
      FROM neon_auth.session s
      JOIN neon_auth."user" u ON s."userId" = u.id
      WHERE s.token = ${sessionToken}
      AND s."expiresAt" > NOW()
      LIMIT 1
    `);

    const rows = result.rows as Array<{
      session_id: string;
      user_id: string;
      expires_at: Date;
      id: string;
      email: string | null;
      name: string | null;
      image: string | null;
      role: string | null;
    }>;

    if (!rows || rows.length === 0) {
      return { success: false, error: "Invalid or expired session" };
    }

    const row = rows[0];
    console.log("[NeonAuth] Session validated, user:", row.id, row.email, "role:", row.role);

    return {
      success: true,
      user: {
        id: row.id,
        primaryEmail: row.email,
        displayName: row.name,
        profileImageUrl: row.image,
        role: row.role,
        organizationId: null, // Session tokens don't include org; use x-organization-id header
      },
    };
  } catch (error) {
    console.error("[NeonAuth] Session validation error:", error);
    return { success: false, error: "Validation failed" };
  }
}

/**
 * Validate a token from Neon Auth
 * Handles both session tokens and JWTs (from cookie caching)
 */
export async function validateNeonAuthToken(token: string): Promise<ValidateTokenResult> {
  if (!token) {
    return { success: false, error: "No token provided" };
  }

  console.log("[NeonAuth] Validating token:", token.substring(0, 20) + "...");

  // JWT tokens start with 'eyJ' (base64 encoded JSON header)
  if (token.startsWith("eyJ")) {
    console.log("[NeonAuth] Token is JWT, validating with JWKS...");
    return validateJWT(token);
  } else {
    console.log("[NeonAuth] Token is session token, validating in database...");
    return validateSessionToken(token);
  }
}

/**
 * Extract access token from request headers
 * Supports both:
 * - x-stack-access-token header (legacy Neon Auth convention)
 * - Authorization: Bearer <token> (standard OAuth)
 */
export function extractAccessToken(headers: Headers): string | null {
  // Check x-stack-access-token first (legacy support)
  const stackToken = headers.get("x-stack-access-token");
  if (stackToken) return stackToken;

  // Fall back to Authorization header
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Simplified token validation that returns user or null
 * Used by internal endpoints for service-to-service auth
 *
 * Note: organizationId from JWT claims may be null. If so, the caller
 * should use the x-organization-id header for org context (validated by middleware).
 */
export async function validateToken(token: string): Promise<{
  id: string;
  email: string | null;
  organizationId: string | null;
} | null> {
  const result = await validateNeonAuthToken(token);
  if (!result.success) {
    return null;
  }

  return {
    id: result.user.id,
    email: result.user.primaryEmail,
    organizationId: result.user.organizationId,
  };
}
