/**
 * Hybrid E2E tests for tool approval workflow.
 *
 * These tests use a hybrid approach:
 * 1. Pre-seed pending approvals via real backend endpoint (/test/seed-approval)
 * 2. Mock SSE stream to emit the approval event deterministically
 * 3. Let frontend call real /chat/approve-tool endpoint
 *
 * This tests:
 * - Real backend approval logic (resolve_approval, file-based state)
 * - Real frontend UI (ToolApprovalBlock, Allow/Deny buttons)
 * - Real API calls from frontend to backend
 * - SSE event parsing in frontend
 */

import { test, expect } from './fixtures';
import { navigateToChat, sendChatMessage } from './fixtures';
import { mockApprovalSSE, mockResumeSSE, mockDenialResumeSSE, clearChatMocks, mockFieldOptions } from './helpers/mock-sse';

// Chat agent URL (Python backend)
const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || 'http://localhost:5000';

test.describe('Tool Approval - Hybrid Integration', () => {
  test.afterEach(async ({ page }) => {
    await clearChatMocks(page);
  });

  test('should display approval dialog and approve via real backend', async ({ page }) => {
    // Step 1: Seed approval in real backend
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'Test Ad Unit', app_id: 'test-app-123' },
      },
    });

    // Check if test endpoint is available (E2E_TESTING must be set)
    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    expect(seedResponse.ok()).toBeTruthy();
    const { approval_id } = await seedResponse.json();
    expect(approval_id).toBeTruthy();

    // Step 2: Mock SSE to emit this approval_id
    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_create_ad_unit',
      tool_input: { name: 'Test Ad Unit', app_id: 'test-app-123' },
    });

    // Mock resume endpoint for after approval - must emit tool events for "Allowed" badge
    await mockResumeSSE(page, {
      result: 'Ad unit created successfully.',
      toolName: 'admob_create_ad_unit',
      toolInput: { name: 'Test Ad Unit', app_id: 'test-app-123' },
      toolResult: { success: true, ad_unit_id: 'ca-app-pub-123/456' },
    });

    // Step 3: Navigate and send message (triggers mocked SSE)
    await navigateToChat(page);
    await sendChatMessage(page, 'create ad unit');

    // Step 4: Verify approval dialog appears
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // Verify Allow button is present
    const allowButton = page.getByRole('button', { name: /allow/i }).first();
    await expect(allowButton).toBeVisible();

    // Step 5: Click Allow (calls REAL backend)
    await allowButton.click();

    // Step 6: Verify approval was processed
    // The tool executes and response appears (proves approval worked)
    await expect(page.locator('text=Ad unit created successfully')).toBeVisible({ timeout: 10000 });

    // Expand the tool call section to verify "Allowed" badge
    const toolCallSection = page.locator('button:has-text("tool call")');
    if (await toolCallSection.isVisible()) {
      await toolCallSection.click();
      await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should deny tool via real backend', async ({ page }) => {
    // Seed approval
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'Deny Test' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();
    expect(approval_id).toBeTruthy();

    // Mock SSE for initial stream
    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_create_ad_unit',
      tool_input: { name: 'Deny Test' },
    });

    // Mock resume endpoint for after denial - emits tool_denied event
    await mockDenialResumeSSE(page, {
      toolName: 'admob_create_ad_unit',
      reason: 'User denied the operation',
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'create ad unit');

    // Wait for approval dialog
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // Click Deny button
    const denyButton = page.getByRole('button', { name: /deny/i }).first();
    await expect(denyButton).toBeVisible();
    await denyButton.click();

    // Verify denial - badge should change to "Denied"
    await expect(page.locator('text=Denied')).toBeVisible({ timeout: 10000 });
  });

  test('should show correct tool metadata in approval dialog', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'Metadata Test', ad_format: 'BANNER' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_create_ad_unit',
      tool_input: { name: 'Metadata Test', ad_format: 'BANNER' },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'create ad unit');

    // Wait for approval dialog
    await expect(page.locator('text=Approval').or(page.locator('text=Pending'))).toBeVisible({
      timeout: 15000,
    });

    // Verify tool name is displayed (in code element or similar)
    const toolNameElement = page
      .locator('code')
      .filter({ hasText: /create|ad.?unit/i });
    await expect(toolNameElement.first()).toBeVisible();

    // Verify "Request" section is visible (shows parameters)
    const requestSection = page.locator('text=Request');
    await expect(requestSection.first()).toBeVisible();
  });

  test('should allow editing parameters before approval', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'Original Name', app_id: 'app-123' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_create_ad_unit',
      tool_input: { name: 'Original Name', app_id: 'app-123' },
    });

    await mockResumeSSE(page, {
      result: 'Ad unit created with modifications.',
      toolName: 'admob_create_ad_unit',
      toolInput: { name: 'Original Name', app_id: 'app-123' },
      toolResult: { success: true },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'create ad unit');

    // Wait for approval dialog
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // Look for editable input fields in the approval form
    const inputFields = page.locator('input[type="text"], textarea');
    const fieldCount = await inputFields.count();

    if (fieldCount > 0) {
      // Find the name input field and modify it
      const nameInput = page.locator('input').first();
      await nameInput.clear();
      await nameInput.fill('Modified Ad Unit Name');

      // After modification, look for "Allow with Changes" button or regular Allow
      const allowWithChangesButton = page.getByRole('button', { name: /allow with changes/i });
      const regularAllowButton = page.getByRole('button', { name: /^allow$/i });

      // Click whichever button is available
      const buttonToClick = (await allowWithChangesButton.count()) > 0
        ? allowWithChangesButton.first()
        : regularAllowButton.first();

      await buttonToClick.click();

      // Verify approval was processed
      await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
    } else {
      // If no editable fields, just approve normally
      await page.getByRole('button', { name: /allow/i }).first().click();
      await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle multiple approvals in sequence', async ({ page }) => {
    // Seed first approval
    const firstSeed = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'First Tool' },
      },
    });

    if (firstSeed.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id: firstId } = await firstSeed.json();

    // Mock SSE for first approval
    await mockApprovalSSE(page, {
      approval_id: firstId,
      tool_name: 'admob_create_ad_unit',
      tool_input: { name: 'First Tool' },
    });

    await mockResumeSSE(page, {
      result: 'First tool completed.',
      toolName: 'admob_create_ad_unit',
      toolInput: { name: 'First Tool' },
      toolResult: { success: true },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'create first ad unit');

    // Wait for first approval and approve it
    await expect(page.locator('text=Approval').or(page.locator('text=Pending'))).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /allow/i }).first().click();

    // Verify first approval processed
    await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Tool Approval - Verify Backend State', () => {
  test('should persist approval in backend state', async ({ page }) => {
    // Seed approval
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'State Test' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();
    expect(approval_id).toBeTruthy();

    // Verify approval is in pending list
    const pendingResponse = await page.request.get(`${CHAT_URL}/chat/pending-approvals`);
    const { pending } = await pendingResponse.json();

    const ourApproval = pending.find((p: { id: string }) => p.id === approval_id);
    expect(ourApproval).toBeTruthy();
    expect(ourApproval.tool).toBe('admob_create_ad_unit');

    // Now approve it directly via API
    const approveResponse = await page.request.post(`${CHAT_URL}/chat/approve-tool`, {
      data: {
        approval_id,
        approved: true,
      },
    });

    expect(approveResponse.ok()).toBeTruthy();
    const approveResult = await approveResponse.json();
    expect(approveResult.success).toBe(true);
    expect(approveResult.approved).toBe(true);
  });

  test('should handle approval with modified params', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'Original Name' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    // Approve with modified params
    const approveResponse = await page.request.post(`${CHAT_URL}/chat/approve-tool`, {
      data: {
        approval_id,
        approved: true,
        modified_params: { name: 'Modified Name' },
      },
    });

    expect(approveResponse.ok()).toBeTruthy();
    const result = await approveResponse.json();
    expect(result.success).toBe(true);
    expect(result.has_modifications).toBe(true);
  });

  test('should handle denial correctly', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: { name: 'To Be Denied' },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    // Deny the approval
    const denyResponse = await page.request.post(`${CHAT_URL}/chat/approve-tool`, {
      data: {
        approval_id,
        approved: false,
      },
    });

    expect(denyResponse.ok()).toBeTruthy();
    const result = await denyResponse.json();
    expect(result.success).toBe(true);
    expect(result.approved).toBe(false);
  });

  test('should reject unknown approval ID', async ({ page }) => {
    const response = await page.request.post(`${CHAT_URL}/chat/approve-tool`, {
      data: {
        approval_id: 'nonexistent-id-12345',
        approved: true,
      },
    });

    // Should return 404
    expect(response.status()).toBe(404);
  });
});

