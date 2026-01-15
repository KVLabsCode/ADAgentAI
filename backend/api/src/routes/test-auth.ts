/**
 * Test authentication endpoint for E2E testing
 *
 * SECURITY: Only available in non-production environments
 * Creates a session for a test user without going through OAuth
 */

import { Hono } from "hono";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";

const testAuth = new Hono();

// Only enable in CI or test environments (never in production)
const isTestEnabled =
  process.env.CI === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.NODE_ENV === "development";

// Test user details (using a deterministic UUID for the test user)
const TEST_USER = {
  id: "00000000-0000-0000-0000-e2e000000001",
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

/**
 * Create a test session for E2E testing
 * POST /api/test-auth/session
 *
 * Returns: { token: string, expiresAt: string }
 */
testAuth.post("/session", async (c) => {
  if (!isTestEnabled) {
    return c.json({ error: "Test auth is disabled in production" }, 403);
  }

  try {
    // Create or get test user in neon_auth schema
    await db.execute(sql`
      INSERT INTO neon_auth."user" (id, email, name, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${TEST_USER.id}, ${TEST_USER.email}, ${TEST_USER.name}, true, 'user', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        "updatedAt" = NOW()
    `);

    // Generate session token
    const sessionToken = randomBytes(32).toString("hex");
    const sessionId = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session in neon_auth schema
    await db.execute(sql`
      INSERT INTO neon_auth.session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
      VALUES (
        ${sessionId},
        ${sessionToken},
        ${TEST_USER.id},
        ${expiresAt.toISOString()}::timestamp,
        NOW(),
        NOW()
      )
    `);

    // Add to waitlist with 'joined' status (valid enum value) so tests can access the app
    await db.execute(sql`
      INSERT INTO waitlist (email, status, "joinedAt", "createdAt")
      VALUES (${TEST_USER.email}, 'joined', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        status = 'joined',
        "joinedAt" = COALESCE(waitlist."joinedAt", NOW())
    `);

    // Add user preferences with ToS acceptance for test user
    await db.execute(sql`
      INSERT INTO user_preferences ("userId", "tosAcceptedAt", "tosVersion", "createdAt", "updatedAt")
      VALUES (${TEST_USER.id}, NOW(), '1.0', NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET
        "tosAcceptedAt" = NOW(),
        "updatedAt" = NOW()
    `);

    console.log("[test-auth] Created test session for E2E testing");

    return c.json({
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      user: TEST_USER,
    });
  } catch (error) {
    console.error("[test-auth] Failed to create test session:", error);
    return c.json({ error: "Failed to create test session", details: String(error) }, 500);
  }
});

/**
 * Clean up test user and sessions
 * DELETE /api/test-auth/session
 */
testAuth.delete("/session", async (c) => {
  if (!isTestEnabled) {
    return c.json({ error: "Test auth is disabled in production" }, 403);
  }

  try {
    // Delete test sessions
    await db.execute(sql`
      DELETE FROM neon_auth.session WHERE "userId" = ${TEST_USER.id}
    `);

    console.log("[test-auth] Cleaned up test sessions");

    return c.json({ success: true });
  } catch (error) {
    console.error("[test-auth] Failed to clean up test sessions:", error);
    return c.json({ error: "Failed to clean up" }, 500);
  }
});

export default testAuth;
