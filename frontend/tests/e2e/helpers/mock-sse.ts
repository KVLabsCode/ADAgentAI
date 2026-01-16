/**
 * Mock SSE helpers for E2E testing tool approval workflow.
 *
 * These helpers use Playwright's route interception to mock the chat stream
 * and emit deterministic tool_approval_required events.
 */

import type { Page, Route } from '@playwright/test';

export interface ApprovalDetails {
  approval_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface MockSSEOptions {
  /** Include a routing event before the approval event */
  includeRoutingEvent?: boolean;
  /** Delay before sending events (ms) */
  delay?: number;
  /** Agent type for routing event */
  agentType?: string;
}

/**
 * Mock the /chat/stream endpoint to emit a tool_approval_required event.
 *
 * This intercepts the SSE stream and returns a mocked response that includes
 * the approval event with the provided approval_id (which should be pre-seeded
 * via the /test/seed-approval endpoint).
 */
export async function mockApprovalSSE(
  page: Page,
  approval: ApprovalDetails,
  options: MockSSEOptions = {}
): Promise<void> {
  const { includeRoutingEvent = true, delay = 100, agentType = 'admob' } = options;

  await page.route('**/chat/stream', async (route: Route) => {
    // Small delay to simulate network
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const ssePayload = buildApprovalSSE(approval, {
      includeRoutingEvent,
      agentType,
    });

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: ssePayload,
    });
  });
}

/**
 * Mock the /chat/resume endpoint to emit completion events.
 * Called after an approval is submitted to continue the stream.
 *
 * For an approval flow to show "Allowed", the resume must emit:
 * 1. tool event - the tool being executed
 * 2. tool_result event - result of the tool
 * 3. result event - final LLM response
 * 4. done event
 */
export async function mockResumeSSE(
  page: Page,
  options: {
    result?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolResult?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const {
    result = 'Operation completed successfully.',
    toolName = 'admob_create_ad_unit',
    toolInput = {},
    toolResult = { success: true, message: 'Operation completed' },
  } = options;

  await page.route('**/chat/resume', async (route: Route) => {
    const events: string[] = [];

    // Emit tool event (tool being executed after approval)
    // Field names must match what api.ts handleSSEEvent expects:
    // - tool: tool name
    // - input_preview: shortened input for display
    // - input_full: full JSON input
    // - approved: boolean
    events.push(formatSSEEvent('tool', {
      type: 'tool',
      tool: toolName,
      input_preview: JSON.stringify(toolInput).slice(0, 100),
      input_full: JSON.stringify(toolInput),
      approved: true,
    }));

    // Emit tool result event
    // Field names must match what api.ts handleSSEEvent expects:
    // - preview: shortened result for display
    // - full: full JSON result
    // - data_type: 'json' | 'json_list' | 'text'
    events.push(formatSSEEvent('tool_result', {
      type: 'tool_result',
      preview: JSON.stringify(toolResult).slice(0, 100),
      full: JSON.stringify(toolResult),
      data_type: 'json',
    }));

    // Emit final result
    events.push(formatSSEEvent('result', {
      type: 'result',
      content: result,
    }));

    // Emit done event
    events.push(formatSSEEvent('done', { type: 'done' }));

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: events.join(''),
    });
  });
}

/**
 * Mock the /chat/resume endpoint for denial case.
 * Emits tool_denied event instead of tool/tool_result.
 */
export async function mockDenialResumeSSE(
  page: Page,
  options: {
    toolName?: string;
    reason?: string;
  } = {}
): Promise<void> {
  const {
    toolName = 'admob_create_ad_unit',
    reason = 'User denied the operation',
  } = options;

  await page.route('**/chat/resume', async (route: Route) => {
    const events: string[] = [];

    // Emit tool_denied event
    // Field names must match what api.ts handleSSEEvent expects
    events.push(formatSSEEvent('tool_denied', {
      type: 'tool_denied',
      tool_name: toolName,
      reason: reason,
    }));

    // Emit result event indicating denial
    events.push(formatSSEEvent('result', {
      type: 'result',
      content: `The ${toolName} operation was denied by the user.`,
    }));

    // Emit done event
    events.push(formatSSEEvent('done', { type: 'done' }));

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: events.join(''),
    });
  });
}

/**
 * Build a complete SSE payload for a tool approval scenario.
 */
