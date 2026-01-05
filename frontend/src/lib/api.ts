/**
 * API client for connecting to CrewAI agent service
 */

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5000";

export interface StreamEvent {
  type: "routing" | "agent" | "thought" | "tool" | "tool_result" | "result" | "error" | "done";
  content?: string;
  service?: string;
  capability?: string;
  agent?: string;
  task?: string;
  tool?: string;
  input_preview?: string;
  input_full?: string;
  preview?: string;
  full?: string;
  data_type?: string;
  is_truncated?: boolean;
}

export interface ChatStreamCallbacks {
  onRouting?: (service: string, capability: string) => void;
  onAgent?: (agent: string, task: string) => void;
  onThinking?: (content: string) => void;
  onToolCall?: (tool: string, inputPreview: string, inputFull?: string) => void;
  onToolResult?: (preview: string, full?: string, dataType?: string) => void;
  onResult?: (content: string) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

/**
 * Stream chat responses from CrewAI agent
 */
export async function streamChat(
  message: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
  userId?: string
): Promise<void> {
  // Pass userId as query param since cookies don't work cross-domain
  let url = `${AGENT_URL}/chat/stream?message=${encodeURIComponent(message)}`;
  if (userId) {
    url += `&user_id=${encodeURIComponent(userId)}`;
  }
  let doneHandled = false; // Prevent duplicate onDone calls

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      credentials: "include", // Send cookies for auth
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
      callbacks.onRouting?.(event.service || "", event.capability || "");
      break;
    case "agent":
      callbacks.onAgent?.(event.agent || "", event.task || "");
      break;
    case "thought":
      callbacks.onThinking?.(event.content || "");
      break;
    case "tool":
      callbacks.onToolCall?.(
        event.tool || "",
        event.input_preview || "",
        event.input_full
      );
      break;
    case "tool_result":
      callbacks.onToolResult?.(event.preview || "", event.full, event.data_type);
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
