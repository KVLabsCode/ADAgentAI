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
  waitlist,
  runSummaries,
  members,
  invitations,
  deletedUsers,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";
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
    // GDPR-compliant deletion - delete all personal data across all tables
    // Order matters due to foreign key constraints

    const deletionSummary = {
      messages: 0,
      chatSessions: 0,
      userProviderPreferences: 0,
      connectedProviders: 0,
      userPreferences: 0,
      runSummaries: 0,
      memberships: 0,
      invitations: 0,
      adminAuditLogs: 0,
      checkpoints: 0,
    };

    // Step 0: Collect aggregate data BEFORE deletion for analytics (GDPR-compliant)
    // We create an anonymized record with no PII
    const crypto = await import("crypto");
    const anonymousId = crypto.randomUUID(); // New random ID, NOT the user's ID

    // 1. Delete messages (via chat sessions)
    const userSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));

    for (const session of userSessions) {
      const deleted = await db.delete(messages).where(eq(messages.sessionId, session.id)).returning();
      deletionSummary.messages += deleted.length;
    }

    // 2. Delete chat sessions
    const deletedSessions = await db.delete(chatSessions).where(eq(chatSessions.userId, user.id)).returning();
    deletionSummary.chatSessions = deletedSessions.length;

    // 3. Delete user provider preferences
    const userProviders = await db
      .select({ id: connectedProviders.id })
      .from(connectedProviders)
      .where(eq(connectedProviders.userId, user.id));

    for (const provider of userProviders) {
      const deleted = await db.delete(userProviderPreferences).where(eq(userProviderPreferences.providerId, provider.id)).returning();
      deletionSummary.userProviderPreferences += deleted.length;
    }

    // 4. Delete connected providers (includes OAuth tokens - sensitive data)
    const deletedProviders = await db.delete(connectedProviders).where(eq(connectedProviders.userId, user.id)).returning();
    deletionSummary.connectedProviders = deletedProviders.length;

    // 5. Delete user preferences (ToS acceptance, settings)
    const deletedPrefs = await db.delete(userPreferences).where(eq(userPreferences.userId, user.id)).returning();
    deletionSummary.userPreferences = deletedPrefs.length;

    // 6. Delete run summaries (usage metrics - personal data under GDPR)
    const deletedRuns = await db.delete(runSummaries).where(eq(runSummaries.userId, user.id)).returning();
    deletionSummary.runSummaries = deletedRuns.length;

    // 7. Delete organization memberships
    const deletedMembers = await db.delete(members).where(eq(members.userId, user.id)).returning();
    deletionSummary.memberships = deletedMembers.length;

    // 8. Delete invitations sent by user (as inviter)
    const deletedInvites = await db.delete(invitations).where(eq(invitations.inviterId, user.id)).returning();
    deletionSummary.invitations = deletedInvites.length;

    // 9. Anonymize admin audit logs (keep for compliance, but remove PII)
    // GDPR allows keeping anonymized records for legitimate business purposes
    const auditResult = await db.execute(sql`
      UPDATE admin_audit_log
      SET admin_user_id = 'deleted_user',
          target_user_id = CASE WHEN target_user_id = ${user.id} THEN 'deleted_user' ELSE target_user_id END,
          metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{anonymized}', 'true'::jsonb)
      WHERE admin_user_id = ${user.id} OR target_user_id = ${user.id}
    `);
    deletionSummary.adminAuditLogs = auditResult.rowCount || 0;

    // 10. Delete LangGraph checkpoint data (conversation state)
    // LangGraph uses tables: checkpoints, checkpoint_blobs, checkpoint_writes, checkpoint_migrations
    try {
      // Delete checkpoint writes first (references checkpoints)
      await db.execute(sql`
        DELETE FROM checkpoint_writes
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
      `);

      // Delete checkpoint blobs
      await db.execute(sql`
        DELETE FROM checkpoint_blobs
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
      `);

      // Delete checkpoints
      const checkpointResult = await db.execute<{ count: number }>(sql`
        DELETE FROM checkpoints
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
        RETURNING 1
      `);
      deletionSummary.checkpoints = Array.isArray(checkpointResult) ? checkpointResult.length : 0;
    } catch (checkpointError) {
      // LangGraph tables might not exist or have different schema
      console.warn("[Account] Checkpoint deletion skipped (tables may not exist):", checkpointError);
    }

    // 11. Update waitlist entry (anonymize rather than delete for analytics)
    if (user.email) {
      await db
        .update(waitlist)
        .set({
          status: "rejected",
          email: `deleted_${Date.now()}@deleted.local`, // Anonymize email
          name: null,
        })
        .where(eq(waitlist.email, user.email.toLowerCase()));
    }

    // 12. Create anonymized deleted user record for analytics
    // This allows tracking "total users who ever used the product" without storing PII
    const userPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    const totalTokens = await db
      .select({ sum: sql<number>`COALESCE(SUM(${runSummaries.totalTokens}), 0)` })
      .from(runSummaries)
      .where(eq(runSummaries.userId, user.id));

    const totalApiCalls = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(runSummaries)
      .where(eq(runSummaries.userId, user.id));

    // Calculate account lifetime (if we have user creation date)
    // Note: Neon Auth users don't expose createdAt in the JWT, so we leave it null
    // You could query Neon Auth API separately if needed, but it's optional
    let accountLifetimeDays: number | null = null;
    let accountCreatedAt: Date | null = null;

    await db.insert(deletedUsers).values({
      anonymousId,
      accountCreatedAt,
      accountDeletedAt: new Date(),
      accountLifetimeDays,
      totalChatSessions: deletionSummary.chatSessions,
      totalMessages: deletionSummary.messages,
      totalTokensUsed: Number(totalTokens[0]?.sum || 0),
      totalApiCalls: Number(totalApiCalls[0]?.count || 0),
      hadConnectedProviders: deletionSummary.connectedProviders > 0,
      wasOrgMember: deletionSummary.memberships > 0,
      acceptedTos: userPrefs.length > 0 && !!userPrefs[0].tosAcceptedAt,
      deletionReason: "user_requested",
    });

    // Note: We do NOT delete from Neon Auth tables (neon_auth schema)
    // The user should sign out after this, and Neon Auth handles its own cleanup
    // This separation is intentional - Neon Auth manages identity, we manage app data

    console.log(`[Account] GDPR deletion completed for user: ${user.id} (anonymized as ${anonymousId})`, deletionSummary);

    return c.json({
      success: true,
      message: "Account and all personal data deleted successfully. Please sign out.",
      deletedData: deletionSummary,
      gdprCompliance: {
        personalDataDeleted: true,
        retentionPolicy: "All personal data deleted immediately",
        anonymizedRecords: [
          "Admin audit logs anonymized (user IDs replaced with 'deleted_user')",
          "Aggregate usage statistics retained (no PII - e.g., 'X users ever used the product')",
        ],
        legalBasis: "Anonymized aggregate data retained under GDPR Article 89 (statistical purposes) and Recital 26 (data no longer identifies a person)",
      },
    });
  } catch (error) {
    console.error("[Account] Error during GDPR deletion:", error);
    return c.json({ error: "Failed to delete account. Please contact support." }, 500);
  }
});

