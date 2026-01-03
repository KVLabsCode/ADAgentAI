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
  signal?: AbortSignal
): Promise<void> {
  const url = `${AGENT_URL}/chat/stream?message=${encodeURIComponent(message)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
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
            handleEvent(event, callbacks);
          } catch {
            console.warn("Failed to parse SSE event:", jsonStr);
          }
        }
      }
    }

    callbacks.onDone?.();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    callbacks.onError?.(error instanceof Error ? error.message : "Unknown error");
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
    case "done":
      callbacks.onDone?.();
      break;
  }
}
