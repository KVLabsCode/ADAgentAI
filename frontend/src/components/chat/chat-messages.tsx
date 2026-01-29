"use client"

import * as React from "react"
import { useStickToBottom } from "use-stick-to-bottom"
import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { Message } from "@/lib/types"

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  onToolApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
  pendingApprovals?: Map<string, boolean | null>
}

export function ChatMessages({
  messages,
  isLoading,
  onToolApproval,
  pendingApprovals
}: ChatMessagesProps) {
  // Smart auto-scroll using use-stick-to-bottom
  // Automatically scrolls to bottom on new content, stops when user scrolls up
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: "smooth",
    initial: "smooth",
  })

  // Check if last message is an assistant message currently streaming
  const lastMessage = messages[messages.length - 1]
  const isStreamingMessage = lastMessage?.role === "assistant" && isLoading

  return (
    <div className="relative h-full overflow-hidden">
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
      >
        <div
          ref={contentRef}
          className="max-w-3xl mx-auto pt-12 pb-6 px-4 md:px-0 space-y-6"
        >
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
              <div className="flex items-center gap-2 py-2">
                <Spinner size="xs" className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button - shown when user scrolls up */}
      {!isAtBottom && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "rounded-full shadow-lg",
              "bg-background/90 backdrop-blur-sm border border-border",
              "hover:bg-background"
            )}
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="h-4 w-4 mr-1" />
            <span className="text-xs">New messages</span>
          </Button>
        </div>
      )}
    </div>
  )
}
