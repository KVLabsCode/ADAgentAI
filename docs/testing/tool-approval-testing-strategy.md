# Tool Approval Testing Strategy

This document explains the testing approach for the tool approval workflow, including why we use mocked SSE streams and the tradeoffs between component testing and E2E testing.

---

## The Problem

The tool approval workflow depends on several interconnected systems:

```
User Message → LLM Decision → Dangerous Tool Call → interrupt()
                                      ↓
              SSE Stream ← tool_approval_required event
                                      ↓
              Frontend UI → ToolApprovalBlock (Allow/Deny)
                                      ↓
              POST /chat/approve-tool → resolve_approval()
                                      ↓
              Graph Resumes → Tool Executes
```

**Why this is hard to test:**

1. **LLM Non-Determinism**: The LLM might not call dangerous tools for test prompts
2. **MCP Server Dependencies**: Requires configured AdMob/GAM credentials
3. **Real Account Data**: Tests would need real connected provider accounts
4. **Timing Issues**: SSE streams are async and timing-dependent

---

## Testing Approaches Considered

### Option A: Pure E2E (Real LLM)

```
Real User Message → Real LLM → Real Tool Call → Real SSE → Real UI
```

**Pros:**
- Tests the entire system end-to-end
- Catches integration issues

**Cons:**
- ❌ Non-deterministic (LLM might not trigger dangerous tools)
- ❌ Slow (LLM inference time)
- ❌ Expensive (API costs per test run)
- ❌ Flaky in CI (network, credentials, rate limits)

**Result:** Tests skip 90% of the time because the LLM doesn't call dangerous tools.

---

### Option B: Component Unit Tests

```
Mock Context → Render Component → Assert UI State
```

**Example with React Testing Library:**
```tsx
// Hypothetical component test
test('ToolApprovalBlock shows Allow button', () => {
  render(
    <EntityDataProvider value={mockEntityContext}>
      <ToolApprovalBlock
        approvalId="test-123"
        toolName="admob_create_ad_unit"
        toolInput={{ name: "Test" }}
      />
    </EntityDataProvider>
  );

  expect(screen.getByRole('button', { name: /allow/i })).toBeVisible();
});
```

**Pros:**
- Fast execution
- Deterministic
- Tests component logic in isolation

**Cons:**
- ❌ Doesn't test real API calls
- ❌ Doesn't test SSE parsing
- ❌ Doesn't test backend approval logic
- ❌ Requires separate test infrastructure (Jest/Vitest + RTL)
- ❌ Mocks can drift from real implementation

---

### Option C: API-Only Tests

```
Direct API Call → Assert Response
```

**Example:**
```python
def test_approve_tool():
    # Create pending approval
    approval_id = create_pending_approval("tool", "{}")

    # Resolve it
    success = resolve_approval(approval_id, approved=True)

    assert success == True
```

**Pros:**
- Tests backend logic
- Deterministic
- Fast

**Cons:**
- ❌ Doesn't test frontend UI
- ❌ Doesn't test SSE event parsing
- ❌ Doesn't test the integration between frontend and backend

---

### Option D: Hybrid Approach ✅ (What We Chose)

```
Mock SSE Stream → Real Frontend UI → Real API Call → Real Backend Logic
```

**The key insight:** We can **mock the non-deterministic part** (LLM → SSE stream) while keeping **everything else real**.

---

## Why Mock SSE?

### The SSE Stream is the "Seam"

In the approval flow, the SSE stream is the boundary between:
- **Non-deterministic systems** (LLM decision-making)
- **Deterministic systems** (Frontend UI, Backend API)

```
┌─────────────────────────────────────────────────────────────┐
│                    NON-DETERMINISTIC                        │
│  User Message → LLM → Tool Selection → Graph Execution      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     SSE Stream (SEAM)  ← We mock here
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DETERMINISTIC                          │
│  SSE Parser → React State → UI Render → API Call → Backend  │
└─────────────────────────────────────────────────────────────┘
```

By mocking SSE, we:
1. **Eliminate LLM non-determinism** - We control exactly what events are emitted
2. **Keep the rest real** - Frontend parsing, UI rendering, API calls all use real code
3. **Test the important parts** - The approval UI and backend logic are fully exercised

### What the Mock Does

```typescript
// Mock intercepts the /chat/stream endpoint
await page.route('**/chat/stream', async (route) => {
  // Instead of waiting for LLM, immediately return our test events
  await route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    body: `
      event: tool_approval_required
      data: {"approval_id":"test-123","tool_name":"admob_create_ad_unit",...}
    `,
  });
});
```

### What Stays Real

