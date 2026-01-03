/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll, vi } from "vitest";

// Mock environment variables for tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.BETTER_AUTH_SECRET = "test-secret-key-for-testing-only";
  process.env.BETTER_AUTH_URL = "http://localhost:3001";
  process.env.FRONTEND_URL = "http://localhost:3000";
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Suppress console output during tests (optional)
// vi.spyOn(console, "log").mockImplementation(() => {});
// vi.spyOn(console, "error").mockImplementation(() => {});
