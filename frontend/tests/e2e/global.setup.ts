/**
 * Global setup for Playwright tests
 *
 * Creates authentication state by calling the test-auth endpoint.
 * The authenticated state is saved to .auth/user.json and reused by all tests.
 */

import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('[e2e-setup] Creating test session via API...');

  try {
    // Call the test-auth endpoint to create a session
    const response = await fetch(`${apiUrl}/api/test-auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create test session: ${response.status} ${text}`);
    }

    const { token, user } = await response.json();
    console.log(`[e2e-setup] Test session created for: ${user.email}`);

    // Launch browser to set up auth state
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app to set cookies/localStorage in the correct domain
    await page.goto(baseURL || 'http://localhost:3000');

    // Set the session token in localStorage (Neon Auth stores it here)
    await page.evaluate((data) => {
      // Neon Auth session storage format
      localStorage.setItem('neon-auth.session_token', data.token);

      // E2E test mode - store test user info for frontend to use
      // This allows the frontend to bypass Neon Auth SDK validation in tests
      localStorage.setItem('e2e-test-mode', 'true');
      localStorage.setItem('e2e-test-user', JSON.stringify(data.user));
    }, { token, user });

    // Also set as a cookie for backend API calls
    await context.addCookies([
      {
        name: 'neon-auth.session_token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Save authentication state
    await context.storageState({ path: AUTH_FILE });
    console.log('[e2e-setup] Authentication state saved');

    await browser.close();
  } catch (error) {
    console.error('[e2e-setup] Failed to create test session:', error);

    // Create a minimal auth state file so tests can at least run
    // (they may fail due to auth issues, but won't crash on missing file)
    const fallbackAuthState = {
      cookies: [],
      origins: [
        {
          origin: baseURL || 'http://localhost:3000',
          localStorage: [],
        },
      ],
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(fallbackAuthState, null, 2));
    console.log('[e2e-setup] Created fallback auth state (tests may fail)');
  }
}

export default globalSetup;
