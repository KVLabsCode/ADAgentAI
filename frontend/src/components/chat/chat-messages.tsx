"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : message.role === "assistant" ? (
              <AssistantMessage message={message} />
            ) : null}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground/5 border border-border/30">
              <Loader2 className="h-3 w-3 animate-spin text-foreground/50" />
            </div>
            <span className="text-xs">Thinking...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
