/**
 * Audit logging utility for admin operations.
 * Provides a clean API for logging admin access to sensitive resources.
 *
 * See P-105: [Security] Add audit logging for admin content access
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import { adminAuditLog, type NewAdminAuditLogEntry } from "../db/schema";

/**
 * Audit action types for categorizing admin operations.
 */
export type AuditAction =
  // Conversation access
  | "list_conversations"
  | "view_conversation"
  | "view_conversation_stats"
  // Usage metrics
  | "view_usage_metrics"
  | "export_usage_data"
  // System config
  | "view_system_config"
  | "update_system_config"
  | "batch_update_system_config"
  | "reset_system_config"
  // Blog management
  | "list_blog_posts"
  | "view_blog_post"
  | "create_blog_post"
  | "update_blog_post"
  | "delete_blog_post"
  // Agent management
  | "list_agents"
  | "view_agent"
  | "create_agent"
  | "update_agent"
  | "delete_agent"
  | "list_tasks"
  | "view_task"
  | "create_task"
  | "update_task"
  | "delete_task"
  | "seed_agents"
  // Provider access
  | "view_provider_credentials"
  // Generic
  | "admin_access";

/**
 * Options for logging an audit entry.
 */
export interface AuditLogOptions {
  /** Admin user performing the action */
  adminUserId: string;
  /** Type of action being performed */
  action: AuditAction;
  /** User ID being accessed (for user data access) */
  targetUserId?: string;
  /** Resource ID being accessed or modified */
  targetResourceId?: string;
  /** Additional context about the action */
  metadata?: Record<string, unknown>;
}

/**
 * Log an admin action to the audit log.
 * This should be called for any admin access to user data or system configuration.
 *
 * @example
 * ```ts
 * await logAuditEntry({
 *   adminUserId: user.id,
 *   action: "view_conversation",
 *   targetUserId: conversation.userId,
 *   targetResourceId: conversation.id,
 *   metadata: { messageCount: messages.length }
 * });
 * ```
 */
export async function logAuditEntry(options: AuditLogOptions): Promise<void> {
  const { adminUserId, action, targetUserId, targetResourceId, metadata } = options;

  try {
    await db.insert(adminAuditLog).values({
      adminUserId,
      action,
      targetUserId: targetUserId ?? null,
      targetResourceId: targetResourceId ?? null,
      metadata: metadata ?? null,
    } satisfies Omit<NewAdminAuditLogEntry, "id" | "createdAt">);
  } catch (error) {
    // Log but don't fail the operation if audit logging fails
    console.error("[Audit] Failed to log audit entry:", error);
  }
}

/**
 * Create an audit logger bound to a specific admin user.
 * Useful for logging multiple actions within a request handler.
 *
 * @example
 * ```ts
 * const audit = createAuditLogger(adminUser.id);
 * await audit.log("view_conversation", { targetResourceId: threadId });
 * ```
 */
export function createAuditLogger(adminUserId: string) {
  return {
    log: async (
      action: AuditAction,
      options?: Omit<AuditLogOptions, "adminUserId" | "action">
    ): Promise<void> => {
      await logAuditEntry({
        adminUserId,
        action,
        ...options,
      });
    },
  };
}

/**
 * Retention policy: Delete audit logs older than specified days.
 * Call this periodically (e.g., daily cron job) to maintain log retention.
 *
 * Default retention is 90 days as specified in P-105.
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await db.execute(sql`
      WITH deleted AS (
        DELETE FROM admin_audit_log
        WHERE created_at < ${cutoffDate}
        RETURNING id
      )
      SELECT count(*) FROM deleted
    `);

    const deletedCount = Number((result.rows[0] as { count: string })?.count) || 0;

    if (deletedCount > 0) {
      console.log(`[Audit] Cleaned up ${deletedCount} audit log entries older than ${retentionDays} days`);
    }

    return deletedCount;
  } catch (error) {
    console.error("[Audit] Failed to cleanup old audit logs:", error);
    return 0;
  }
}
