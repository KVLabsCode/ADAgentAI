import { Hono } from "hono";
import { eq, sql, count } from "drizzle-orm";
import { db } from "../../db";
import { connectedProviders, waitlist } from "../../db/schema";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const stats = new Hono();

// All stats routes require authentication and admin role
stats.use("*", requireAuth);
stats.use("*", requireAdmin);

/**
 * GET /admin/stats - Get admin dashboard stats
 * Returns user counts, provider counts, waitlist counts, and model usage
 */
stats.get("/", async (c) => {
  try {
    // Get total unique users (using raw SQL for COUNT DISTINCT)
    const totalUsersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count FROM chat_sessions
    `);
    const totalUsers = Number((totalUsersResult.rows[0] as { count: string })?.count) || 0;

    // Get active users this week (using SQL interval for reliable date comparison)
    const activeWeekResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    const activeThisWeek = Number((activeWeekResult.rows[0] as { count: string })?.count) || 0;

    // Get active users last week (for comparison)
    const activeLastWeekResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
    `);
    const activeLastWeek = Number((activeLastWeekResult.rows[0] as { count: string })?.count) || 0;

    const weeklyChange = activeLastWeek > 0
      ? Math.round(((activeThisWeek - activeLastWeek) / activeLastWeek) * 100)
      : (activeThisWeek > 0 ? 100 : 0);

    // Get waitlist stats
    const waitlistPendingResult = await db
      .select({ count: count() })
      .from(waitlist)
      .where(eq(waitlist.status, "pending"));
    const waitlistPending = Number(waitlistPendingResult[0]?.count) || 0;

    // Get connected providers count
    const providersResult = await db
      .select({ count: count() })
      .from(connectedProviders);
    const connectedProvidersCount = Number(providersResult[0]?.count) || 0;

    // Get conversations today (using SQL for reliable date comparison)
    const conversationsTodayResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM chat_sessions
      WHERE created_at >= CURRENT_DATE
    `);
    const conversationsToday = Number((conversationsTodayResult.rows[0] as { count: string })?.count) || 0;

    // Get token usage this month with cost
    const tokenUsageResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM run_summaries
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const tokenRow = tokenUsageResult.rows[0] as { total_tokens: string; total_cost: string };
    const totalTokens = Number(tokenRow?.total_tokens) || 0;
    const totalCost = Number(tokenRow?.total_cost) || 0;

    // Get model usage breakdown (last 30 days)
    const modelUsageResult = await db.execute(sql`
      SELECT
        model,
        COUNT(*) as run_count,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM run_summaries
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY model
      ORDER BY total_tokens DESC
    `);

    // Get daily activity (last 14 days for sparkline)
    const dailyActivityResult = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as conversations
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Format model usage
    const modelUsage = (modelUsageResult.rows as Array<{
      model: string;
      run_count: string;
      total_tokens: string;
      total_cost: string;
    }>).map(m => ({
      model: m.model || "unknown",
      runCount: Number(m.run_count) || 0,
      totalTokens: Number(m.total_tokens) || 0,
      totalCost: Number(m.total_cost) || 0,
      percentage: totalTokens > 0
        ? Math.round((Number(m.total_tokens) / totalTokens) * 100)
        : 0,
    }));

    // Format daily activity for sparklines
    const dailyActivity = (dailyActivityResult.rows as Array<{
      date: string;
      active_users: string;
      conversations: string;
    }>).map(row => ({
      date: row.date,
      activeUsers: Number(row.active_users) || 0,
      conversations: Number(row.conversations) || 0,
    }));

    return c.json({
      users: {
        total: totalUsers,
        activeThisWeek,
        weeklyChange: weeklyChange > 0 ? `+${weeklyChange}%` : `${weeklyChange}%`,
      },
      waitlist: {
        pending: waitlistPending,
      },
      providers: {
        total: connectedProvidersCount,
      },
      conversations: {
        today: conversationsToday,
      },
      tokens: {
        monthTotal: totalTokens,
        monthCost: totalCost,
        formatted: formatTokens(totalTokens),
        costFormatted: `$${totalCost.toFixed(2)}`,
      },
      modelUsage,
      dailyActivity,
    });
  } catch (error) {
    console.error("[Admin/Stats] Error fetching stats:", error);
    return c.json({ error: "Failed to fetch stats", details: String(error) }, 500);
  }
});

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export default stats;
