import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import {
  connectedProviders,
  chatSessions,
  messages,
  userProviderPreferences,
  userPreferences,
  waitlist
} from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const account = new Hono();

// All account routes require authentication
account.use("*", requireAuth);

// Current ToS version - update when ToS changes
const CURRENT_TOS_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";

// ============================================================
// Terms of Service Routes
// ============================================================

/**
 * GET /account/tos-status - Check if user has accepted ToS
 */
account.get("/tos-status", async (c) => {
  const user = c.get("user");

  try {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    if (!prefs || !prefs.tosAcceptedAt) {
      return c.json({
        accepted: false,
        currentVersion: CURRENT_TOS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      });
    }

    // Check if accepted version is current
    const tosUpToDate = prefs.tosVersion === CURRENT_TOS_VERSION;
    const privacyUpToDate = prefs.privacyVersion === CURRENT_PRIVACY_VERSION;

    return c.json({
      accepted: tosUpToDate && privacyUpToDate,
      acceptedAt: prefs.tosAcceptedAt,
      tosVersion: prefs.tosVersion,
      privacyVersion: prefs.privacyVersion,
      currentTosVersion: CURRENT_TOS_VERSION,
      currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
      needsUpdate: !tosUpToDate || !privacyUpToDate,
    });
  } catch (error) {
    console.error("[Account] Error checking ToS status:", error);
    return c.json({ error: "Failed to check ToS status" }, 500);
  }
});

/**
 * POST /account/accept-tos - Accept Terms of Service
 */
const acceptTosSchema = z.object({
  marketingOptIn: z.boolean().optional().default(false),
});

account.post("/accept-tos", zValidator("json", acceptTosSchema), async (c) => {
  const user = c.get("user");
  const { marketingOptIn } = c.req.valid("json");

  try {
    const now = new Date();

    // Check if user already has preferences
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    if (existing) {
      // Update existing preferences
      await db
        .update(userPreferences)
        .set({
          tosAcceptedAt: now,
          tosVersion: CURRENT_TOS_VERSION,
          privacyAcceptedAt: now,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          marketingOptIn,
          updatedAt: now,
        })
        .where(eq(userPreferences.id, existing.id));
    } else {
      // Create new preferences
      await db.insert(userPreferences).values({
        userId: user.id,
        tosAcceptedAt: now,
        tosVersion: CURRENT_TOS_VERSION,
        privacyAcceptedAt: now,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        marketingOptIn,
      });
    }

    return c.json({
      success: true,
      acceptedAt: now,
      tosVersion: CURRENT_TOS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    });
  } catch (error) {
    console.error("[Account] Error accepting ToS:", error);
    return c.json({ error: "Failed to accept Terms of Service" }, 500);
  }
});

// ============================================================
// Account Deletion Routes
// ============================================================

/**
 * DELETE /account - Delete user account and all associated data
 * Requires confirmation by sending email in request body
 */
const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
});

account.delete("/", zValidator("json", deleteAccountSchema), async (c) => {
  const user = c.get("user");
  const { confirmEmail } = c.req.valid("json");

  // Verify the email matches the user's email
  if (!user.email || confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({ error: "Email confirmation does not match your account email" }, 400);
  }

  try {
    // Delete all user data in order (respecting foreign key constraints)

    // 1. Delete messages (via chat sessions cascade)
    // First get all session IDs for this user
    const userSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));

    // Delete messages for each session
    for (const session of userSessions) {
      await db.delete(messages).where(eq(messages.sessionId, session.id));
    }

    // 2. Delete chat sessions
    await db.delete(chatSessions).where(eq(chatSessions.userId, user.id));

    // 3. Delete user provider preferences
    // First get provider IDs for this user
    const userProviders = await db
      .select({ id: connectedProviders.id })
      .from(connectedProviders)
      .where(eq(connectedProviders.userId, user.id));

    for (const provider of userProviders) {
      await db.delete(userProviderPreferences).where(eq(userProviderPreferences.providerId, provider.id));
    }

    // 4. Delete connected providers
    await db.delete(connectedProviders).where(eq(connectedProviders.userId, user.id));

    // 5. Delete user preferences
    await db.delete(userPreferences).where(eq(userPreferences.userId, user.id));

    // 6. Update waitlist entry (don't delete, just mark for reference)
    if (user.email) {
      await db
        .update(waitlist)
        .set({ status: "rejected" })
        .where(eq(waitlist.email, user.email.toLowerCase()));
    }

    // Note: We do NOT delete from Neon Auth tables (neon_auth schema)
    // The user should sign out after this, and Neon Auth handles its own cleanup

    console.log(`[Account] Deleted all data for user: ${user.id} (${user.email || 'unknown'})`);

    return c.json({
      success: true,
      message: "Account data deleted successfully. Please sign out.",
      deletedData: {
        chatSessions: userSessions.length,
        connectedProviders: userProviders.length,
      },
    });
  } catch (error) {
    console.error("[Account] Error deleting account:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

/**
 * GET /account/data-summary - Get summary of user's data (for deletion preview)
 */
account.get("/data-summary", async (c) => {
  const user = c.get("user");

  try {
    // Count chat sessions
    const sessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));

    // Count messages
    let messageCount = 0;
    for (const session of sessions) {
      const msgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.sessionId, session.id));
      messageCount += msgs.length;
    }

    // Count connected providers
    const providers = await db
      .select({ id: connectedProviders.id })
      .from(connectedProviders)
      .where(eq(connectedProviders.userId, user.id));

    return c.json({
      chatSessions: sessions.length,
      messages: messageCount,
      connectedProviders: providers.length,
    });
  } catch (error) {
    console.error("[Account] Error getting data summary:", error);
    return c.json({ error: "Failed to get data summary" }, 500);
  }
});

export default account;
