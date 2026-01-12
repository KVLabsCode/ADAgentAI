/**
 * Smoke tests for ADAgentAI
 *
 * Basic tests to verify critical paths work:
 * - App loads successfully
 * - Authentication is working
 * - Chat page is accessible
 */

import { test, expect } from './fixtures';

test.describe('Smoke Tests', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Verify page title or main heading
    await expect(page).toHaveTitle(/ADAgent|AI/i);
  });

  test('should navigate to chat page when authenticated', async ({ page }) => {
    await page.goto('/chat');

    // Should stay on chat page (not redirect to login)
    await expect(page).toHaveURL(/\/chat/);

    // Chat interface should be visible
    const chatContainer = page.locator('[data-testid="chat-container"]').or(
      page.locator('[class*="chat"]')
    );
    await expect(chatContainer.first()).toBeVisible();
  });

  test('should show chat input field', async ({ page }) => {
    await page.goto('/chat');

    // Find chat input
    const chatInput = page.getByPlaceholder(/message|type|ask/i).or(
      page.locator('[data-testid="chat-input"]')
    );

    await expect(chatInput.first()).toBeVisible();
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/chat');

    // Check for sidebar or navigation
    const nav = page.locator('nav').or(
      page.locator('[data-testid="sidebar"]')
    );

    await expect(nav.first()).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('should access settings page', async ({ page }) => {
    await page.goto('/settings');

    // Verify settings page loads
    const settingsHeading = page.getByRole('heading', { name: /settings/i }).or(
      page.locator('h1:has-text("Settings")')
    );

    await expect(settingsHeading.first()).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display mobile layout correctly', async ({ page }) => {
    await page.goto('/chat');

    // Chat should still be visible on mobile
    const chatContainer = page.locator('[data-testid="chat-container"]').or(
      page.locator('[class*="chat"]')
    );
    await expect(chatContainer.first()).toBeVisible();
  });
});
