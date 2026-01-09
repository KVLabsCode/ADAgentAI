"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { streamChat, approveTool, type ChatHistoryMessage, type ChatContext } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, Provider, StreamEventItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  sessionId?: string
}

export function ChatContainer({ initialMessages = [], providers = [], sessionId: initialSessionId }: ChatContainerProps) {
  const pathname = usePathname()
  const { user, getAccessToken } = useUser()
  const { enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext } = useChatSettings()
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Tool approval state: Map<approvalId, approved | null>
  const [pendingApprovals, setPendingApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  // Reset state when navigating to a new/different chat session
  // Uses initialSessionId as the trigger - when it changes, we reset all state
  React.useEffect(() => {
    // Abort any pending request when session changes
    abortControllerRef.current?.abort()

    // Reset all state to match new session
    setMessages(initialMessages)
    setCurrentSessionId(initialSessionId || null)
    setIsLoading(false)
    setPendingApprovals(new Map())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only reset on sessionId change
  }, [initialSessionId])

  // Track previous pathname to detect navigation from /chat/[id] to /chat
  const prevPathnameRef = React.useRef(pathname)

  // Reset state when navigating back to /chat (new chat) from a session
  // This handles the case where URL was updated via history.replaceState during streaming
  React.useEffect(() => {
    const prevPathname = prevPathnameRef.current
    prevPathnameRef.current = pathname

    // Only reset when navigating FROM /chat/[id] TO /chat (not during initial load or history.replaceState)
    if (pathname === '/chat' && prevPathname?.startsWith('/chat/') && prevPathname !== '/chat') {
      // We navigated back to /chat from a session - reset state
      abortControllerRef.current?.abort()
      setMessages([])
      setCurrentSessionId(null)
      setIsLoading(false)
      setPendingApprovals(new Map())
    }
  }, [pathname])

  // Handle tool approval from user - calls backend API and updates local state
  const handleToolApproval = React.useCallback(async (approvalId: string, approved: boolean) => {
    // Optimistically update UI
    setPendingApprovals(prev => {
      const newMap = new Map(prev)
      newMap.set(approvalId, approved)
      return newMap
    })

    // Call backend API to actually approve/deny the tool
    try {
      const success = await approveTool(approvalId, approved)
      if (!success) {
        console.error(`Failed to ${approved ? 'approve' : 'deny'} tool`)
        // Revert on failure
        setPendingApprovals(prev => {
          const newMap = new Map(prev)
          newMap.set(approvalId, null)
          return newMap
        })
      }
    } catch (error) {
      console.error('Error calling approveTool:', error)
      // Revert on error
      setPendingApprovals(prev => {
        const newMap = new Map(prev)
        newMap.set(approvalId, null)
        return newMap
      })
    }
  }, [])

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0
  const userId = user?.id

  // Build context for API calls
  const chatContext: ChatContext = React.useMemo(() => ({
    enabledProviderIds,
    enabledAppIds,
    responseStyle,
    autoIncludeContext,
  }), [enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext])

  // Create a new chat session
  const createSession = async (title?: string): Promise<string | null> => {
    try {
      const accessToken = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['x-stack-access-token'] = accessToken
      }
      const response = await fetch(`${API_URL}/api/chat/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title || 'New Chat' }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.session.id
      }
    } catch (error) {
      console.error('Failed to create chat session:', error)
    }
    return null
  }

  // Save a message to the database
  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => {
    try {
      const accessToken = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['x-stack-access-token'] = accessToken
      }
      await fetch(`${API_URL}/api/chat/session/${sessionId}/save-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, role, metadata }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

    // Get access token for authenticated API calls
    const accessToken = await getAccessToken()

    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    // Create a session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      // Use first ~50 chars of message as title
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      sessionId = await createSession(title)
      if (sessionId) {
        // Update URL first using history API to avoid component remount during streaming
        // This must happen BEFORE setCurrentSessionId to prevent the pathname effect from triggering a reset
        window.history.replaceState(null, '', `/chat/${sessionId}`)
        setCurrentSessionId(sessionId)
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }

    // Create assistant message placeholder
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      agentName: "",
      events: [],
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    // Save user message to database (don't await to avoid blocking UI)
    if (sessionId) {
      saveMessage(sessionId, 'user', content)
    }

    // Track sequential events
    const events: StreamEventItem[] = []
    // Also track legacy format for saving to DB
    const toolCalls: { name: string; params: Record<string, unknown> }[] = []
    const toolResults: { name: string; result: unknown }[] = []
    let finalContent = ""

    // Build conversation history from existing messages (excluding the ones we just added)
    const history: ChatHistoryMessage[] = messages
      .filter((m): m is Message & { role: "user" | "assistant" } =>
        (m.role === "user" || m.role === "assistant") && !!m.content?.trim()
      )
      .map(m => ({ role: m.role, content: m.content }))

    await streamChat(
      content,
      {
        onRouting: (service, capability, thinking) => {
          // Add routing event to show the decision process (with optional thinking)
          events.push({ type: "routing", service, capability, thinking })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: `${service} / ${capability}`, events: [...events] }
                : m
            )
          )
        },
        onAgent: (agent, _task) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: agent || m.agentName }
                : m
            )
          )
        },
        onThinking: (thinkingContent) => {
          // Add each thinking event separately for sequential display
          events.push({ type: "thinking", content: thinkingContent })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onToolCall: (tool, inputPreview, inputFull, approved) => {
          let params: Record<string, unknown> = {}
          try {
            const inputStr = inputFull || inputPreview
            if (inputStr) {
              params = JSON.parse(inputStr)
            }
          } catch {
            params = { input: inputPreview }
          }

          // Add to sequential events (include approved flag for dangerous tools that were approved)
          events.push({ type: "tool", name: tool, params, approved })
          // Also track for legacy saving
          toolCalls.push({ name: tool, params })

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onToolResult: (preview, full, dataType) => {
          const lastToolCall = toolCalls[toolCalls.length - 1]
          let result: unknown = preview

          if (dataType === "json" || dataType === "json_list") {
            try {
              result = JSON.parse(full || preview)
            } catch {
              result = preview
            }
          }

          // Add to sequential events
          events.push({ type: "tool_result", name: lastToolCall?.name || "unknown", result })
          // Also track for legacy saving
          toolResults.push({ name: lastToolCall?.name || "unknown", result })

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onToolApprovalRequired: (approvalId, toolName, toolInput) => {
          // Add approval request event for UI display
          events.push({ type: "tool_approval_required", approval_id: approvalId, tool_name: toolName, tool_input: toolInput })
          // Mark as pending in approval state
          setPendingApprovals(prev => {
            const newMap = new Map(prev)
            newMap.set(approvalId, null) // null = pending
            return newMap
          })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onToolDenied: (toolName, reason) => {
          // Add denied event for UI display
          events.push({ type: "tool_denied", tool_name: toolName, reason })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onContent: (chunk) => {
          // Append streaming content chunk to the message
          finalContent += chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: finalContent }
                : m
            )
          )
        },
        onResult: (resultContent) => {
          // Final result - overwrite with complete content
          finalContent = resultContent
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: resultContent }
                : m
            )
          )
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: `Error: ${error}` }
                : m
            )
          )
          setIsLoading(false)
        },
        onDone: () => {
          setIsLoading(false)
          // Save assistant message to database
          if (sessionId && finalContent) {
            const allThinking = events
              .filter((e): e is StreamEventItem & { type: "thinking" } => e.type === "thinking")
              .map(e => e.content)
              .join("\n\n")

            saveMessage(sessionId, 'assistant', finalContent, {
              thinking: allThinking,
              toolCalls,
              toolResults,
              events, // Save sequential events for proper display on reload
            })
          }
        },
      },
      abortControllerRef.current.signal,
      userId, // Pass user ID
      history, // Pass conversation history for context
      chatContext, // Pass context settings (enabled providers, response style)
      accessToken // Pass access token for authenticated requests
    )

    setIsLoading(false)
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header - always visible at top */}
      <div className="shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <ChatHeader hasProviders={hasProviders} />
      </div>

      {!hasMessages ? (
        /* Empty state - centered content with input */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="max-w-xl w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-medium tracking-tight">
                {hasProviders ? "How can I help you today?" : "Connect a provider to start"}
              </h2>
              <p className="text-xs text-muted-foreground/70">
                {hasProviders
                  ? "Ask about your ad performance, create reports, or get optimization tips."
                  : "Link your AdMob or Google Ad Manager account to begin."}
              </p>
            </div>

            {/* Example prompts above input */}
            {hasProviders && (
              <ExamplePrompts onPromptClick={handlePromptClick} />
            )}

            {/* Centered Input */}
            <div className="w-full">
              <ChatInput
                onSend={handleSendMessage}
                disabled={!hasProviders}
                isLoading={isLoading}
                placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                providers={providers}
              />
            </div>
          </div>
        </div>
      ) : (
        /* With messages - scrollable content + sticky input */
        <>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onToolApproval={handleToolApproval}
              pendingApprovals={pendingApprovals}
            />
          </div>

          {/* Sticky Input at bottom */}
          <div className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/30 px-6 py-3">
            <div className="max-w-6xl mx-auto w-full">
              <ChatInput
                onSend={handleSendMessage}
                disabled={!hasProviders}
                isLoading={isLoading}
                providers={providers}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
