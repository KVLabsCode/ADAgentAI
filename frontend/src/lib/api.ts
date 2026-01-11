/**
 * API client for connecting to CrewAI agent service
 */

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5001";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  if (organizationId) {
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
  type: "routing" | "agent" | "thinking" | "tool" | "tool_result" | "tool_approval_required" | "tool_denied" | "result" | "content" | "error" | "done";
  content?: string;
  service?: string;
  capability?: string;
  thinking?: string;  // Router's reasoning for routing decision
  agent?: string;
  task?: string;
  tool?: string;
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
  reason?: string;
  approved?: boolean;
}

export interface ChatStreamCallbacks {
  onRouting?: (service: string, capability: string, thinking?: string) => void;
  onAgent?: (agent: string, task: string) => void;
  onThinking?: (content: string) => void;
  onToolCall?: (tool: string, inputPreview: string, inputFull?: string, approved?: boolean) => void;
  onToolResult?: (preview: string, full?: string, dataType?: string) => void;
  onToolApprovalRequired?: (approvalId: string, toolName: string, toolInput: string) => void;
  onToolDenied?: (toolName: string, reason: string) => void;
  onContent?: (chunk: string) => void;  // Streaming content chunks
  onResult?: (content: string) => void;
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
  // Selected LLM model (e.g., "anthropic/claude-sonnet-4-20250514" or "openrouter/google/gemini-2.5-flash-lite")
  selectedModel?: string;
}

/**
 * Stream chat responses from CrewAI agent
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

    // Add organization context for org-scoped operations
    if (organizationId) {
      headers["x-organization-id"] = organizationId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        user_id: userId,
        organization_id: organizationId, // Pass org to agent for provider lookup
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
    console.error("[streamChat] Error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[streamChat] Request aborted");
      return;
    }
    // Provide helpful error message for connection failures
    if (error instanceof TypeError && error.message.includes("fetch")) {
      callbacks.onError?.(`Unable to connect to agent service at ${AGENT_URL}. Please ensure the CrewAI agent is running.`);
    } else {
      callbacks.onError?.(error instanceof Error ? error.message : "Unknown error");
    }
  }
}

function handleEvent(event: StreamEvent, callbacks: ChatStreamCallbacks) {
  switch (event.type) {
    case "routing":
      callbacks.onRouting?.(event.service || "", event.capability || "", event.thinking);
      break;
    case "agent":
      callbacks.onAgent?.(event.agent || "", event.task || "");
      break;
    case "thinking":
      callbacks.onThinking?.(event.content || "");
      break;
    case "tool":
      callbacks.onToolCall?.(
        event.tool || "",
        event.input_preview || "",
        event.input_full,
        event.approved
      );
      break;
    case "tool_result":
      callbacks.onToolResult?.(event.preview || "", event.full, event.data_type);
      break;
    case "tool_approval_required":
      callbacks.onToolApprovalRequired?.(
        event.approval_id || "",
        event.tool_name || "",
        event.tool_input || ""
      );
      break;
    case "tool_denied":
      callbacks.onToolDenied?.(event.tool_name || "", event.reason || "User denied");
      break;
    case "content":
      callbacks.onContent?.(event.content || "");
      break;
    case "result":
      callbacks.onResult?.(event.content || "");
      break;
    case "error":
      callbacks.onError?.(event.content || "Unknown error");
      break;
    // "done" is handled inline in streamChat to prevent duplicate calls
  }
}

/**
 * Approve or deny a dangerous tool execution
 */
export async function approveTool(approvalId: string, approved: boolean): Promise<boolean> {
  try {
    const response = await fetch(`${AGENT_URL}/chat/approve-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approval_id: approvalId,
        approved,
      }),
    });

    if (!response.ok) {
      console.error(`[approveTool] HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("[approveTool] Error:", error);
    return false;
  }
}
