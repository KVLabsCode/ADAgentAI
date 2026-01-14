"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { streamChat, approveTool, resumeStream, type ChatHistoryMessage, type ChatContext } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, Provider, StreamEventItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  sessionId?: string
}

const CHAT_STORAGE_KEY = "adagent_active_chat"

// Load chat state from localStorage
function loadChatState(): { messages: Message[], sessionId: string | null } | null {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Validate structure
      if (parsed && Array.isArray(parsed.messages)) {
        return { messages: parsed.messages, sessionId: parsed.sessionId || null }
      }
    }
  } catch (e) {
    console.error("[ChatPersistence] Load error:", e)
  }
  return null
}

// Save chat state to localStorage
function saveChatState(messages: Message[], sessionId: string | null) {
  if (typeof window === "undefined") return
  try {
    // Only save if there are messages
    if (messages.length > 0) {
      const data = JSON.stringify({ messages, sessionId })
      localStorage.setItem(CHAT_STORAGE_KEY, data)
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    }
  } catch (e) {
    console.error("[ChatPersistence] Save error:", e)
  }
}

// Extract pending approval states from messages
// Returns Map<approvalId, boolean | null> where null = still pending, true = approved, false = denied
function extractPendingApprovals(messages: Message[]): Map<string, boolean | null> {
  const approvals = new Map<string, boolean | null>()

  for (const message of messages) {
    if (!message.events) continue

    // Track approval requests in order - each tool_result/tool_denied resolves the PREVIOUS approval
    let currentApprovalId: string | null = null

    for (const event of message.events) {
      if (event.type === "tool_approval_required") {
        // If there was a previous approval that wasn't resolved, it's still pending
        if (currentApprovalId && !approvals.has(currentApprovalId)) {
          approvals.set(currentApprovalId, null)
        }
        currentApprovalId = event.approval_id
      } else if (event.type === "tool_result" && currentApprovalId) {
        // Tool result means the current approval was approved
        approvals.set(currentApprovalId, true)
        currentApprovalId = null // Reset for next approval
      } else if (event.type === "tool_denied" && currentApprovalId) {
        // Tool denied means the current approval was denied
        approvals.set(currentApprovalId, false)
        currentApprovalId = null
      }
    }

    // If there's an unresolved approval at the end of the message, it's still pending
    if (currentApprovalId && !approvals.has(currentApprovalId)) {
      approvals.set(currentApprovalId, null)
    }
  }

  return approvals
}