| Component | Mocked? | Why |
|-----------|---------|-----|
| LLM/Graph execution | ✅ Mocked | Non-deterministic, slow, expensive |
| SSE event format | ✅ Mocked | But matches real format exactly |
| SSE parsing in frontend | ❌ Real | Tests that we parse events correctly |
| React state management | ❌ Real | Tests state updates work |
| ToolApprovalBlock UI | ❌ Real | Tests buttons, forms render correctly |
| `/chat/approve-tool` API | ❌ Real | Tests real approval endpoint |
| `resolve_approval()` backend | ❌ Real | Tests file-based state management |
| Entity name resolution | ❌ Real | Tests `getDisplayName()` fallback |

---

## The Seeding Pattern

We also need the backend to have a pending approval **before** the SSE event arrives. Otherwise, when the frontend calls `/chat/approve-tool`, the backend won't find the approval.

### The Problem

```
1. Mock SSE emits: tool_approval_required (approval_id: "abc")
2. Frontend shows UI
3. User clicks Allow
4. Frontend calls: POST /chat/approve-tool { approval_id: "abc" }
5. Backend: "approval_id 'abc' not found!" ← ERROR
```

### The Solution: Pre-Seed

```typescript
// Step 1: Create real approval in backend FIRST
const seedResponse = await page.request.post(`${CHAT_URL}/test/seed-approval`, {
  data: { tool_name: 'admob_create_ad_unit', tool_input: { name: 'Test' } }
});
const { approval_id } = await seedResponse.json();

// Step 2: Mock SSE to emit the SAME approval_id
await mockApprovalSSE(page, {
  approval_id,  // Use the real ID from backend
  tool_name: 'admob_create_ad_unit',
  tool_input: { name: 'Test' }
});

// Step 3: Now when user clicks Allow, backend finds the approval!
```

### Why `/test/seed-approval` is Guarded

```python
@app.post("/test/seed-approval")
async def seed_approval(body: TestSeedApprovalRequest):
    # Only available when E2E_TESTING=true
    if not os.environ.get("E2E_TESTING"):
        raise HTTPException(status_code=403, detail="Only available in test mode")

    # Creates real approval in file-based storage
    approval_id = create_pending_approval(...)
    return {"approval_id": approval_id}
```

This endpoint:
- Is **disabled in production** (no `E2E_TESTING` env var)
- Is **enabled in CI** (workflow sets `E2E_TESTING=true`)
- Creates **real approvals** that the real backend can resolve

---

## Entity Name Resolution Testing

### The Behavior We're Testing

```typescript
// In entity-data-context.tsx
const getDisplayName = (fetchType: string, id: string): string => {
  const items = getCachedEntities(fetchType);
  const item = items.find((i) => i.id === id);
  return item?.name ?? id;  // ← Fallback to raw ID if not found
};
```

**Real ad unit:** Shows display name (e.g., "Banner Ad")
**Hallucinated ad unit:** Shows raw ID (e.g., "ca-app-pub-999/fake-123")

### Why Mock Field Options

The entity data comes from `/chat/field-options` API. We mock this to control what entities are "known":

```typescript
await mockFieldOptions(page, [
  {
    fieldType: 'ad_units',
    options: [
      { value: 'ca-app-pub-123/real-1', label: 'Banner Ad' },      // Known
      { value: 'ca-app-pub-123/real-2', label: 'Interstitial' },   // Known
      // ca-app-pub-999/hallucinated is NOT here                   // Unknown
    ],
  },
]);
```

Then we send a tool approval with both known and unknown IDs:

```typescript
await mockApprovalSSE(page, {
  tool_input: {
    ad_unit_ids: [
      'ca-app-pub-123/real-1',       // Will show "Banner Ad"
      'ca-app-pub-999/hallucinated', // Will show raw ID
    ],
  },
});
```

---

## Test Coverage Summary

| Test Category | What's Tested | Mocked | Real |
|---------------|---------------|--------|------|
| **Hybrid Integration** | Allow/Deny UI flow | SSE stream | UI, API, Backend |
| **Backend State** | API approval logic | SSE stream | API endpoints, file storage |
| **Entity Resolution** | Name vs ID display | SSE + field-options | UI rendering, getDisplayName() |
| **Backend Unit Tests** | Approval handlers | Nothing | Pure Python logic |

---

## Running the Tests

### Locally

```bash
# Terminal 1: Start services with test mode
E2E_TESTING=true cd frontend && bun run dev

# Terminal 2: Run hybrid tests
cd frontend && bunx playwright test tool-approval-hybrid

# Run backend unit tests
cd backend && uv run pytest tests/test_approval.py -v
```

