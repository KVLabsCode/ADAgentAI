import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

health.get("/ready", async (c) => {
  // Check database connectivity
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

export default health;