function buildApprovalSSE(
  approval: ApprovalDetails,
  options: { includeRoutingEvent: boolean; agentType: string }
): string {
  const events: string[] = [];

  // Stream ID event - REQUIRED for frontend to track stream and call resume
  // Without this, currentStreamIdRef.current stays null and resumeStream is skipped
  events.push(
    formatSSEEvent('stream_id', {
      type: 'stream_id',
      stream_id: `test-stream-${approval.approval_id}`,
    })
  );

  // Optional routing event
  if (options.includeRoutingEvent) {
    events.push(
      formatSSEEvent('routing', {
        type: 'routing',
        agent_type: options.agentType,
        specialist: `${options.agentType}/inventory`,
      })
    );
  }

  // Agent start event
  events.push(
    formatSSEEvent('agent', {
      type: 'agent',
      agent_type: options.agentType,
    })
  );

  // Tool approval required event
  events.push(
    formatSSEEvent('tool_approval_required', {
      type: 'tool_approval_required',
      approval_id: approval.approval_id,
      tool_name: approval.tool_name,
      tool_input: JSON.stringify(approval.tool_input),
      parameter_schema: getSchemaForTool(approval.tool_name),
    })
  );

  return events.join('');
}

/**
 * Format a single SSE event.
 */
function formatSSEEvent(eventType: string, data: Record<string, unknown>): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Get RJSF schema for a tool.
 * Returns a schema that matches what the real backend would return.
 */
function getSchemaForTool(toolName: string): { schema: object; uiSchema: object } {
  // AdMob create ad unit
  if (toolName.includes('create_ad_unit') || toolName.includes('admob')) {
    return {
      schema: {
        type: 'object',
        title: 'Create Ad Unit',
        properties: {
          name: {
            type: 'string',
            title: 'Ad Unit Name',
            description: 'The name for the new ad unit',
          },
          app_id: {
            type: 'string',
            title: 'App ID',
            description: 'The AdMob app ID',
          },
          ad_format: {
            type: 'string',
            title: 'Ad Format',
            enum: ['BANNER', 'INTERSTITIAL', 'REWARDED', 'NATIVE'],
            default: 'BANNER',
          },
        },
        required: ['name'],
      },
      uiSchema: {
        'ui:order': ['name', 'app_id', 'ad_format'],
        name: {
          'ui:autofocus': true,
        },
      },
    };
  }

  // Tool with ad_unit_ids (multi-select) - for testing entity resolution
  if (toolName.includes('ad_unit_ids') || toolName.includes('batch')) {
    return {
      schema: {
        type: 'object',
        title: 'Batch Ad Unit Operation',
        properties: {
          ad_unit_ids: {
            type: 'array',
            title: 'Ad Units',
            description: 'Select ad units to include',
            items: {
              type: 'string',
            },
            'x-fetch-options': 'ad_units',
          },
          account_id: {
            type: 'string',
            title: 'Account',
            'x-fetch-options': 'accounts',
          },
        },
        required: ['ad_unit_ids'],
      },
      uiSchema: {
        'ui:order': ['account_id', 'ad_unit_ids'],
        ad_unit_ids: {
          'ui:widget': 'multiSelect',
        },
      },
    };
  }

  // Ad Manager create operations
  if (toolName.includes('admanager') && toolName.includes('create')) {
    return {
      schema: {
        type: 'object',
        title: 'Create Resource',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          network_code: {
            type: 'string',
            title: 'Network Code',
          },
        },
        required: ['name'],
      },
      uiSchema: {},
    };
  }

  // Default schema
  return {
    schema: {
      type: 'object',
      properties: {},
    },
    uiSchema: {},
  };
}

/**
 * Clear all route mocks for chat endpoints.
 * Call this in afterEach to ensure clean state.
 */
export async function clearChatMocks(page: Page): Promise<void> {
  await page.unroute('**/chat/stream');
  await page.unroute('**/chat/resume');
  await page.unroute('**/chat/field-options');
}

/**
 * Mock the /chat/field-options endpoint to return specific entities.
 * This allows testing entity name resolution (real vs hallucinated).
 */
export async function mockFieldOptions(
  page: Page,
  entities: { fieldType: string; options: Array<{ value: string; label: string }> }[]
): Promise<void> {
  await page.route('**/chat/field-options', async (route) => {
    const request = route.request();
    let body: { field_type?: string } = {};

    try {
      body = JSON.parse(request.postData() || '{}');
    } catch {
      body = {};
    }

    const fieldType = body.field_type || '';
    const matchingEntity = entities.find(e => e.fieldType === fieldType);

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: matchingEntity?.options || [],
        manual_input: !matchingEntity,
      }),
    });
  });
}
