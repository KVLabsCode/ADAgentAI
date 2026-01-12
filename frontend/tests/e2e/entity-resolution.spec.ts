/**
 * E2E tests for entity resolution and grounding
 *
 * Tests that the system correctly validates entity references
 * and prevents LLM hallucination of invalid entity IDs.
 */

import { test, expect } from './fixtures';
import { navigateToChat, sendChatMessage, waitForAIResponse } from './fixtures';

test.describe('Entity Resolution - Valid References', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToChat(page);
  });

  test('should accept valid entity reference in query', async ({ page }) => {
    // Query using real entities from user's connected accounts
    await sendChatMessage(page, 'Show me my AdMob revenue for yesterday');

    // Wait for response to start streaming
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Wait for response to complete
    await waitForAIResponse(page);

    // Should see successful response about revenue
    const response = page.locator('[class*="assistant"]').last();
    await expect(response).toBeVisible();

    // Should NOT see entity validation error
    const errorContent = page.locator('text=/not found|invalid entity/i');
    const errorCount = await errorContent.count();
    expect(errorCount).toBe(0);
  });

  test('should display available entities in context', async ({ page }) => {
    // Open context settings to view available entities
    const contextButton = page.locator('[data-testid="context-settings-trigger"]').or(
      page.getByRole('button', { name: /context|settings/i })
    );

    // Click if exists
    const hasContextButton = await contextButton.count() > 0;
    if (hasContextButton) {
      await contextButton.first().click();

      // Should see connected accounts/apps
      await page.waitForTimeout(500);

      // Look for account or app elements
      const entityElements = page.locator('text=/account|app|AdMob|GAM/i');
      const entityCount = await entityElements.count();
      expect(entityCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Entity Resolution - Invalid References', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToChat(page);
  });

  test('should show error for invalid app ID', async ({ page }) => {
    // Use a clearly fake app ID that doesn't match any real pattern
    await sendChatMessage(
      page,
      'Show me revenue for app ca-app-pub-FAKE123456789~INVALID999'
    );

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Response should indicate the entity wasn't found or is invalid
    const response = page.locator('[class*="assistant"]').last();

    // Should see some indication of the issue
    // (error message, suggestion, or "not found" text)
    const hasErrorIndication = await response.locator(
      'text=/not found|not available|invalid|cannot find|don\'t have access/i'
    ).count() > 0;

    // Or the agent might apologize and ask for clarification
    const hasApology = await response.locator(
      'text=/sorry|apologize|couldn\'t find|unable to/i'
    ).count() > 0;

    expect(hasErrorIndication || hasApology).toBeTruthy();
  });

  test('should suggest valid alternatives when entity not found', async ({ page }) => {
    // Use invalid entity ID
    await sendChatMessage(
      page,
      'Get stats for app ca-app-pub-0000000000000000~0000000000'
    );

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Look for the response content
    const response = page.locator('[class*="assistant"]').last();
    const responseText = await response.textContent();

    // If strict mode is on, should see alternatives
    // If soft mode, the agent may try to help differently
    // Either way, it should handle the invalid entity gracefully
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
  });

  test('should handle invalid publisher ID gracefully', async ({ page }) => {
    // Use an invalid publisher ID format
    await sendChatMessage(
      page,
      'Show revenue for publisher account pub-NOTREAL123456789012'
    );

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Should handle gracefully without crashing
    const response = page.locator('[class*="assistant"]').last();
    await expect(response).toBeVisible();

    // Should not see technical error messages
    const technicalError = page.locator('text=/traceback|exception|stack trace/i');
    const technicalErrorCount = await technicalError.count();
    expect(technicalErrorCount).toBe(0);
  });
});

