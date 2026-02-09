import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { validateNeonAuthToken, extractAccessToken } from "../lib/neon-auth";
import { db } from "../db";
import { sql } from "drizzle-orm";

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
 * Validate that a user is actually a member of the specified organization
 * Returns true if user is a member (any role), false otherwise
 * This is a security check to prevent users from claiming orgs they don't belong to
 */
async function validateOrgMembership(userId: string, organizationId: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM neon_auth.member
      WHERE "userId" = ${userId}
      AND "organizationId" = ${organizationId}
      LIMIT 1
    `);
    return result.rows.length > 0;
  } catch (error) {
    // If query fails (e.g., table doesn't exist), fail closed - deny access
    console.error("[auth] Org membership validation failed:", error);
    return false;
  }
}

/**
 * Middleware to require authentication via Neon Auth
 * Validates access token and sets user in context
 * Validates organization membership if org header is provided
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

  // Extract selected organization from header
  let organizationId = extractOrganizationId(c.req.raw.headers);

  // SECURITY: Validate user is actually a member of the claimed organization
  // If not a member, fall back to personal context (null org)
  if (organizationId) {
    const isMember = await validateOrgMembership(result.user.id, organizationId);
    if (!isMember) {
      console.warn(
        `[auth] User ${result.user.id} claimed org ${organizationId} but is not a member. Falling back to personal context.`
      );
      organizationId = null;
    }
  }

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
 * Validates organization membership if org header is provided
 */
export async function optionalAuth(c: Context, next: Next) {
  const accessToken = extractAccessToken(c.req.raw.headers);

  if (accessToken) {
    const result = await validateNeonAuthToken(accessToken);
    if (result.success) {
      // Extract selected organization from header
      let organizationId = extractOrganizationId(c.req.raw.headers);

      // SECURITY: Validate user is actually a member of the claimed organization
      if (organizationId) {
        const isMember = await validateOrgMembership(result.user.id, organizationId);
        if (!isMember) {
          console.warn(
            `[auth] User ${result.user.id} claimed org ${organizationId} but is not a member. Falling back to personal context.`
          );
          organizationId = null;
        }
      }

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

/**
 * Middleware to require organization context
 * Must be used after requireAuth
 * Ensures request has valid organizationId (not personal/null context)
 * Use this for routes that don't make sense outside of an org (e.g., org-specific providers)
 */
export async function requireOrgContext(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  if (!user.organizationId) {
    throw new HTTPException(403, {
      message: "Organization context required. Please select an organization.",
    });
  }

  await next();
}

/**
 * Middleware to validate resource belongs to user's current org context
 * Must be used after requireAuth
 * Takes a function that extracts the resource's org ID from the request
 * Returns 403 if resource org doesn't match user's current org context
 */
export function requireResourceOrgMatch(
  getResourceOrgId: (c: Context) => Promise<string | null> | string | null
) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const resourceOrgId = await getResourceOrgId(c);

    // If resource has no org (personal), user must be in personal context
    if (!resourceOrgId) {
      if (user.organizationId) {
        throw new HTTPException(403, {
          message: "Cannot access personal resources while in organization context",
        });
      }
      await next();
      return;
    }

    // If resource has org, user must be in that org's context
    if (resourceOrgId !== user.organizationId) {
      throw new HTTPException(403, {
        message: "Access denied: Resource belongs to a different organization",
      });
    }

    await next();
  };
}