export function ChatContainer({ initialMessages = [], providers = [], sessionId: initialSessionId }: ChatContainerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newChatParam = searchParams.get('new') // Timestamp param to force new chat
  const { user, getAccessToken } = useUser()
  const { enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel } = useChatSettings()
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Stream ID for reconnection after navigation
  const currentStreamIdRef = React.useRef<string | null>(null)
  const currentAssistantIdRef = React.useRef<string | null>(null)

  // Tool approval state: Map<approvalId, approved | null>
  const [pendingApprovals, setPendingApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  // Hydrate from localStorage after mount (client-side only)
  // Simple rule: localStorage wins if it has more messages for the same session
  React.useEffect(() => {
    const saved = loadChatState()

    // Case 1: Same session, localStorage has more messages (mid-conversation restore)
    if (saved && initialSessionId && saved.sessionId === initialSessionId) {
      if (saved.messages.length > initialMessages.length) {
        setMessages(saved.messages)
        setCurrentSessionId(saved.sessionId)
        // Restore pending approval states from messages
        setPendingApprovals(extractPendingApprovals(saved.messages))
        setIsHydrated(true)
        return
      }
    }

    // Case 2: New chat page, restore from localStorage if available
    if (!initialSessionId && saved && saved.messages.length > 0) {
      setMessages(saved.messages)
      setCurrentSessionId(saved.sessionId)
      // Restore pending approval states from messages
      setPendingApprovals(extractPendingApprovals(saved.messages))
      // Update URL to match the restored session
      if (saved.sessionId) {
        window.history.replaceState(null, '', `/chat/${saved.sessionId}`)
      }
      setIsHydrated(true)
      return
    }

    // Case 3: Use server data (or empty for new chat)
    // Also restore pending approvals from initial messages (e.g., from server)
    if (initialMessages.length > 0) {
      setPendingApprovals(extractPendingApprovals(initialMessages))
    }
    setIsHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, [])

  // Persist chat state to localStorage when messages or sessionId change
  React.useEffect(() => {
    if (!isHydrated) return
    saveChatState(messages, currentSessionId)
  }, [messages, currentSessionId, isHydrated])

  // Track the last sessionId we've seen to detect actual navigation (not initial mount)
  const lastSessionIdRef = React.useRef<string | undefined>(undefined)
  const hasInitialized = React.useRef(false)

  // Reset state when navigating to a DIFFERENT chat session (not on initial mount)
  React.useEffect(() => {
    // Skip until hydration is complete
    if (!isHydrated) return

    // Skip on first run after hydration
    if (!hasInitialized.current) {
      hasInitialized.current = true
      lastSessionIdRef.current = initialSessionId
      return
    }

    // Only reset if sessionId actually changed
    if (lastSessionIdRef.current === initialSessionId) return

    lastSessionIdRef.current = initialSessionId

    // Abort any pending request when session changes
    abortControllerRef.current?.abort()

    // Reset all state to match new session
    setMessages(initialMessages)
    setCurrentSessionId(initialSessionId || null)
    setIsLoading(false)
    setPendingApprovals(new Map())
    currentStreamIdRef.current = null
    currentAssistantIdRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only reset on sessionId change
  }, [initialSessionId, isHydrated])

  // Track previous pathname to detect navigation from /chat/[id] to /chat
  const prevPathnameRef = React.useRef(pathname)

  // Reset state when navigating back to /chat (new chat) from a session
  // This handles the case where URL was updated via history.replaceState during streaming
  React.useEffect(() => {
    const prevPathname = prevPathnameRef.current
    prevPathnameRef.current = pathname

    // Only reset when navigating FROM /chat/[id] TO /chat (not during initial load or history.replaceState)
    if (pathname === '/chat' && prevPathname?.startsWith('/chat/') && prevPathname !== '/chat') {
      // We navigated back to /chat from a session - reset state and clear localStorage
      abortControllerRef.current?.abort()
      setMessages([])
      setCurrentSessionId(null)
      setIsLoading(false)
      setPendingApprovals(new Map())
      currentStreamIdRef.current = null
      currentAssistantIdRef.current = null
      localStorage.removeItem(CHAT_STORAGE_KEY)
    }
  }, [pathname])

  // Reset state when ?new= param changes (user clicked "New Chat" while already on chat)
  React.useEffect(() => {
    if (newChatParam && pathname === '/chat') {
      abortControllerRef.current?.abort()
      setMessages([])
      setCurrentSessionId(null)
      setIsLoading(false)
      setPendingApprovals(new Map())
      currentStreamIdRef.current = null
      currentAssistantIdRef.current = null
      localStorage.removeItem(CHAT_STORAGE_KEY)
      // Clean up URL by removing the ?new= param
      window.history.replaceState({}, '', '/chat')
    }
  }, [newChatParam, pathname])

  // Handle tool approval from user - calls backend API and resumes graph execution
  const handleToolApproval = React.useCallback(async (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => {
    // Optimistically update UI
    setPendingApprovals(prev => {
      const newMap = new Map(prev)
      newMap.set(approvalId, approved)
      return newMap
    })

    // Call backend API to actually approve/deny the tool (with optional modified params)
    try {
      const result = await approveTool(approvalId, approved, modifiedParams)
      if (!result.success) {
        console.error(`Failed to ${approved ? 'approve' : 'deny'} tool:`, result.error)

        // Show user-friendly message for expired approvals
        if (result.expired) {
          alert("This approval has expired (you may have navigated away). Please send a new message to try again.")
        }

        // Revert on failure
        setPendingApprovals(prev => {
          const newMap = new Map(prev)
          newMap.set(approvalId, null)
          return newMap
        })
        return
      }

      // If we have a stream ID and assistant ID, resume the graph to continue execution
      if (currentStreamIdRef.current && currentAssistantIdRef.current) {
        const streamId = currentStreamIdRef.current
        const assistantId = currentAssistantIdRef.current

        console.log(`[ChatContainer] Approval succeeded, resuming stream: ${streamId}`)
        setIsLoading(true)

        // Get access token for authenticated request
        const accessToken = await getAccessToken()

        // Track events and content during resume
        let finalContent = ""
        const resumeEvents: StreamEventItem[] = []

        // Get existing events from the message
        const existingMessage = await new Promise<Message | undefined>(resolve => {
          setMessages(prev => {
            const msg = prev.find(m => m.id === assistantId)
            resolve(msg)
            return prev
          })
        })
        if (existingMessage?.events) {
          resumeEvents.push(...existingMessage.events)
        }

        // Track the last tool name for pairing with tool_result
        let lastToolName = "unknown"

        // Resume the graph stream
        await resumeStream(
          streamId,
          approved,
          {
            onThinking: (thinkingContent) => {
              resumeEvents.push({ type: "thinking", content: thinkingContent })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onToolCall: (tool, inputPreview, inputFull, toolApproved) => {
              let params: Record<string, unknown> = {}
              try {
                const inputStr = inputFull || inputPreview
                if (inputStr) {
                  params = JSON.parse(inputStr)
                }
              } catch {
                params = { input: inputPreview }
              }
              lastToolName = tool
              resumeEvents.push({ type: "tool", name: tool, params, approved: toolApproved })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onToolResult: (preview, full, dataType) => {
              let toolResult: unknown = preview
              if (dataType === "json" || dataType === "json_list") {
                try {
                  toolResult = JSON.parse(full || preview)
                } catch {
                  toolResult = preview
                }
              }
              resumeEvents.push({ type: "tool_result", name: lastToolName, result: toolResult })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onContent: (chunk) => {
              // Push each content chunk as an event - like thinking, content appears inline
              finalContent += chunk
              resumeEvents.push({ type: "content", content: chunk })

              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: finalContent, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onResult: (resultContent) => {
              finalContent = resultContent
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: resultContent, events: [...resumeEvents] }
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
            },
            onToolApprovalRequired: (approvalId, toolName, toolInput, parameterSchema) => {
              // Another dangerous tool was called - add approval request event
              resumeEvents.push({
                type: "tool_approval_required",
                approval_id: approvalId,
                tool_name: toolName,
                tool_input: toolInput,
                parameter_schema: parameterSchema as import("@/lib/types").RJSFSchema | undefined
              })
              // Mark as pending in approval state
              setPendingApprovals(prev => {
                const newMap = new Map(prev)
                newMap.set(approvalId, null) // null = pending
                return newMap
              })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, events: [...resumeEvents] }
                    : m
                )
              )
            },
          },
          accessToken,
          modifiedParams,
          abortControllerRef.current?.signal
        )

        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error calling approveTool:', error)
      // Revert on error
      setPendingApprovals(prev => {
        const newMap = new Map(prev)
        newMap.set(approvalId, null)
        return newMap
      })
      setIsLoading(false)
    }
  }, [getAccessToken])

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0
  const userId = user?.id

  // Build context for API calls
  const chatContext: ChatContext = React.useMemo(() => ({
    enabledProviderIds,
    enabledAppIds,
    responseStyle,
    autoIncludeContext,
    selectedModel,
  }), [enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel])

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
      // Use message as title (up to 2000 chars, UI handles display truncation)
      sessionId = await createSession(content.slice(0, 2000))
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

    // Store assistant ID for potential reconnection
    currentAssistantIdRef.current = assistantId
    currentStreamIdRef.current = null // Will be set when stream starts

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
        onStreamId: (streamId) => {
          // Store stream ID for potential reconnection after navigation
          currentStreamIdRef.current = streamId
        },
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
        onToolApprovalRequired: (approvalId, toolName, toolInput, parameterSchema) => {
          // Add approval request event for UI display (with optional schema for editable form)
          events.push({
            type: "tool_approval_required",
            approval_id: approvalId,
            tool_name: toolName,
            tool_input: toolInput,
            parameter_schema: parameterSchema as import("@/lib/types").RJSFSchema | undefined
          })
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
          // Push each content chunk as an event - like thinking, content appears inline
          // We push the chunk content so we can track WHERE in the sequence it appeared
          finalContent += chunk
          events.push({ type: "content", content: chunk })

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: finalContent, events: [...events] }
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

  const handleStop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
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
                  : "Link your AdMob account to begin."}
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
                onStop={handleStop}
                disabled={!hasProviders}
                isLoading={isLoading}
                placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                providers={providers}
              />
            </div>
          </div>
        </div>
      ) : (
        /* With messages - content scrolls behind sticky input */
        <>
          <div className="flex-1 pb-20">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onToolApproval={handleToolApproval}
              pendingApprovals={pendingApprovals}
            />
          </div>

          {/* Sticky Input at bottom - content scrolls behind it */}
          <div className="sticky bottom-0 z-50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-t border-border/30 px-4 py-4">
            <div className="max-w-3xl mx-auto w-full">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStop}
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