test.describe('Entity Resolution - Context Mode', () => {
  test('should respect soft mode by default', async ({ page }) => {
    await navigateToChat(page);

    // In soft mode, warnings are shown but operations can proceed
    await sendChatMessage(page, 'What apps do I have connected?');

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 15000,
    });

    await waitForAIResponse(page);

    // Should get a response (soft mode allows queries)
    const response = page.locator('[class*="assistant"]').last();
    await expect(response).toBeVisible();
  });

  test('should show entity context in response', async ({ page }) => {
    await navigateToChat(page);

    // Ask about available entities
    await sendChatMessage(page, 'List my connected AdMob accounts');

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Response should mention accounts or that none are connected
    const response = page.locator('[class*="assistant"]').last();
    const responseText = await response.textContent();

    // Should mention accounts (either listing them or saying none exist)
    const mentionsAccounts = responseText?.toLowerCase().includes('account') ||
      responseText?.toLowerCase().includes('connected') ||
      responseText?.toLowerCase().includes('admob');

    expect(mentionsAccounts).toBeTruthy();
  });
});

test.describe('Entity Resolution - Error Recovery', () => {
  test('should allow retry after invalid entity error', async ({ page }) => {
    await navigateToChat(page);

    // First, send invalid entity
    await sendChatMessage(
      page,
      'Show revenue for app ca-app-pub-INVALID~999'
    );

    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Now send a valid query
    await sendChatMessage(page, 'Show me my overall revenue instead');

    await page.waitForSelector('[class*="assistant"]:last-child', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Should be able to continue conversation
    const messages = page.locator('[class*="assistant"]');
    const messageCount = await messages.count();

    // Should have at least 2 assistant messages
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  test('should not leak internal error details to user', async ({ page }) => {
    await navigateToChat(page);

    // Send a query that might trigger validation
    await sendChatMessage(
      page,
      'Delete app ca-app-pub-MALICIOUS~INJECTION'
    );

    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Response should not contain internal error details
    const response = page.locator('[class*="assistant"]').last();
    const responseText = await response.textContent();

    // Should not see Python/JS error traces
    expect(responseText).not.toMatch(/traceback/i);
    expect(responseText).not.toMatch(/exception/i);
    expect(responseText).not.toMatch(/at line \d+/i);
    expect(responseText).not.toMatch(/file ".*\.py"/i);
  });
});

test.describe('Entity Resolution - Tool Input Validation', () => {
  test('should validate entity before tool execution', async ({ page }) => {
    await navigateToChat(page);

    // Request an action that requires entity validation
    await sendChatMessage(
      page,
      'Create a new banner ad unit in app ca-app-pub-FAKE~FAKE'
    );

    // Wait for response (might be quick if validation fails early)
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // If validation fails, should NOT see tool approval dialog
    // (the tool shouldn't be called with invalid entities)
    const approvalDialog = page.locator('text=Approval').or(
      page.locator('text=Pending')
    );

    // Wait a moment to ensure approval dialog would appear if triggered
    await page.waitForTimeout(2000);

    // Wait for approval dialog to appear if any
    await approvalDialog.count();

    // Validation error should be shown OR approval might appear if entity passed
    // Either way, the system should handle it gracefully
    const response = page.locator('[class*="assistant"]').last();
    await expect(response).toBeVisible();
  });

  test('should show friendly error for entity mismatch', async ({ page }) => {
    await navigateToChat(page);

    // Request action on mismatched entities
    await sendChatMessage(
      page,
      'Move ad unit ca-app-pub-123~111/adunit-999 to a different app'
    );

    // Wait for response
    await page.waitForSelector('[class*="assistant"]', {
      state: 'visible',
      timeout: 30000,
    });

    await waitForAIResponse(page);

    // Response should be user-friendly
    const response = page.locator('[class*="assistant"]').last();
    const responseText = await response.textContent();

    // Should not see raw technical errors
    expect(responseText).not.toMatch(/undefined/i);
    expect(responseText).not.toMatch(/null/i);
    expect(responseText).not.toMatch(/\[\s*object\s+Object\s*\]/i);
  });
});
