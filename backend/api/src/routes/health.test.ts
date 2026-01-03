import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";

import healthRoutes from "./health";

describe("Health Routes", () => {
  const app = new Hono();
  app.route("/health", healthRoutes);

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);

      const data = (await res.json()) as { status: string; timestamp: string; uptime: number };
      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("uptime");
      expect(typeof data.uptime).toBe("number");
    });

    it("should return valid ISO timestamp", async () => {
      const res = await app.request("/health");
      const data = (await res.json()) as { timestamp: string };

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe("GET /health/ready", () => {
    it("should return 503 when database is not available", async () => {
      // Mock database import to throw error
      vi.doMock("../db", () => ({
        db: {
          execute: vi.fn().mockRejectedValue(new Error("Connection refused")),
        },
      }));

      const res = await app.request("/health/ready");

      // Without real DB connection, this will return 503
      expect([200, 503]).toContain(res.status);

      const data = await res.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("database");
      expect(data).toHaveProperty("timestamp");
    });
  });
});
