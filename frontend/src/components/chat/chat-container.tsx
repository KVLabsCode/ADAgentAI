"use client"

import * as React from "react"
import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { ChatSettingsPanel } from "./chat-settings-panel"
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

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate API call - replace with real implementation
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "This is a simulated response. Connect to the backend to see real AI responses.",
        agentName: "AdMob Agent",
        createdAt: new Date().toISOString(),
        hasThinking: true,
        thinking: "Analyzing the user's request and determining the best approach...",
        hasToolCalls: true,
        toolCalls: [
          { name: "get_admob_stats", params: { dateRange: "last_7_days" } }
        ],
        toolResults: [
          { name: "get_admob_stats", result: { impressions: 10000, revenue: 50.00 } }
        ],
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
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