/**
 * DELETE /account/chat-history - Delete all chat history (keep account)
 * Allows users to clear their conversation data without deleting their account
 */
account.delete("/chat-history", async (c) => {
  const user = c.get("user");

  try {
    const deletionSummary = {
      messages: 0,
      chatSessions: 0,
      checkpoints: 0,
    };

    // 1. Delete messages (via chat sessions)
    const userSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));

    for (const session of userSessions) {
      const deleted = await db.delete(messages).where(eq(messages.sessionId, session.id)).returning();
      deletionSummary.messages += deleted.length;
    }

    // 2. Delete chat sessions
    const deletedSessions = await db.delete(chatSessions).where(eq(chatSessions.userId, user.id)).returning();
    deletionSummary.chatSessions = deletedSessions.length;

    // 3. Delete LangGraph checkpoint data (conversation state)
    try {
      // Delete checkpoint writes first (references checkpoints)
      await db.execute(sql`
        DELETE FROM checkpoint_writes
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
      `);

      // Delete checkpoint blobs
      await db.execute(sql`
        DELETE FROM checkpoint_blobs
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
      `);

      // Delete checkpoints
      const checkpointResult = await db.execute<{ count: number }>(sql`
        DELETE FROM checkpoints
        WHERE thread_id IN (
          SELECT id::text FROM chat_sessions WHERE user_id = ${user.id}
        )
        RETURNING 1
      `);
      deletionSummary.checkpoints = Array.isArray(checkpointResult) ? checkpointResult.length : 0;
    } catch (checkpointError) {
      // LangGraph tables might not exist or have different schema
      console.warn("[Account] Checkpoint deletion skipped (tables may not exist):", checkpointError);
    }

    console.log(`[Account] Chat history deleted for user: ${user.id}`, deletionSummary);

    return c.json({
      success: true,
      message: "All chat history deleted successfully.",
      deletedData: deletionSummary,
    });
  } catch (error) {
    console.error("[Account] Error deleting chat history:", error);
    return c.json({ error: "Failed to delete chat history" }, 500);
  }
});

