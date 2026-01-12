/**
 * Global setup for Playwright tests
 *
 * This runs once before all tests to set up authentication state.
 * The authenticated state is saved to .auth/user.json and reused by all tests.
 */

import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if we have test credentials
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('⚠️  No test credentials provided. Using mock authentication state.');
    console.log('   Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD for real auth.');

    // Create mock auth state for development
    const mockAuthState = {
      cookies: [],
      origins: [
        {
          origin: baseURL || 'http://localhost:3000',
          localStorage: [
            {
              name: 'neon-auth-token',
              value: JSON.stringify({
                accessToken: 'mock-access-token-for-testing',
                refreshToken: 'mock-refresh-token-for-testing',
                expiresAt: Date.now() + 3600000, // 1 hour from now
              }),
            },
          ],
        },
      ],
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(mockAuthState, null, 2));
    return;
  }

  // Perform actual authentication
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 10000,
    });

    // Fill login credentials
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to authenticated area (chat or dashboard)
    await page.waitForURL(/\/(chat|dashboard)/, {
      timeout: 30000,
    });

    // Save authentication state
    await page.context().storageState({ path: AUTH_FILE });
    console.log('✅ Authentication state saved');
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
