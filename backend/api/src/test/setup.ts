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
  process.env.NEON_AUTH_URL = "https://test.neonauth.test/neondb/auth";
  process.env.TOKEN_ENCRYPTION_SECRET = "test-secret-key-minimum-32-characters-long";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.BACKEND_URL = "http://localhost:3001";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.PORT = "3001";
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Suppress console output during tests (optional)
// vi.spyOn(console, "log").mockImplementation(() => {});
// vi.spyOn(console, "error").mockImplementation(() => {});
