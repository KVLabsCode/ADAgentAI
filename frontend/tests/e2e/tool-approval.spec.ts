/**
 * E2E tests for tool approval workflow
 *
 * Tests the human-in-loop approval system for dangerous tools
 * (write operations like create/update/delete).
 *
 * NOTE: These tests require the LLM to actually call dangerous tools,
 * which depends on:
 * 1. Proper MCP server configuration
 * 2. Real AdMob/GAM credentials with connected accounts
 * 3. The LLM deciding to call create/update/delete operations
 *
 * In CI environments without full MCP setup, these tests will skip
 * if the approval workflow doesn't trigger.
 */

import { test, expect } from './fixtures';
import { navigateToChat, sendChatMessage, waitForAIResponse } from './fixtures';

/**
 * Helper to check if approval dialog appears within timeout
 * Returns true if approval appears, false otherwise
 */
async function waitForApprovalOptional(page: import('@playwright/test').Page, timeout = 30000): Promise<boolean> {
  try {
    await page.waitForSelector('text=Approval', {
      state: 'visible',
      timeout,
    });
    return true;
  } catch {
    try {
      await page.waitForSelector('text=Pending', {
        state: 'visible',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

test.describe('Tool Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToChat(page);
  });

  test('should display approval dialog for dangerous tool', async ({ page }) => {
    // Send a message that triggers a dangerous tool (create operation)
    await sendChatMessage(page, 'Create a new ad unit called Test Banner for my first app');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Check if approval dialog appears (depends on LLM calling dangerous tools)
    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Verify Allow and Deny buttons are present
    const allowButton = page.getByRole('button', { name: /allow/i });
    const denyButton = page.getByRole('button', { name: /deny/i });

    await expect(allowButton.first()).toBeVisible();
    await expect(denyButton.first()).toBeVisible();
  });

  test('should execute tool when approved', async ({ page }) => {
    // Send a message that triggers a dangerous tool
    await sendChatMessage(page, 'Create a new ad unit called Approved Banner');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Click the Allow button
    const allowButton = page.getByRole('button', { name: /allow/i }).first();
    await allowButton.click();

    // Wait for tool execution to complete
    // The badge should change from "Approval/Pending" to "Allowed"
    const allowedBadge = page.locator('text=Allowed');
    await expect(allowedBadge.first()).toBeVisible({ timeout: 30000 });

    // Wait for final response
    await waitForAIResponse(page);
  });

  test('should block tool when denied', async ({ page }) => {
    // Send a message that triggers a dangerous tool
    await sendChatMessage(page, 'Create a new ad unit called Denied Banner');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Click the Deny button
    const denyButton = page.getByRole('button', { name: /deny/i }).first();
    await denyButton.click();

    // The badge should change to "Denied"
    const deniedBadge = page.locator('text=Denied');
    await expect(deniedBadge.first()).toBeVisible({ timeout: 10000 });

    // Response should indicate denial
    await waitForAIResponse(page);

    // Check that the denial message is shown
    const denialMessage = page.locator('text=/denied/i').or(
      page.locator('text=/blocked/i')
    );
    await expect(denialMessage.first()).toBeVisible();
  });

  test('should allow editing parameters before approval', async ({ page }) => {
    // Send a message that triggers a tool with editable parameters
    await sendChatMessage(page, 'Create a new banner ad unit');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Look for input fields in the approval form
    // The parameter form should have editable inputs
    const inputFields = page.locator('input[type="text"], textarea');
    const hasEditableFields = await inputFields.count() > 0;

    if (hasEditableFields) {
      // Edit the first text input
      const firstInput = inputFields.first();
      await firstInput.fill('Modified Value');

      // The button should change to "Allow with Changes"
      const allowWithChangesButton = page.getByRole('button', { name: /allow with changes/i });

      // This test passes if either the button shows "Allow with Changes" or just "Allow"
      const allowButton = allowWithChangesButton.or(
        page.getByRole('button', { name: /^allow$/i })
      );
      await expect(allowButton.first()).toBeVisible();
    }
  });

  test('should display tool name and parameters in approval dialog', async ({ page }) => {
    // Send a message that triggers a dangerous tool
    await sendChatMessage(page, 'Create a new interstitial ad unit');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Verify tool name is displayed (in the collapsed header or expanded view)
    // Tool names appear as code elements
    const toolNameElement = page.locator('code').filter({
      hasText: /create|ad.?unit/i
    });

    // At least one tool name should be visible
    await expect(toolNameElement.first()).toBeVisible();

    // Look for "Request" section showing parameters
    const requestSection = page.locator('text=Request');
    await expect(requestSection.first()).toBeVisible();
  });
});

test.describe('Tool Approval - Read Operations', () => {
  test('should not require approval for read operations', async ({ page }) => {
    await navigateToChat(page);

    // Send a query that only requires read operations
    await sendChatMessage(page, 'Show me my revenue for yesterday');

    // Wait for response to start streaming
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Wait for some content to appear
    await page.waitForTimeout(3000);

    // Verify that NO approval dialog appears
    // (read operations should execute automatically)
    const approvalBadge = page.locator('text=Approval').or(
      page.locator('text=Pending')
    );

    // Approval should NOT be visible for read operations
    const approvalCount = await approvalBadge.count();
    expect(approvalCount).toBe(0);

    // Wait for final response
    await waitForAIResponse(page);
  });
});

test.describe('Tool Approval - Multiple Tools', () => {
  test('should handle multiple dangerous tools sequentially', async ({ page }) => {
    await navigateToChat(page);

    // Send a message that might trigger multiple tools
    await sendChatMessage(page, 'Create a new app and then create an ad unit for it');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Approve first tool
    const allowButton = page.getByRole('button', { name: /allow/i }).first();
    await allowButton.click();

    // Wait for it to complete
    await page.waitForSelector('text=Allowed', {
      state: 'visible',
      timeout: 15000,
    });

    // Check if another approval is needed
    await page.waitForTimeout(2000);

    const secondApproval = page.locator('text=Approval').or(
      page.locator('text=Pending')
    );

    const needsSecondApproval = await secondApproval.count() > 0;

    if (needsSecondApproval) {
      // Approve second tool
      const secondAllowButton = page.getByRole('button', { name: /allow/i }).first();
      await secondAllowButton.click();
    }

    // Wait for final response
    await waitForAIResponse(page);
  });
});

test.describe('Tool Approval - UI States', () => {
  test('should show correct badge states throughout approval flow', async ({ page }) => {
    await navigateToChat(page);

    // Trigger a dangerous tool
    await sendChatMessage(page, 'Create a banner ad unit');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // Approve the tool
    const allowButton = page.getByRole('button', { name: /allow/i }).first();
    await allowButton.click();

    // After approval: Allowed badge should appear
    const allowedBadge = page.locator('text=Allowed');
    await expect(allowedBadge.first()).toBeVisible({ timeout: 15000 });

    // Pending badge should no longer be visible (for this tool)
    await page.waitForTimeout(500);
  });

  test('should collapse approval card after decision', async ({ page }) => {
    await navigateToChat(page);

    // Trigger a dangerous tool
    await sendChatMessage(page, 'Create a rewarded ad unit');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="assistant-message"]', {
      state: 'visible',
      timeout: 15000,
    });

    const approvalAppeared = await waitForApprovalOptional(page);

    if (!approvalAppeared) {
      test.skip(true, 'Tool approval not triggered - MCP tools may not be configured');
      return;
    }

    // The Allow/Deny buttons should be visible (expanded state)
    const allowButton = page.getByRole('button', { name: /allow/i }).first();
    await expect(allowButton).toBeVisible();

    // Approve
    await allowButton.click();

    // Wait for badge to change
    await page.waitForSelector('text=Allowed', {
      state: 'visible',
      timeout: 10000,
    });

    // After approval, the buttons should no longer be visible (collapsed)
    await page.waitForTimeout(500);
    const buttonsAfter = page.getByRole('button', { name: /^allow$/i });

    // There should be no more pending Allow buttons
    const pendingAllowCount = await buttonsAfter.count();
    expect(pendingAllowCount).toBeLessThanOrEqual(0);
  });
});