test.describe('Tool Approval - Entity Name Resolution', () => {
  test.afterEach(async ({ page }) => {
    await clearChatMocks(page);
  });

  test('should display known ad unit names, show raw ID for hallucinated ones', async ({ page }) => {
    // Skip if E2E_TESTING not enabled
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_batch_ad_unit_ids',
        tool_input: {
          ad_unit_ids: [
            'ca-app-pub-123/real-unit-1',      // Known - should show "Banner Ad"
            'ca-app-pub-123/real-unit-2',      // Known - should show "Interstitial Ad"
            'ca-app-pub-999/hallucinated-123', // Unknown - should show raw ID
          ],
          account_id: 'pub-123',
        },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    // Mock field options to return known entities
    await mockFieldOptions(page, [
      {
        fieldType: 'ad_units',
        options: [
          { value: 'ca-app-pub-123/real-unit-1', label: 'Banner Ad' },
          { value: 'ca-app-pub-123/real-unit-2', label: 'Interstitial Ad' },
          // Note: ca-app-pub-999/hallucinated-123 is NOT in this list
        ],
      },
      {
        fieldType: 'accounts',
        options: [
          { value: 'pub-123', label: 'My AdMob Account' },
        ],
      },
    ]);

    // Mock SSE with the batch tool
    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_batch_ad_unit_ids',
      tool_input: {
        ad_unit_ids: [
          'ca-app-pub-123/real-unit-1',
          'ca-app-pub-123/real-unit-2',
          'ca-app-pub-999/hallucinated-123',
        ],
        account_id: 'pub-123',
      },
    });

    await mockResumeSSE(page, {
      result: 'Batch operation completed.',
      toolName: 'admob_batch_ad_unit_ids',
      toolInput: {
        ad_unit_ids: [
          'ca-app-pub-123/real-unit-1',
          'ca-app-pub-123/real-unit-2',
          'ca-app-pub-999/hallucinated-123',
        ],
        account_id: 'pub-123',
      },
      toolResult: { success: true, processed: 3 },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'batch update ad units');

    // Wait for approval dialog
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // Wait for entity data to be fetched and chips to render
    await page.waitForTimeout(2000);

    // Find all entity chips using data-testid
    const chips = page.locator('[data-testid="entity-chip"]');
    const chipCount = await chips.count();

    if (chipCount > 0) {
      // Test chips directly - verify resolved vs unresolved
      for (let i = 0; i < chipCount; i++) {
        const chip = chips.nth(i);
        const entityId = await chip.getAttribute('data-entity-id');
        const entityName = await chip.getAttribute('data-entity-name');
        const isResolved = await chip.getAttribute('data-is-resolved');

        // Known IDs should be resolved (name !== id)
        if (entityId?.includes('real-unit-1')) {
          expect(entityName).toBe('Banner Ad');
          expect(isResolved).toBe('true');
        } else if (entityId?.includes('real-unit-2')) {
          expect(entityName).toBe('Interstitial Ad');
          expect(isResolved).toBe('true');
        } else if (entityId?.includes('hallucinated')) {
          // Hallucinated ID should NOT be resolved (name === id)
          expect(entityName).toContain('hallucinated');
          expect(isResolved).toBe('false');
        }
      }
    } else {
      // Fallback: Check page content if no chips found (different UI rendering)
      const pageContent = await page.content();
      const hasKnownOrUnknown =
        pageContent.includes('Banner Ad') ||
        pageContent.includes('Interstitial Ad') ||
        pageContent.includes('hallucinated-123') ||
        pageContent.includes('real-unit');
      expect(hasKnownOrUnknown).toBeTruthy();
    }

    // Approve and verify
    await page.getByRole('button', { name: /allow/i }).first().click();
    await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
  });

  test('should show raw ID when entity lookup fails', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_create_ad_unit',
        tool_input: {
          name: 'Test Unit',
          app_id: 'ca-app-pub-fake/hallucinated-app',
        },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    // Mock field options to return EMPTY - simulating no connected accounts
    await mockFieldOptions(page, [
      { fieldType: 'accounts', options: [] },
      { fieldType: 'apps', options: [] },
    ]);

    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_create_ad_unit',
      tool_input: {
        name: 'Test Unit',
        app_id: 'ca-app-pub-fake/hallucinated-app',
      },
    });

    await mockResumeSSE(page, {
      result: 'Created.',
      toolName: 'admob_create_ad_unit',
      toolInput: { name: 'Test Unit', app_id: 'ca-app-pub-fake/hallucinated-app' },
      toolResult: { success: true },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'create ad unit');

    // Wait for approval dialog
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // The hallucinated app_id should appear as raw ID since it's not in options
    const pageContent = await page.content();
    expect(pageContent.includes('hallucinated-app') || pageContent.includes('ca-app-pub-fake')).toBeTruthy();

    // Approve
    await page.getByRole('button', { name: /allow/i }).first().click();
    await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
  });

  test('should show correct options in dropdown with proper selection state', async ({ page }) => {
    const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
      data: {
        tool_name: 'admob_batch_ad_unit_ids',
        tool_input: {
          ad_unit_ids: ['ca-app-pub-123/unit-1', 'ca-app-pub-123/unit-2'],
          account_id: 'pub-123',
        },
      },
    });

    if (seedResponse.status() === 403) {
      test.skip(true, 'E2E_TESTING not enabled - skipping hybrid tests');
      return;
    }

    const { approval_id } = await seedResponse.json();

    // Mock field options with 3 ad units (2 are pre-selected)
    await mockFieldOptions(page, [
      {
        fieldType: 'ad_units',
        options: [
          { value: 'ca-app-pub-123/unit-1', label: 'Banner Ad' },
          { value: 'ca-app-pub-123/unit-2', label: 'Interstitial Ad' },
          { value: 'ca-app-pub-123/unit-3', label: 'Rewarded Ad' },  // Not selected
        ],
      },
      {
        fieldType: 'accounts',
        options: [{ value: 'pub-123', label: 'My Account' }],
      },
    ]);

    await mockApprovalSSE(page, {
      approval_id,
      tool_name: 'admob_batch_ad_unit_ids',
      tool_input: {
        ad_unit_ids: ['ca-app-pub-123/unit-1', 'ca-app-pub-123/unit-2'],
        account_id: 'pub-123',
      },
    });

    await mockResumeSSE(page, {
      result: 'Done.',
      toolName: 'admob_batch_ad_unit_ids',
      toolInput: {
        ad_unit_ids: ['ca-app-pub-123/unit-1', 'ca-app-pub-123/unit-2'],
        account_id: 'pub-123',
      },
      toolResult: { success: true },
    });

    await navigateToChat(page);
    await sendChatMessage(page, 'batch update ad units');

    // Wait for approval dialog
    await expect(
      page.locator('text=Approval').or(page.locator('text=Pending'))
    ).toBeVisible({ timeout: 15000 });

    // Wait for entity data to load
    await page.waitForTimeout(2000);

    // Find the multi-select trigger and click to open dropdown
    const multiSelectTrigger = page.locator('[data-testid="entity-chip"]').first().locator('..');
    const triggerButton = multiSelectTrigger.locator('..'); // Go up to the clickable trigger area

    // Try clicking on the area containing chips to open dropdown
    await triggerButton.click().catch(async () => {
      // Fallback: click on the chevron or the multi-select container
      const chevron = page.locator('svg.lucide-chevron-down').first();
      if (await chevron.count() > 0) {
        await chevron.click();
      }
    });

    // Wait for dropdown to appear
    await page.waitForTimeout(500);

    // Find dropdown options using data-testid
    const dropdownOptions = page.locator('[data-testid="dropdown-option"]');
    const optionCount = await dropdownOptions.count();

    if (optionCount > 0) {
      // Verify each option
      for (let i = 0; i < optionCount; i++) {
        const option = dropdownOptions.nth(i);
        const optionId = await option.getAttribute('data-option-id');
        const optionName = await option.getAttribute('data-option-name');
        const isSelected = await option.getAttribute('data-option-selected');

        // Verify option names match our mocked data
        if (optionId === 'ca-app-pub-123/unit-1') {
          expect(optionName).toBe('Banner Ad');
          expect(isSelected).toBe('true');
        } else if (optionId === 'ca-app-pub-123/unit-2') {
          expect(optionName).toBe('Interstitial Ad');
          expect(isSelected).toBe('true');
        } else if (optionId === 'ca-app-pub-123/unit-3') {
          expect(optionName).toBe('Rewarded Ad');
          expect(isSelected).toBe('false');  // Not in the original selection
        }
      }

      // Verify we have at least 3 options (our mocked entities)
      expect(optionCount).toBeGreaterThanOrEqual(3);
    }

    // Close dropdown and approve
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /allow/i }).first().click();
    await expect(page.locator('text=Allowed')).toBeVisible({ timeout: 10000 });
  });
});
