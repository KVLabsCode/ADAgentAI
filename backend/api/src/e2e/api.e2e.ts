import { test, expect } from "@playwright/test";

test.describe("API E2E Tests", () => {
  test("GET /health returns ok status", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime");
  });

  test("GET /api returns API info", async ({ request }) => {
    const response = await request.get("/api");

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBe("KVLabs API");
    expect(data.version).toBe("0.1.0");
  });

  test("GET /api/chat/sessions without auth returns 401", async ({
    request,
  }) => {
    const response = await request.get("/api/chat/sessions");

    expect(response.status()).toBe(401);
  });

  test("GET /api/billing/subscription without auth returns 401", async ({
    request,
  }) => {
    const response = await request.get("/api/billing/subscription");

    expect(response.status()).toBe(401);
  });

  test("GET /api/providers without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/providers");

    expect(response.status()).toBe(401);
  });
});
