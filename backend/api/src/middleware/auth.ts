import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth, type AuthSession } from "../lib/auth";

// Extend Hono context with session
declare module "hono" {
  interface ContextVariableMap {
    session: AuthSession;
    user: AuthSession["user"];
  }
}

/**
 * Middleware to require authentication
 * Throws 401 if no valid session
 */
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  c.set("session", session);
  c.set("user", session.user);

  await next();
}

/**
 * Middleware to optionally load session
 * Does not throw if no session
 */
export async function optionalAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    c.set("session", session);
    c.set("user", session.user);
  }

  await next();
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  if (user.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden: Admin access required" });
  }

  await next();
}
