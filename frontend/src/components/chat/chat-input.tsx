"use client"

import * as React from "react"
import { SendHorizonal, Loader2, Plug, ChevronDown, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useChatSettings, AVAILABLE_MODELS } from "@/lib/chat-settings"

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
  const [modelOpen, setModelOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const { selectedModel, setSelectedModel } = useChatSettings()

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

  // Get selected model info
  const selectedModelInfo = AVAILABLE_MODELS
    .flatMap(g => g.models)
    .find(m => m.id === selectedModel)

  return (
    <div className="space-y-2">
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

      {/* Bottom toolbar with plug icon and model selector */}
      <div className="flex items-center gap-2">
        {/* Plug icon placeholder for future provider/app selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground/60 hover:text-foreground/80"
          disabled
        >
          <Plug className="h-3.5 w-3.5" />
          <span className="sr-only">Connect providers</span>
        </Button>

        {/* Model selector */}
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground/70 hover:text-foreground/80 gap-1.5"
            >
              <Sparkles className="h-3 w-3" />
              <span>{selectedModelInfo?.name || "Select model"}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search models..." className="h-9" />
              <CommandList>
                <CommandEmpty>No models found.</CommandEmpty>
                {AVAILABLE_MODELS.map((group) => (
                  <CommandGroup key={group.provider} heading={group.provider}>
                    {group.models.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={model.id}
                        onSelect={() => {
                          setSelectedModel(model.id)
                          setModelOpen(false)
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{model.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {model.description}
                          </span>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
