import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use Node environment for API tests
    environment: "node",

    // Global test timeout
    testTimeout: 10000,

    // Include test files
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],

    // Exclude patterns
    exclude: ["node_modules", "dist"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/*.e2e.ts", // E2E tests
        "src/e2e/**", // E2E test directory
        "src/db/schema.ts", // Schema definitions
        "src/db/seed.ts", // Seed script
        "src/index.ts", // Entry point
        "src/env.ts", // Environment config
        "src/lib/sentry.ts", // Sentry config
      ],
      // TODO: Re-enable thresholds as more tests are added
      // thresholds: {
      //   lines: 50,
      //   functions: 50,
      //   branches: 50,
      //   statements: 50,
      // },
    },

    // Setup files to run before tests
    setupFiles: ["./src/test/setup.ts"],

    // Reporter options
    reporters: ["verbose"],
  },
});
