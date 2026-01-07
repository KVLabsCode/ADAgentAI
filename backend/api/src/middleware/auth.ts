import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { validateNeonAuthToken, extractAccessToken } from "../lib/neon-auth";

// Neon Auth user type with optional organization context
interface NeonAuthUser {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  organizationId: string | null; // Currently selected organization (null = personal)
  // Aliases for backward compatibility with billing routes
  email: string | null;
  name: string | null;
}

// Extend Hono context with user
declare module "hono" {
  interface ContextVariableMap {
    user: NeonAuthUser;
  }
}

/**
 * Extract selected organization ID from request headers
 * Frontend sends this via x-organization-id header
 */
function extractOrganizationId(headers: Headers): string | null {
  return headers.get("x-organization-id") || null;
}

/**
 * Middleware to require authentication via Neon Auth
 * Validates access token and sets user in context
 * Throws 401 if no valid token
 */
export async function requireAuth(c: Context, next: Next) {
  const accessToken = extractAccessToken(c.req.raw.headers);

  if (!accessToken) {
    throw new HTTPException(401, { message: "No access token provided" });
  }

  const result = await validateNeonAuthToken(accessToken);

  if (!result.success) {
    throw new HTTPException(401, { message: result.error });
  }

  // Extract selected organization from header and add to user context
  const organizationId = extractOrganizationId(c.req.raw.headers);

  c.set("user", {
    ...result.user,
    organizationId,
    // Aliases for backward compatibility
    email: result.user.primaryEmail,
    name: result.user.displayName,
  });
  await next();
}

/**
 * Middleware to optionally load user from Neon Auth
 * Does not throw if no token
 */
export async function optionalAuth(c: Context, next: Next) {
  const accessToken = extractAccessToken(c.req.raw.headers);

  if (accessToken) {
    const result = await validateNeonAuthToken(accessToken);
    if (result.success) {
      const organizationId = extractOrganizationId(c.req.raw.headers);
      c.set("user", {
        ...result.user,
        organizationId,
        // Aliases for backward compatibility
        email: result.user.primaryEmail,
        name: result.user.displayName,
      });
    }
  }

  await next();
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 * TODO: Implement with Neon Auth teams/permissions
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // TODO: Check admin permission via Neon Auth teams
  // For now, check against a list of admin emails
  const adminEmails = (Bun.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  const userEmail = user.primaryEmail?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    throw new HTTPException(403, { message: "Forbidden: Admin access required" });
  }

  await next();
}