### In CI

The GitHub Actions workflow automatically sets `E2E_TESTING=true`:

```yaml
- name: Start services
  env:
    E2E_TESTING: true  # Enables /test/seed-approval endpoint
```

---

## Testing Chips/Badges

### The Challenge

Chips display entity names (or raw IDs for hallucinated entities). We need to verify:
- Known entities show their display name (e.g., "Banner Ad")
- Unknown/hallucinated entities show the raw ID (e.g., "ca-app-pub-999/fake-123")

### Solution: Data Attributes

We added data attributes to the chip component for precise testing:

```tsx
// multi-select-widget.tsx
<span
  data-testid="entity-chip"
  data-entity-id={item.id}
  data-entity-name={item.name}
  data-is-resolved={item.name !== item.id}
>
  {item.name}
</span>
```

| Attribute | Purpose |
|-----------|---------|
| `data-testid="entity-chip"` | Query selector for finding chips |
| `data-entity-id` | The original ID passed to the component |
| `data-entity-name` | The displayed text (resolved name or raw ID) |
| `data-is-resolved` | `"true"` if name was found, `"false"` if fell back to ID |

### Test Implementation

```typescript
// Find all chips
const chips = page.locator('[data-testid="entity-chip"]');

for (let i = 0; i < await chips.count(); i++) {
  const chip = chips.nth(i);
  const entityId = await chip.getAttribute('data-entity-id');
  const entityName = await chip.getAttribute('data-entity-name');
  const isResolved = await chip.getAttribute('data-is-resolved');

  if (entityId?.includes('real-unit-1')) {
    // Known entity - should show display name
    expect(entityName).toBe('Banner Ad');
    expect(isResolved).toBe('true');
  } else if (entityId?.includes('hallucinated')) {
    // Unknown entity - should show raw ID
    expect(entityName).toContain('hallucinated');
    expect(isResolved).toBe('false');
  }
}
```

### Why Data Attributes?

1. **Precise assertions** - Test exact values, not just "string exists on page"
2. **Semantic meaning** - `data-is-resolved` explicitly tracks the resolution status
3. **Stable selectors** - `data-testid` won't break when CSS classes change
4. **Debug-friendly** - Can inspect chip state in browser DevTools

---

## Testing Dropdown Options

### The Challenge

Dropdown options also display entity names and need to show:
- Correct display names from mocked field options
- Proper selection state (which options are currently selected)

### Solution: Data Attributes on Dropdown Options

We added data attributes to dropdown options in `multi-select-widget.tsx`:

```tsx
// multi-select-widget.tsx - dropdown options
<button
  key={item.id}
  type="button"
  data-testid="dropdown-option"
  data-option-id={item.id}
  data-option-name={item.name}
  data-option-selected={isSelected}
  onClick={() => !isDisabled && toggleItem(item.id)}
  ...
>
```

| Attribute | Purpose |
|-----------|---------|
| `data-testid="dropdown-option"` | Query selector for finding dropdown options |
| `data-option-id` | The original ID/value of the option |
| `data-option-name` | The displayed text (resolved name) |
| `data-option-selected` | `"true"` if option is currently selected |

### Test Implementation

```typescript
// Open dropdown by clicking the trigger area
await page.locator('[data-testid="entity-chip"]').first().locator('..').click();

// Find dropdown options
const dropdownOptions = page.locator('[data-testid="dropdown-option"]');
const optionCount = await dropdownOptions.count();

for (let i = 0; i < optionCount; i++) {
  const option = dropdownOptions.nth(i);
  const optionId = await option.getAttribute('data-option-id');
  const optionName = await option.getAttribute('data-option-name');
  const isSelected = await option.getAttribute('data-option-selected');

  // Verify pre-selected options
  if (optionId === 'ca-app-pub-123/unit-1') {
    expect(optionName).toBe('Banner Ad');
    expect(isSelected).toBe('true');
  } else if (optionId === 'ca-app-pub-123/unit-3') {
    expect(optionName).toBe('Rewarded Ad');
    expect(isSelected).toBe('false');  // Not in original selection
  }
}
```

---

## Key Takeaways

1. **Mock at the seam** - SSE is the boundary between non-deterministic and deterministic code
2. **Keep the rest real** - Real frontend UI, real API calls, real backend logic
3. **Pre-seed state** - Backend needs the approval to exist before frontend tries to resolve it
4. **Guard test endpoints** - `/test/seed-approval` only works when `E2E_TESTING=true`
5. **Test entity resolution separately** - Mock field options to test known vs unknown entity display
