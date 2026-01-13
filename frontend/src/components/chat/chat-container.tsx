"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { streamChat, approveTool, pollForStreamResult, type ChatHistoryMessage, type ChatContext } from "@/lib/api"
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
        setIsHydrated(true)
        return
      }
    }

    // Case 2: New chat page, restore from localStorage if available
    if (!initialSessionId && saved && saved.messages.length > 0) {
      setMessages(saved.messages)
      setCurrentSessionId(saved.sessionId)
      // Update URL to match the restored session
      if (saved.sessionId) {
        window.history.replaceState(null, '', `/chat/${saved.sessionId}`)
      }
      setIsHydrated(true)
      return
    }

    // Case 3: Use server data (or empty for new chat)
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

  // Handle tool approval from user - calls backend API and updates local state
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

      // If approved and we have a stream ID, poll for result after a delay
      // This handles cases where SSE stream stalls or disconnects
      if (approved && currentStreamIdRef.current && currentAssistantIdRef.current) {
        const streamId = currentStreamIdRef.current
        const assistantId = currentAssistantIdRef.current

        // Always poll after a short delay as fallback (SSE might have stalled)
        console.log(`[ChatContainer] Approval succeeded, will poll for result in 3s: ${streamId}`)

        // Wait 3 seconds to give SSE a chance, then poll if still no result
        setTimeout(async () => {
          // Check if message already has content (SSE delivered it)
          const currentMessages = await new Promise<Message[]>(resolve => {
            setMessages(prev => { resolve(prev); return prev })
          })
          const msg = currentMessages.find(m => m.id === assistantId)

          // If message still has no meaningful content, poll for result
          if (!msg?.content || msg.content.length < 50) {
            console.log(`[ChatContainer] No result via SSE, polling: ${streamId}`)
            pollForStreamResult(streamId, 30, 2000).then(streamResult => {
              if (streamResult?.status === "done" && streamResult.result) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: streamResult.result || m.content }
                      : m
                  )
                )
                setIsLoading(false)
              }
            })
          }
        }, 3000)

        // Legacy: If not currently loading (stream fully disconnected), poll immediately
        if (!isLoading) {
          console.log(`[ChatContainer] Stream already disconnected, polling now: ${streamId}`)

          // Show loading state
          setIsLoading(true)

          // Poll for result in background
          pollForStreamResult(streamId, 30, 2000).then(streamResult => {
            setIsLoading(false)

            if (streamResult?.status === "done" && streamResult.result) {
              // Update the assistant message with the result
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: streamResult.result || m.content }
                    : m
                )
              )
            } else if (streamResult?.error) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${streamResult.error}` }
                    : m
                )
              )
            }
          }).catch(err => {
            console.error('[ChatContainer] Error polling for result:', err)
            setIsLoading(false)
          })
        }
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
  }, [isLoading])

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
          <div className="sticky bottom-0 z-50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-t border-border/30 px-8 sm:px-12 py-3">
            <div className="max-w-4xl mx-auto w-full">
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
