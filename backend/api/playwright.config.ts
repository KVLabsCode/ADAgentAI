import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    // Base URL for API requests
    baseURL: process.env.API_URL || "http://localhost:3001",
    trace: "on-first-retry",
  },

  // Start the API server before running tests
  webServer: {
    command: "bun run start",
    url: "http://localhost:3001/health",
    timeout: 30 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "api",
      testMatch: "**/*.e2e.ts",
    },
  ],
});
