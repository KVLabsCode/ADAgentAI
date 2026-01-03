"use client"

import * as React from "react"
import { SendHorizonal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Type your message...",
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
          "min-h-[44px] max-h-[200px] resize-none pr-12 py-2.5 text-sm",
          "rounded-lg border-border/40",
          "focus-visible:ring-1 focus-visible:ring-ring/50",
          "placeholder:text-muted-foreground/60",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || isLoading || !value.trim()}
        className={cn(
          "absolute right-1.5 bottom-1.5 h-7 w-7 rounded-md",
          "transition-opacity duration-150",
          value.trim() && !disabled && !isLoading
            ? "opacity-100"
            : "opacity-40"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <SendHorizonal className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}
