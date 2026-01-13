"use client"

import * as React from "react"
import { Loader2, Bot } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { Message } from "@/lib/types"

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  onToolApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
  pendingApprovals?: Map<string, boolean | null>  // Map of approval ID -> approval state
}

export function ChatMessages({
  messages,
  isLoading,
  onToolApproval,
  pendingApprovals
}: ChatMessagesProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Check if last message is an assistant message currently streaming
  const lastMessage = messages[messages.length - 1]
  const isStreamingMessage = lastMessage?.role === "assistant" && isLoading

  // Track last message content/events for scroll trigger during streaming
  const lastMessageContent = lastMessage?.content
  const lastMessageEventsLength = lastMessage?.events?.length ?? 0

  // Scroll to bottom on new messages or when content updates
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading, lastMessageContent, lastMessageEventsLength])

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto py-6 px-4 md:px-0 space-y-6">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : message.role === "assistant" ? (
              <AssistantMessage
                message={message}
                onToolApproval={onToolApproval}
                pendingApprovals={pendingApprovals}
                isStreaming={message.id === lastMessage?.id && isStreamingMessage}
              />
            ) : null}
          </div>
        ))}

        {/* Show typing indicator only when loading and no streaming message with content */}
        {isLoading && !isStreamingMessage && messages.length > 0 && (
          <div className="flex gap-3">
            {/* Bot icon hidden */}
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
