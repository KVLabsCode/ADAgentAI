import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { validateNeonAuthToken, extractAccessToken } from "../lib/neon-auth";

// Neon Auth user type with optional organization context
interface NeonAuthUser {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  role: string | null; // 'admin' or 'user' - set in Neon Console
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
    role: result.user.role,
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
        role: result.user.role,
      });
    }
  }

  await next();
}

/**
 * Middleware to require platform admin role
 * Must be used after requireAuth
 * Checks user.role from Neon Auth (set in Neon Console)
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // Check role from Neon Auth (set in Neon Console)
  if (user.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden: Admin access required" });
  }

  await next();
}
