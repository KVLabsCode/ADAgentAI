import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, sql, and, gte, lte, desc, count, sum } from "drizzle-orm";
import { db } from "../../db";
import { runSummaries, adminAuditLog } from "../../db/schema";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const usage = new Hono();

// All usage routes require authentication and admin role
usage.use("*", requireAuth);
usage.use("*", requireAdmin);

// Query params schema
const usageQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
});

/**
 * GET /admin/usage - Get usage metrics
 */
usage.get("/", zValidator("query", usageQuerySchema), async (c) => {
  const adminUser = c.get("user");
  const { startDate, endDate, userId, organizationId } = c.req.valid("query");

  try {
    // Build date filters
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Build base conditions
    const baseConditions: ReturnType<typeof eq>[] = [];
    if (userId) {
      baseConditions.push(eq(runSummaries.userId, userId));
    }
    if (organizationId) {
      baseConditions.push(eq(runSummaries.organizationId, organizationId));
    }

    // Helper to add date condition
    const addDateCondition = (start: Date, end?: Date) => {
      const conditions = [...baseConditions, gte(runSummaries.createdAt, start)];
      if (end) {
        conditions.push(lte(runSummaries.createdAt, end));
      }
      return conditions.length === 1 ? conditions[0] : and(...conditions);
    };

    // Get today's metrics
    const todayMetrics = await db
      .select({
        inputTokens: sum(runSummaries.inputTokens),
        outputTokens: sum(runSummaries.outputTokens),
        totalTokens: sum(runSummaries.totalTokens),
        runCount: count(),
        totalCost: sum(runSummaries.totalCost),
      })
      .from(runSummaries)
      .where(addDateCondition(todayStart));

    // Get week's metrics
    const weekMetrics = await db
      .select({
        inputTokens: sum(runSummaries.inputTokens),
        outputTokens: sum(runSummaries.outputTokens),
        totalTokens: sum(runSummaries.totalTokens),
        runCount: count(),
        totalCost: sum(runSummaries.totalCost),
      })
      .from(runSummaries)
      .where(addDateCondition(weekStart));

    // Get month's metrics
    const monthMetrics = await db
      .select({
        inputTokens: sum(runSummaries.inputTokens),
        outputTokens: sum(runSummaries.outputTokens),
        totalTokens: sum(runSummaries.totalTokens),
        runCount: count(),
        totalCost: sum(runSummaries.totalCost),
      })
      .from(runSummaries)
      .where(addDateCondition(monthStart));

    // Get usage by model
    const byModel = await db
      .select({
        model: runSummaries.model,
        inputTokens: sum(runSummaries.inputTokens),
        outputTokens: sum(runSummaries.outputTokens),
        totalTokens: sum(runSummaries.totalTokens),
        runCount: count(),
        totalCost: sum(runSummaries.totalCost),
      })
      .from(runSummaries)
      .where(addDateCondition(monthStart))
      .groupBy(runSummaries.model);

    // Get timeline data (last 30 days, grouped by day)
    const timeline = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as run_count,
        SUM(total_cost) as total_cost
      FROM run_summaries
      WHERE created_at >= ${monthStart}
      ${userId ? sql`AND user_id = ${userId}` : sql``}
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get top users by usage (last 30 days)
    const topUsers = await db.execute(sql`
      SELECT
        user_id,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        COUNT(*) as run_count
      FROM run_summaries
      WHERE created_at >= ${monthStart}
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      GROUP BY user_id
      ORDER BY total_tokens DESC
      LIMIT 10
    `);

    // Get usage by service/capability
    const byService = await db
      .select({
        service: runSummaries.service,
        capability: runSummaries.capability,
        totalTokens: sum(runSummaries.totalTokens),
        runCount: count(),
      })
      .from(runSummaries)
      .where(addDateCondition(monthStart))
      .groupBy(runSummaries.service, runSummaries.capability);

    // Log admin access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "view_usage_metrics",
      metadata: { userId, organizationId, startDate, endDate },
    });

    // Format response
    const formatMetrics = (m: typeof todayMetrics[0]) => ({
      inputTokens: Number(m.inputTokens) || 0,
      outputTokens: Number(m.outputTokens) || 0,
      totalTokens: Number(m.totalTokens) || 0,
      runCount: Number(m.runCount) || 0,
      cost: Number(m.totalCost) || 0,
    });

    return c.json({
      today: formatMetrics(todayMetrics[0]),
      week: formatMetrics(weekMetrics[0]),
      month: formatMetrics(monthMetrics[0]),
      byModel: byModel.map((m) => ({
        model: m.model || "unknown",
        inputTokens: Number(m.inputTokens) || 0,
        outputTokens: Number(m.outputTokens) || 0,
        totalTokens: Number(m.totalTokens) || 0,
        runCount: Number(m.runCount) || 0,
        cost: Number(m.totalCost) || 0,
      })),
      timeline: timeline.rows.map((row: Record<string, unknown>) => ({
        date: row.date,
        inputTokens: Number(row.input_tokens) || 0,
        outputTokens: Number(row.output_tokens) || 0,
        totalTokens: Number(row.total_tokens) || 0,
        runCount: Number(row.run_count) || 0,
        cost: Number(row.total_cost) || 0,
      })),
      topUsers: topUsers.rows.map((row: Record<string, unknown>) => ({
        userId: row.user_id,
        totalTokens: Number(row.total_tokens) || 0,
        cost: Number(row.total_cost) || 0,
        runCount: Number(row.run_count) || 0,
      })),
      byService: byService.map((s) => ({
        service: s.service || "general",
        capability: s.capability || "general",
        totalTokens: Number(s.totalTokens) || 0,
        runCount: Number(s.runCount) || 0,
      })),
    });
  } catch (error) {
    console.error("[Admin/Usage] Error fetching usage metrics:", error);
    return c.json({ error: "Failed to fetch usage metrics" }, 500);
  }
});

