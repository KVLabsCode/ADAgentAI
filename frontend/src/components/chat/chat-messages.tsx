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
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Check if last message is an empty assistant message (streaming in progress)
  const lastMessage = messages[messages.length - 1]
  const isStreaming = lastMessage?.role === "assistant" && !lastMessage.content && isLoading

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : message.role === "assistant" ? (
              <AssistantMessage message={message} />
            ) : null}
          </div>
        ))}

        {/* Show typing indicator only when loading and no streaming message */}
        {isLoading && !isStreaming && messages.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
