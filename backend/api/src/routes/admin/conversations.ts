import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, sql, and, gte, lte, desc, count, like, or } from "drizzle-orm";
import { db } from "../../db";
import { chatSessions, messages, runSummaries, adminAuditLog } from "../../db/schema";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const conversations = new Hono();

// All conversation routes require authentication and admin role
conversations.use("*", requireAuth);
conversations.use("*", requireAdmin);

// Query params schema for listing conversations
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["success", "error", "all"]).optional().default("all"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /admin/conversations - List all conversations with pagination
 */
conversations.get("/", zValidator("query", listQuerySchema), async (c) => {
  const adminUser = c.get("user");
  const { page, pageSize, search, userId, status, startDate, endDate } = c.req.valid("query");

  try {
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(chatSessions.userId, userId));
    }

    if (startDate) {
      conditions.push(gte(chatSessions.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(chatSessions.createdAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        or(
          like(chatSessions.title, `%${search}%`),
          like(chatSessions.userId, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get conversations with message count and last run summary
    const conversationsQuery = await db.execute(sql`
      WITH session_stats AS (
        SELECT
          cs.id,
          cs.user_id,
          cs.organization_id,
          cs.title,
          cs.is_archived,
          cs.created_at,
          cs.updated_at,
          COUNT(DISTINCT m.id) as message_count,
          MAX(m.created_at) as last_message_at
        FROM chat_sessions cs
        LEFT JOIN messages m ON m.session_id = cs.id
        ${conditions.length > 0
          ? sql`WHERE ${and(...conditions)}`
          : sql``
        }
        GROUP BY cs.id
        ORDER BY cs.updated_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      ),
      session_runs AS (
        SELECT DISTINCT ON (session_id)
          session_id,
          status,
          service,
          capability,
          langsmith_run_id
        FROM run_summaries
        WHERE session_id IS NOT NULL
        ORDER BY session_id, created_at DESC
      )
      SELECT
        ss.*,
        COALESCE(sr.status, 'success') as run_status,
        sr.service,
        sr.capability,
        sr.langsmith_run_id
      FROM session_stats ss
      LEFT JOIN session_runs sr ON sr.session_id = ss.id
      ORDER BY ss.updated_at DESC
    `);

    // Get total count
    const totalQuery = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(whereClause);

    const total = Number(totalQuery[0]?.count) || 0;

    // Filter by status if specified (after join with run_summaries)
    let filteredConversations = conversationsQuery.rows as Record<string, unknown>[];
    if (status !== "all") {
      filteredConversations = filteredConversations.filter(
        (c) => c.run_status === status
      );
    }

    // Log admin access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "list_conversations",
      metadata: { page, pageSize, search, userId, status, startDate, endDate },
    });

    return c.json({
      conversations: filteredConversations.map((c) => ({
        id: c.id,
        userId: c.user_id,
        organizationId: c.organization_id,
        title: c.title,
        isArchived: c.is_archived,
        messageCount: Number(c.message_count) || 0,
        status: c.run_status || "success",
        service: c.service,
        capability: c.capability,
        langsmithRunId: c.langsmith_run_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        lastMessageAt: c.last_message_at,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[Admin/Conversations] Error listing conversations:", error);
    return c.json({ error: "Failed to list conversations" }, 500);
  }
});

/**
 * GET /admin/conversations/:threadId - Get a specific conversation with all messages
 */
conversations.get("/:threadId", async (c) => {
  const adminUser = c.get("user");
  const threadId = c.req.param("threadId");

  try {
    // Get the session
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, threadId))
      .limit(1);

    if (session.length === 0) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    // Get all messages for this session
    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, threadId))
      .orderBy(messages.createdAt);

    // Get run summaries for this session
    const runs = await db
      .select()
      .from(runSummaries)
      .where(eq(runSummaries.sessionId, threadId))
      .orderBy(desc(runSummaries.createdAt));

    // Log admin access - this is sensitive data access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "view_conversation",
      targetUserId: session[0].userId,
      targetResourceId: threadId,
      metadata: {
        messageCount: sessionMessages.length,
        runCount: runs.length,
      },
    });

    return c.json({
      session: {
        id: session[0].id,
        userId: session[0].userId,
        organizationId: session[0].organizationId,
        title: session[0].title,
        isArchived: session[0].isArchived,
        createdAt: session[0].createdAt,
        updatedAt: session[0].updatedAt,
      },
      messages: sessionMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agentName: m.agentName,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      runs: runs.map((r) => ({
        id: r.id,
        model: r.model,
        service: r.service,
        capability: r.capability,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        totalTokens: r.totalTokens,
        toolCalls: r.toolCalls,
        latencyMs: r.latencyMs,
        status: r.status,
        errorMessage: r.errorMessage,
        langsmithRunId: r.langsmithRunId,
        totalCost: r.totalCost,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[Admin/Conversations] Error fetching conversation:", error);
    return c.json({ error: "Failed to fetch conversation" }, 500);
  }
});

/**
 * GET /admin/conversations/stats - Get conversation statistics
 */
conversations.get("/stats/overview", async (c) => {
  const adminUser = c.get("user");

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Get counts - use array access to handle potential empty results
    const todayResult = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(gte(chatSessions.createdAt, todayStart));
    const todayCount = todayResult[0];

    const weekResult = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(gte(chatSessions.createdAt, weekStart));
    const weekCount = weekResult[0];

    const monthResult = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(gte(chatSessions.createdAt, monthStart));
    const monthCount = monthResult[0];

    const totalResult = await db
      .select({ count: count() })
      .from(chatSessions);
    const totalCount = totalResult[0];

    // Get error rate (from run_summaries)
    const errorStatsResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'error') as error_count,
        COUNT(*) as total_count
      FROM run_summaries
      WHERE created_at >= ${monthStart}
    `);

    const errorRate = (errorStatsResult.rows?.[0] ?? { error_count: "0", total_count: "0" }) as { error_count: string; total_count: string };

    // Log admin access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "view_conversation_stats",
      metadata: {},
    });

    return c.json({
      today: Number(todayCount?.count) || 0,
      week: Number(weekCount?.count) || 0,
      month: Number(monthCount?.count) || 0,
      total: Number(totalCount?.count) || 0,
      errorRate: errorRate.total_count !== "0"
        ? (Number(errorRate.error_count) / Number(errorRate.total_count) * 100).toFixed(2)
        : "0.00",
    });
  } catch (error) {
    console.error("[Admin/Conversations] Error fetching stats:", error);
    return c.json({ error: "Failed to fetch conversation stats" }, 500);
  }
});

export default conversations;
