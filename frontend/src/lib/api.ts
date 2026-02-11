/**
 * API client for connecting to chat agent service
 */

import { DEMO_ORGANIZATION } from "@/lib/demo-user";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5001";
// API URL: empty string means same-origin (Hono runs as Next.js API route)
// Falls back to external URL for local dev if NEXT_PUBLIC_API_URL is set
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Demo org ID is not a valid UUID - skip sending to backend
const isDemoOrgId = (orgId: string | null | undefined) => orgId === DEMO_ORGANIZATION.id;

/**
 * Create fetch headers with session token and optional organization context
 */
export function createAuthHeaders(
  sessionToken: string | null,
  organizationId?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  // Don't send demo org ID to backend - it's not a valid UUID
  if (organizationId && !isDemoOrgId(organizationId)) {
    headers["x-organization-id"] = organizationId;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper for API calls
 * Sends session token from Neon Auth for backend validation
 */
export async function authFetch(
  url: string,
  sessionToken: string | null,
  options: RequestInit = {},
  organizationId?: string | null
): Promise<Response> {
  const headers = createAuthHeaders(sessionToken, organizationId);
  return fetch(url.startsWith("http") ? url : `${API_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
}

export interface StreamEvent {
  type: "routing" | "agent" | "thinking" | "tool" | "tool_executing" | "tool_result" | "tool_approval_required" | "tool_denied" | "action_required" | "result" | "content" | "error" | "done" | "stream_id";
  message?: string;  // Used by status, tool_executing
  icon?: string;  // Icon hint for status events
  content?: string;
  service?: string;
  capability?: string;
  thinking?: string;  // Router's reasoning for routing decision
  execution_path?: string;  // "reactive" or "workflow"
  model_selected?: string;  // Auto-selected model based on execution path
  model?: string;  // Actual LLM model ID for this event (e.g., "google/gemini-2.5-flash")
  agent?: string;
  task?: string;
  tool?: string;
  name?: string;  // Tool name in tool_result events (backend sends as "name")
  input_preview?: string;
  input_full?: string;
  preview?: string;
  full?: string;
  data_type?: string;
  is_truncated?: boolean;
  // Approval-related fields
  approval_id?: string;
  tool_name?: string;
  tool_input?: string;
  parameter_schema?: Record<string, unknown>;  // JSON Schema for editable params
  reason?: string;
  approved?: boolean;
  // Stream ID for reconnection
  stream_id?: string;
  // Action required fields
  action_type?: string;
  deep_link?: string;
  blocking?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChatStreamCallbacks {
  onStreamId?: (streamId: string) => void;  // Called with stream ID for reconnection
  onRouting?: (service: string, capability: string, thinking?: string, executionPath?: string, modelSelected?: string) => void;
  onAgent?: (agent: string, task: string) => void;
  onThinking?: (content: string, model?: string) => void;
  onToolCall?: (tool: string, inputPreview: string, inputFull?: string, approved?: boolean, model?: string) => void;
  onToolExecuting?: (toolName: string, message: string) => void;  // Tool started executing (shows spinner)
  onToolResult?: (toolName: string, preview: string, full?: string, dataType?: string) => void;
  onToolApprovalRequired?: (approvalId: string, toolName: string, toolInput: string, parameterSchema?: Record<string, unknown>) => void;
  onToolDenied?: (toolName: string, reason: string) => void;
  onActionRequired?: (actionType: string, message: string, deepLink?: string, blocking?: boolean, metadata?: Record<string, unknown>) => void;
  onContent?: (chunk: string) => void;  // Streaming content chunks
  onResult?: (content: string, model?: string) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  enabledProviderIds: string[];
  // App IDs enabled per provider: { "provider-id": ["app-id-1", "app-id-2"] }
  enabledAppIds: Record<string, string[]>;
  responseStyle: "concise" | "detailed";
  autoIncludeContext: boolean;
  // Selected LLM model (e.g., "anthropic/claude-sonnet-4-20250514" or "openrouter/google/gemini-2.5-flash")
  selectedModel?: string;
  // Context mode for entity grounding:
  // - "soft": Prefer enabled entities, allow explicit references to others
  // - "strict": ONLY use enabled entities, prompt to enable if needed
  contextMode?: "soft" | "strict";
}

/**
 * Stream chat responses from chat agent
 */
export async function streamChat(
  message: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
  userId?: string,
  history?: ChatHistoryMessage[],
  context?: ChatContext,
  accessToken?: string | null,
  organizationId?: string | null
): Promise<void> {
  const url = `${AGENT_URL}/chat/stream`;
  let doneHandled = false; // Prevent duplicate onDone calls

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    // Add access token for authenticated requests
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Add organization context for org-scoped operations (skip demo org ID)
    if (organizationId && !isDemoOrgId(organizationId)) {
      headers["x-organization-id"] = organizationId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        user_id: userId,
        organization_id: isDemoOrgId(organizationId) ? null : organizationId, // Pass org to agent for provider lookup (skip demo org)
        history: history || [],
        context: context || {},
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);
            if (event.type === "done") {
              if (!doneHandled) {
                doneHandled = true;
                callbacks.onDone?.();
              }
            } else {
              handleEvent(event, callbacks);
            }
          } catch {
            console.warn("Failed to parse SSE event:", jsonStr);
          }
        }
      }
    }

    // Only call onDone if not already handled by server event
    if (!doneHandled) {
      callbacks.onDone?.();
    }
  } catch (error) {
    // AbortError is expected when user navigates away - silently ignore
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    console.error("[streamChat] Error:", error);
    // Provide helpful error message for connection failures
    if (error instanceof TypeError && error.message.includes("fetch")) {
      callbacks.onError?.(`Unable to connect to agent service at ${AGENT_URL}. Please ensure the chat agent is running.`);
    } else {
      callbacks.onError?.(error instanceof Error ? error.message : "Unknown error");
    }
  }
}

function handleEvent(event: StreamEvent, callbacks: ChatStreamCallbacks) {
  // Log all events for debugging
  console.log(`[SSE] Event: ${event.type}`, event.type === "content" ? "(content chunk)" : event);

  switch (event.type) {
    case "stream_id":
      callbacks.onStreamId?.(event.stream_id || "");
      break;
    case "routing":
      callbacks.onRouting?.(event.service || "", event.capability || "", event.thinking, event.execution_path, event.model_selected);
      break;
    case "agent":
      callbacks.onAgent?.(event.agent || "", event.task || "");
      break;
    case "thinking":
      callbacks.onThinking?.(event.content || "", event.model);
      break;
    case "tool":
      callbacks.onToolCall?.(
        event.tool || "",
        event.input_preview || "",
        event.input_full,
        event.approved,
        event.model
      );
      break;
    case "tool_result":
      // Pass tool name from event (backend sends it as "name" field)
      callbacks.onToolResult?.(event.name || event.tool_name || "unknown", event.preview || "", event.full, event.data_type);
      break;
    case "tool_executing":
      callbacks.onToolExecuting?.(event.tool_name || "", event.message || "Executing...");
      break;
    case "tool_approval_required":
      callbacks.onToolApprovalRequired?.(
        event.approval_id || "",
        event.tool_name || "",
        event.tool_input || "",
        event.parameter_schema
      );
      break;
    case "tool_denied":
      callbacks.onToolDenied?.(event.tool_name || "", event.reason || "User denied");
      break;
    case "action_required":
      callbacks.onActionRequired?.(
        event.action_type || "",
        event.content || event.message || "",
        event.deep_link,
        event.blocking,
        event.metadata
      );
      break;
    case "content":
      callbacks.onContent?.(event.content || "");
      break;
    case "result":
      callbacks.onResult?.(event.content || "", event.model);
      break;
    case "error":
      callbacks.onError?.(event.content || "Unknown error");
      break;
    // "done" is handled inline in streamChat to prevent duplicate calls
  }
}

export interface FieldOption {
  value: string;
  label: string;
  // Optional metadata for filtering/validation
  adFormat?: string;
  appId?: string;
  platform?: string;
  // UI state
  disabled?: boolean;
  comingSoon?: boolean;
}

export interface FieldOptionsResponse {
  options: FieldOption[];
  manual_input?: boolean;
}

/**
 * Filter parameters for cascading field dependencies
 */
export interface FieldFilterParams {
  platform?: string;    // IOS, ANDROID
  adFormat?: string;    // BANNER, INTERSTITIAL, REWARDED, etc.
  appId?: string;       // Filter by specific app
}

/**
 * Fetch dynamic field options for parameter forms
 *
 * Phase 2 optimization: Calls API server directly instead of chat server,
 * removing one HTTP hop for ~50ms savings per request.
 *
 * Note: "accounts" field type is now handled by EntitySelectWidget using
 * providers from UserContext (Phase 1 optimization), so this function
 * is only called for dependent fields: apps, ad_units, mediation_groups, ad_sources.
 *
 * @param fieldType - Type of field (apps, ad_units, mediation_groups, ad_sources, etc.)
 * @param accessToken - User's access token
 * @param accountId - Account ID (publisherId) for dependent fields
 * @param organizationId - Optional organization context
 * @param filters - Optional filter params for cascading dependencies
 */
export async function fetchFieldOptions(
  fieldType: string,
  accessToken: string | null,
  accountId?: string,
  organizationId?: string | null,
  filters?: FieldFilterParams
): Promise<FieldOptionsResponse> {
  // Accounts are handled by UserContext (Phase 1 optimization)
  // This should not be called for accounts, but handle gracefully
  if (fieldType === "accounts") {
    console.warn("[fetchFieldOptions] accounts should use UserContext providers");
    return { options: [], manual_input: false };
  }

  // accountId is required for dependent fields
  if (!accountId) {
    return { options: [], manual_input: true };
  }

  try {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    if (organizationId && !isDemoOrgId(organizationId)) {
      headers["x-organization-id"] = organizationId;
    }

    // Build query params
    const params = new URLSearchParams({ accountId });
    if (filters?.platform) params.set("platform", filters.platform);
    if (filters?.adFormat) params.set("adFormat", filters.adFormat);
    if (filters?.appId) params.set("appId", filters.appId);

    // Call API server directly (Phase 2 optimization)
    const response = await fetch(
      `${API_URL}/api/field-options/${fieldType}?${params}`,
      { headers }
    );

    if (!response.ok) {
      return { options: [], manual_input: true };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[fetchFieldOptions] Error:", error);
    return { options: [], manual_input: true };
  }
}

/**
 * Approve or deny a dangerous tool execution
 * @param approvalId - The approval request ID
 * @param approved - Whether to approve or deny
 * @param modifiedParams - Optional modified parameters from user edits
 */
export interface ApproveToolResult {
  success: boolean
  expired?: boolean
  error?: string
}

export async function approveTool(
  approvalId: string,
  approved: boolean,
  modifiedParams?: Record<string, unknown>
): Promise<ApproveToolResult> {
  console.log(`[approveTool] Sending approval: ${approvalId}, approved: ${approved}`, modifiedParams ? "with modified params" : "");
  try {
    const response = await fetch(`${AGENT_URL}/chat/approve-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approval_id: approvalId,
        approved,
        modified_params: modifiedParams,
      }),
    });

    if (!response.ok) {
      console.error(`[approveTool] HTTP ${response.status}: ${response.statusText}`);
      // 404 means the approval expired or was already resolved
      if (response.status === 404) {
        return { success: false, expired: true, error: "Approval expired" };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: result.success === true };
  } catch (error) {
    console.error("[approveTool] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch pending result for a stream that may have disconnected
 * Used when user navigates away during approval and comes back
 */
export interface StreamResult {
  status: "processing" | "done"
  stream_id: string
  result?: string
  error?: string
  events?: unknown[]
}

export async function fetchStreamResult(streamId: string): Promise<StreamResult | null> {
  try {
    const response = await fetch(`${AGENT_URL}/chat/result/${streamId}`);

    if (response.status === 404) {
      return null; // Stream not found or expired
    }

    if (!response.ok) {
      console.error(`[fetchStreamResult] HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[fetchStreamResult] Error:", error);
    return null;
  }
}

/**
 * Poll for stream result until done or timeout
 */
export async function pollForStreamResult(
  streamId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<StreamResult | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fetchStreamResult(streamId);

    if (!result) {
      return null; // Stream not found or expired
    }

    if (result.status === "done") {
      return result;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return null; // Timeout
}

/**
 * Resume a paused graph stream after tool approval.
 * This continues the LangGraph execution from where it was interrupted.
 */
export async function resumeStream(
  streamId: string,
  approved: boolean,
  callbacks: ChatStreamCallbacks,
  accessToken?: string | null,
  modifiedParams?: Record<string, unknown>,
  signal?: AbortSignal,
  toolName?: string
): Promise<void> {
  const url = `${AGENT_URL}/chat/resume`;
  let doneHandled = false;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        stream_id: streamId,
        approved,
        modified_params: modifiedParams,
        tool_name: toolName,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);
            if (event.type === "done") {
              if (!doneHandled) {
                doneHandled = true;
                callbacks.onDone?.();
              }
            } else {
              handleEvent(event, callbacks);
            }
          } catch {
            console.warn("Failed to parse SSE event:", jsonStr);
          }
        }
      }
    }

    if (!doneHandled) {
      callbacks.onDone?.();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    console.error("[resumeStream] Error:", error);
    callbacks.onError?.(error instanceof Error ? error.message : "Unknown error");
  }
}