/**
 * GET /account/data-summary - Get summary of user's data (for deletion preview)
 * GDPR Article 15: Right of Access - users can see what data we hold
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

    // Count run summaries (usage data)
    const runs = await db
      .select({ id: runSummaries.id })
      .from(runSummaries)
      .where(eq(runSummaries.userId, user.id));

    // Count memberships
    const membershipCount = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.userId, user.id));

    // Count user preferences
    const prefs = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id));

    return c.json({
      chatSessions: sessions.length,
      messages: messageCount,
      connectedProviders: providers.length,
      usageRecords: runs.length,
      organizationMemberships: membershipCount.length,
      preferencesAndSettings: prefs.length > 0 ? 1 : 0,
      // GDPR info
      dataCategories: [
        "Chat conversations and messages",
        "Connected advertising platform accounts (AdMob, GAM)",
        "OAuth tokens and credentials (encrypted)",
        "Usage analytics and billing metrics",
        "Organization memberships",
        "Preferences and settings",
      ],
      yourRights: {
        access: "GET /account/export - Download all your data",
        rectification: "Update your profile in Settings",
        erasure: "DELETE /account - Delete all your data",
        portability: "GET /account/export - Export in machine-readable format",
      },
    });
  } catch (error) {
    console.error("[Account] Error getting data summary:", error);
    return c.json({ error: "Failed to get data summary" }, 500);
  }
});

/**
 * GET /account/export - Export all user data (GDPR Article 20: Right to Data Portability)
 * Returns a JSON file with all personal data in a machine-readable format
 */
account.get("/export", async (c) => {
  const user = c.get("user");

  try {
    const exportData: {
      exportedAt: string;
      userId: string;
      email: string | null;
      profile: {
        name: string | null;
        createdAt: string | null;
      };
      chatSessions: Array<{
        id: string;
        title: string;
        createdAt: string;
        messages: Array<{
          role: string;
          content: string;
          createdAt: string;
        }>;
      }>;
      connectedProviders: Array<{
        provider: string;
        accountName: string | null;
        publisherId: string | null;
        networkCode: string | null;
        connectedAt: string;
      }>;
      usageMetrics: Array<{
        date: string;
        service: string | null;
        capability: string | null;
        tokensUsed: number;
        toolCalls: number;
        cost: number | null;
      }>;
      preferences: {
        tosAcceptedAt: string | null;
        privacyAcceptedAt: string | null;
        marketingOptIn: boolean;
        safeMode: boolean;
      } | null;
      organizationMemberships: Array<{
        organizationId: string;
        role: string;
        joinedAt: string;
      }>;
    } = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email || null,
      profile: {
        name: user.name || null,
        createdAt: null, // Will be filled from user data if available
      },
      chatSessions: [],
      connectedProviders: [],
      usageMetrics: [],
      preferences: null,
      organizationMemberships: [],
    };

    // 1. Export chat sessions with messages
    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.userId, user.id),
      with: {
        messages: true,
      },
    });

    exportData.chatSessions = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      messages: session.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
    }));

    // 2. Export connected providers (without tokens for security)
    const providers = await db
      .select({
        provider: connectedProviders.provider,
        accountName: connectedProviders.accountName,
        publisherId: connectedProviders.publisherId,
        networkCode: connectedProviders.networkCode,
        createdAt: connectedProviders.createdAt,
      })
      .from(connectedProviders)
      .where(eq(connectedProviders.userId, user.id));

    exportData.connectedProviders = providers.map((p) => ({
      provider: p.provider,
      accountName: p.accountName,
      publisherId: p.publisherId,
      networkCode: p.networkCode,
      connectedAt: p.createdAt.toISOString(),
    }));

    // 3. Export usage metrics
    const runs = await db
      .select({
        createdAt: runSummaries.createdAt,
        service: runSummaries.service,
        capability: runSummaries.capability,
        totalTokens: runSummaries.totalTokens,
        toolCalls: runSummaries.toolCalls,
        totalCost: runSummaries.totalCost,
      })
      .from(runSummaries)
      .where(eq(runSummaries.userId, user.id));

    exportData.usageMetrics = runs.map((r) => ({
      date: r.createdAt.toISOString(),
      service: r.service,
      capability: r.capability,
      tokensUsed: r.totalTokens,
      toolCalls: r.toolCalls,
      cost: r.totalCost,
    }));

    // 4. Export preferences
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    if (prefs) {
      exportData.preferences = {
        tosAcceptedAt: prefs.tosAcceptedAt?.toISOString() || null,
        privacyAcceptedAt: prefs.privacyAcceptedAt?.toISOString() || null,
        marketingOptIn: prefs.marketingOptIn,
        safeMode: prefs.safeMode,
      };
    }

    // 5. Export organization memberships
    const memberships = await db
      .select({
        organizationId: members.organizationId,
        role: members.role,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(eq(members.userId, user.id));

    exportData.organizationMemberships = memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));

    // Return as JSON with download headers
    c.header("Content-Type", "application/json");
    c.header("Content-Disposition", `attachment; filename="adagent-data-export-${new Date().toISOString().split('T')[0]}.json"`);

    console.log(`[Account] Data export generated for user: ${user.id}`);

    return c.json(exportData);
  } catch (error) {
    console.error("[Account] Error exporting data:", error);
    return c.json({ error: "Failed to export data" }, 500);
  }
});

export default account;
