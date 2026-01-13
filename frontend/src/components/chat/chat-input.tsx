"use client"

import * as React from "react"
import { SendHorizonal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ContextSettings } from "./context-settings"
import type { Provider } from "@/lib/types"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
  providers?: Provider[]
}

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Type your message...",
  providers = [],
}: ChatInputProps) {
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || disabled || isLoading) return
    onSend(value.trim())
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          "min-h-[54px] max-h-[200px] resize-none pl-12 pr-8 py-4 text-base",
          "rounded-3xl border-border/50 bg-zinc-800/40",
          "focus-visible:ring-1 focus-visible:ring-zinc-600/60 focus-visible:border-zinc-600/60",
          "placeholder:text-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      {/* Context settings icon - bottom left */}
      <div className="absolute left-3.5 bottom-3.5">
        <ContextSettings providers={providers} />
      </div>
      {/* Send button - bottom right */}
      <Button
        type="submit"
        size="icon"
        disabled={disabled || isLoading || !value.trim()}
        className={cn(
          "absolute right-2.5 bottom-2.5 h-9 w-9 rounded-full",
          "transition-all duration-150",
          value.trim() && !disabled && !isLoading
            ? "opacity-100 bg-zinc-600 hover:bg-zinc-500"
            : "opacity-30 bg-zinc-700"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizonal className="h-4 w-4" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}
