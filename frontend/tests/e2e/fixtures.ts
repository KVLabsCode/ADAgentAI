/**
 * Playwright test fixtures for ADAgentAI
 *
 * Provides authenticated page fixture and common test utilities.
 */

import { test as base, expect, type Page } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend<{
  /** Page with authentication already set up */
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Storage state is already loaded via config, just use the page
    await use(page);
  },
});

export { expect };

/**
 * Test helper: Wait for the chat to be ready
 */
export async function waitForChatReady(page: Page): Promise<void> {
  // Wait for chat container to be visible (with fallback selectors)
  const chatContainer = page.locator('[data-testid="chat-container"]')
    .or(page.locator('[class*="chat-container"]'))
    .or(page.locator('[class*="ChatContainer"]'))
    .or(page.locator('main').filter({ has: page.locator('textarea') }));

  await chatContainer.first().waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // Wait for any loading indicators to disappear
  await page.waitForSelector('[data-testid="chat-loading"]', {
    state: 'hidden',
    timeout: 10000,
  }).catch(() => {
    // Loading indicator may not exist, that's ok
  });
}

/**
 * Test helper: Send a message in the chat
 */
export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.getByPlaceholder(/message|type/i).or(
    page.locator('[data-testid="chat-input"]')
  );
  await input.fill(message);
  await input.press('Enter');
}

/**
 * Test helper: Wait for AI response to appear
 */
export async function waitForAIResponse(page: Page, timeout = 30000): Promise<void> {
  // Wait for streaming to start (assistant message appears)
  const assistantMessage = page.locator('[data-testid="assistant-message"]')
    .or(page.locator('[class*="assistant"]'))
    .or(page.locator('[data-role="assistant"]'));

  await assistantMessage.first().waitFor({
    state: 'visible',
    timeout,
  });

  // Wait for streaming to complete (no more loading/typing indicator)
  await page.waitForSelector('[data-testid="streaming-indicator"]', {
    state: 'hidden',
    timeout,
  }).catch(() => {
    // Streaming indicator may not exist after completion
  });

  // Also wait for any typing indicators
  await page.locator('[class*="typing"]').first().waitFor({
    state: 'hidden',
    timeout: 5000,
  }).catch(() => {
    // Typing indicator may not exist
  });
}

/**
 * Test helper: Wait for tool approval dialog to appear
 */
export async function waitForToolApproval(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="tool-approval-dialog"]', {
    state: 'visible',
    timeout: 15000,
  });
}

/**
 * Test helper: Click approve button in tool approval dialog
 */
export async function approveToolExecution(page: Page): Promise<void> {
  await page.click('[data-testid="tool-approval-approve"]');
  await page.waitForSelector('[data-testid="tool-approval-dialog"]', {
    state: 'hidden',
    timeout: 5000,
  });
}

/**
 * Test helper: Click deny button in tool approval dialog
 */
export async function denyToolExecution(page: Page): Promise<void> {
  await page.click('[data-testid="tool-approval-deny"]');
  await page.waitForSelector('[data-testid="tool-approval-dialog"]', {
    state: 'hidden',
    timeout: 5000,
  });
}

/**
 * Test helper: Navigate to chat and wait for ready state
 */
export async function navigateToChat(page: Page): Promise<void> {
  await page.goto('/chat');

  // Wait for navigation to settle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // Network may not fully idle, that's ok
  });

  // Check if we got redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
    throw new Error(`Redirected to login page - authentication may not be working. URL: ${currentUrl}`);
  }

  // Check for waitlist or ToS pages
  if (currentUrl.includes('/waitlist')) {
    throw new Error(`Redirected to waitlist page. URL: ${currentUrl}`);
  }

  await waitForChatReady(page);
}

/**
 * Test helper: Navigate to settings
 */
export async function navigateToSettings(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.waitForSelector('h1:has-text("Settings")', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * Test helper: Open context settings dialog
 */
export async function openContextSettings(page: Page): Promise<void> {
  await page.click('[data-testid="context-settings-trigger"]');
  await page.waitForSelector('[data-testid="context-settings-dialog"]', {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * Test helper: Check if a tool approval dialog is visible
 */
export async function isToolApprovalVisible(page: Page): Promise<boolean> {
  const approvalBadge = page.locator('text=Approval').or(
    page.locator('text=Pending')
  );
  const count = await approvalBadge.count();
  return count > 0;
}

/**
 * Test helper: Wait for tool approval to appear and return the approval element
 */
export async function waitForToolApprovalDialog(page: Page, timeout = 30000): Promise<void> {
  await page.waitForSelector('text=Approval', {
    state: 'visible',
    timeout,
  }).catch(() => {
    // May also show as Pending
    return page.waitForSelector('text=Pending', {
      state: 'visible',
      timeout: 5000,
    });
  });
}

/**
 * Test helper: Click the Allow button in tool approval
 */
export async function clickAllowButton(page: Page): Promise<void> {
  const allowButton = page.getByRole('button', { name: /allow/i }).first();
  await allowButton.click();
}

/**
 * Test helper: Click the Deny button in tool approval
 */
export async function clickDenyButton(page: Page): Promise<void> {
  const denyButton = page.getByRole('button', { name: /deny/i }).first();
  await denyButton.click();
}

/**
 * Test helper: Wait for tool to be allowed (badge shows "Allowed")
 */
export async function waitForToolAllowed(page: Page, timeout = 15000): Promise<void> {
  await page.waitForSelector('text=Allowed', {
    state: 'visible',
    timeout,
  });
}

/**
 * Test helper: Wait for tool to be denied (badge shows "Denied")
 */
export async function waitForToolDenied(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('text=Denied', {
    state: 'visible',
    timeout,
  });
}
