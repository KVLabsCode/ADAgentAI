"use client"

import * as React from "react"
import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { ChatSettingsPanel } from "./chat-settings-panel"
import { streamChat } from "@/lib/api"
import type { Message, Provider } from "@/lib/types"

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
}

export function ChatContainer({ initialMessages = [], providers = [] }: ChatContainerProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [enabledProviders, setEnabledProviders] = React.useState<string[]>(
    providers.filter(p => p.status === "connected").map(p => p.id)
  )
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

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
      hasThinking: false,
      thinking: "",
      hasToolCalls: false,
      toolCalls: [],
      toolResults: [],
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    // Track accumulated state
    let thinkingText = ""
    const toolCalls: { name: string; params: Record<string, unknown> }[] = []
    const toolResults: { name: string; result: unknown }[] = []

    await streamChat(
      content,
      {
        onRouting: (service, capability) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: `${service} / ${capability}` }
                : m
            )
          )
        },
        onAgent: (agent, task) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: agent, task }
                : m
            )
          )
        },
        onThinking: (content) => {
          thinkingText += content + " "
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, hasThinking: true, thinking: thinkingText.trim() }
                : m
            )
          )
        },
        onToolCall: (tool, params) => {
          toolCalls.push({ name: tool, params })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, hasToolCalls: true, toolCalls: [...toolCalls] }
                : m
            )
          )
        },
        onToolResult: (preview, full) => {
          const lastTool = toolCalls[toolCalls.length - 1]
          if (lastTool) {
            toolResults.push({
              name: lastTool.name,
              result: full ? JSON.parse(full) : preview
            })
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, toolResults: [...toolResults] }
                  : m
              )
            )
          }
        },
        onResult: (content) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content }
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
        },
        onDone: () => {
          setIsLoading(false)
        },
      },
      abortControllerRef.current.signal
    )

    setIsLoading(false)
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleToggleProvider = (providerId: string) => {
    setEnabledProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    )
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        onSettingsClick={() => setSettingsOpen(true)}
        hasProviders={hasProviders}
      />

      <ChatSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        providers={providers}
        enabledProviders={enabledProviders}
        onToggleProvider={handleToggleProvider}
      />

      <div className="flex-1 overflow-hidden">
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full space-y-5">
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

              {hasProviders && (
                <ExamplePrompts onPromptClick={handlePromptClick} />
              )}

              <div className="max-w-lg mx-auto w-full">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!hasProviders}
                  isLoading={isLoading}
                  placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <ChatMessages messages={messages} isLoading={isLoading} />
            <div className="border-t border-border/30 p-3">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!hasProviders}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