/**
 * GET /admin/usage/export - Export usage data as CSV
 */
usage.get("/export", zValidator("query", usageQuerySchema), async (c) => {
  const adminUser = c.get("user");
  const { startDate, endDate, userId, organizationId } = c.req.valid("query");

  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const conditions = [
      gte(runSummaries.createdAt, start),
      lte(runSummaries.createdAt, end),
    ];
    if (userId) conditions.push(eq(runSummaries.userId, userId));
    if (organizationId) conditions.push(eq(runSummaries.organizationId, organizationId));

    const data = await db
      .select()
      .from(runSummaries)
      .where(and(...conditions))
      .orderBy(desc(runSummaries.createdAt))
      .limit(10000); // Cap at 10k rows

    // Build CSV
    const headers = [
      "id",
      "user_id",
      "organization_id",
      "session_id",
      "model",
      "service",
      "capability",
      "input_tokens",
      "output_tokens",
      "total_tokens",
      "tool_calls",
      "latency_ms",
      "status",
      "total_cost",
      "created_at",
    ];

    const rows = data.map((row) =>
      [
        row.id,
        row.userId,
        row.organizationId || "",
        row.sessionId || "",
        row.model || "",
        row.service || "",
        row.capability || "",
        row.inputTokens,
        row.outputTokens,
        row.totalTokens,
        row.toolCalls,
        row.latencyMs || "",
        row.status,
        row.totalCost || "",
        row.createdAt.toISOString(),
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    // Log admin access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "export_usage_data",
      metadata: { userId, organizationId, startDate, endDate, rowCount: data.length },
    });

    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", `attachment; filename="usage-export-${new Date().toISOString().split("T")[0]}.csv"`);

    return c.text(csv);
  } catch (error) {
    console.error("[Admin/Usage] Error exporting usage data:", error);
    return c.json({ error: "Failed to export usage data" }, 500);
  }
});

export default usage;
