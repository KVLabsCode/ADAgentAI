/**
 * Global teardown for Playwright tests
 *
 * This runs once after all tests complete.
 * Used for cleanup of test artifacts and resources.
 */

import { type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalTeardown(_config: FullConfig) {
  // Clean up authentication state file in CI
  if (process.env.CI) {
    try {
      if (fs.existsSync(AUTH_FILE)) {
        fs.unlinkSync(AUTH_FILE);
        console.log('🧹 Cleaned up authentication state');
      }
    } catch (error) {
      console.warn('⚠️  Failed to clean up auth state:', error);
    }
  }

  // Log test completion
  console.log('✅ Playwright tests completed');
}

export default globalTeardown;
