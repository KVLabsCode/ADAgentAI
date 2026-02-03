"use client"

import * as React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { v4 as uuid } from "uuid"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import { useDemoExperiments, useAllDemoExperiments } from "@/contexts/demo-experiments-context"
import { getDemoExperiments } from "@/lib/experiments"
import {
  matchIntent,
  quickMatchIntent,
  simulateStream,
  executeScenario,
  type ScenarioContext,
} from "@/lib/demo-chat"
import type { Message, StreamEventItem, Provider } from "@/lib/types"
import { DemoExamplePrompts } from "./demo-example-prompts"

// Mock providers for demo mode (no real providers needed)
const MOCK_PROVIDERS: Provider[] = [
  {
    id: "demo-admob",
    type: "admob",
    status: "connected",
    displayName: "Demo AdMob",
    identifiers: {
      publisherId: "pub-demo123456789",
    },
    isEnabled: true,
  },
]

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return uuid()
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

export function DemoChatContainer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newChatParam = searchParams.get('new')

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)

  // Demo experiments context
  const { addExperiment, updateExperiment } = useDemoExperiments()

  // Merge static demo experiments with context experiments
  const staticExperiments = getDemoExperiments()
  const allExperiments = useAllDemoExperiments(staticExperiments)

  // Handle ?new= param - clear URL without state reset (key prop handles remount)
  useEffect(() => {
    if (newChatParam && pathname === '/demo/chat') {
      // Clear the URL param (component remounts due to key change in page)
      window.history.replaceState({}, '', '/demo/chat')
    }
  }, [newChatParam, pathname])

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // 1. Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: content.trim(),
      createdAt: getCurrentTimestamp(),
    }

    // 2. Create assistant placeholder
    const assistantId = generateMessageId()
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: getCurrentTimestamp(),
      events: [],
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    // 3. Match intent (try quick match first)
    const quickIntent = quickMatchIntent(content)
    const { intent, extractedEntities } = quickIntent
      ? { intent: quickIntent, extractedEntities: undefined }
      : matchIntent(content)

    // 4. Build scenario context
    const scenarioContext: ScenarioContext = {
      userInput: content,
      intent,
      experiments: allExperiments,
      entities: extractedEntities,
    }

    // 5. Execute scenario to get events
    const scenarioResult = executeScenario(scenarioContext)

    // 6. Simulate streaming
    await simulateStream(
      scenarioResult.events,
      (event: StreamEventItem) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, events: [...(msg.events || []), event] }
              : msg
          )
        )
      },
      () => {
        setIsLoading(false)
        cancelRef.current = null

        // 7. Apply side effects after streaming completes
        if (scenarioResult.sideEffects) {
          if (scenarioResult.sideEffects.createExperiment) {
            addExperiment(scenarioResult.sideEffects.createExperiment)
          }
          if (scenarioResult.sideEffects.updateExperiment) {
            const { id, updates } = scenarioResult.sideEffects.updateExperiment
            updateExperiment(id, updates)
          }
        }
      }
    )
  }, [isLoading, allExperiments, addExperiment, updateExperiment])

  /**
   * Handle stopping the current stream
   */
  const handleStop = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    setIsLoading(false)

    // Mark the last assistant message as aborted
    setMessages(prev => {
      const lastIdx = prev.length - 1
      if (lastIdx >= 0 && prev[lastIdx].role === "assistant") {
        return prev.map((msg, idx) =>
          idx === lastIdx ? { ...msg, aborted: true } : msg
        )
      }
      return prev
    })
  }, [])

  /**
   * Handle example prompt selection
   */
  const handleSelectExample = useCallback((prompt: string) => {
    handleSend(prompt)
  }, [handleSend])

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="demo-chat-container">
      {!hasMessages ? (
        // Centered layout when no messages (like normal chat)
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="max-w-xl w-full space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-[length:var(--text-page-title)] font-semibold tracking-tight">
                Kovio Intelligence
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage cross-platform A/B tests using natural language
              </p>
            </div>

            <div className="w-full">
              <ChatInput
                onSend={handleSend}
                onStop={handleStop}
                disabled={false}
                isLoading={isLoading}
                placeholder="Ask about experiments, create A/B tests, or get insights..."
                providers={MOCK_PROVIDERS}
                isCentered
              >
                <DemoExamplePrompts onSelectExample={handleSelectExample} />
              </ChatInput>
            </div>
          </div>
        </div>
      ) : (
        // Messages layout (like normal chat)
        <>
          <div className="flex-1">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
            />
          </div>

          <div className="sticky bottom-0 z-50 px-4 pt-12">
            {/* Gradient fade so text fades behind */}
            <div className="absolute inset-0 bg-gradient-to-t from-background from-55% via-background/80 via-75% to-transparent pointer-events-none" />
            <div className="relative max-w-3xl mx-auto w-full pb-8">
              <ChatInput
                onSend={handleSend}
                onStop={handleStop}
                disabled={false}
                isLoading={isLoading}
                placeholder="Ask about experiments, create A/B tests, or get insights..."
                providers={MOCK_PROVIDERS}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
