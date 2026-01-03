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
        "src/db/schema.ts", // Schema definitions
        "src/index.ts", // Entry point
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },

    // Setup files to run before tests
    setupFiles: ["./src/test/setup.ts"],

    // Reporter options
    reporters: ["verbose"],
  },
});
