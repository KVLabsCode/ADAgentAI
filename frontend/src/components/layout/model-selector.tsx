"use client"

import * as React from "react"
import { ChevronDown, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useChatSettings, AVAILABLE_MODELS } from "@/lib/chat-settings"

export function ModelSelector() {
  const [open, setOpen] = React.useState(false)
  const { selectedModel, setSelectedModel } = useChatSettings()

  // Get selected model info
  const selectedModelInfo = AVAILABLE_MODELS
    .flatMap(g => g.models)
    .find(m => m.id === selectedModel)

  // Fallback: If stored model ID doesn't match any available model, reset to default
  React.useEffect(() => {
    if (!selectedModel) {
      // No model selected (initial state), set default
      console.log("[ModelSelector] No model selected, setting default Gemini 2.5 Flash")
      setSelectedModel("openrouter/google/gemini-2.5-flash")
    } else if (!selectedModelInfo) {
      // Stored model ID doesn't exist in available models (e.g., old ID after update)
      console.log(`[ModelSelector] Stored model ID "${selectedModel}" not found in available models, resetting to default`)
      setSelectedModel("openrouter/google/gemini-2.5-flash")
    }
  }, [selectedModel, selectedModelInfo, setSelectedModel])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 gap-1.5 rounded-md border border-transparent hover:border-zinc-700/50 transition-colors"
        >
          <Sparkles className="h-3 w-3 text-zinc-400" />
          <span className="font-medium">{selectedModelInfo?.name || "Gemini 2.5 Flash"}</span>
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 rounded-lg border-zinc-700/50 bg-zinc-900/95 backdrop-blur-sm" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search models..." className="h-9 border-b border-zinc-700/50 text-sm" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-4 text-xs text-zinc-500">No models found.</CommandEmpty>
            {AVAILABLE_MODELS.map((group) => (
              <CommandGroup key={group.provider} heading={group.provider} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {group.models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => {
                      setSelectedModel(model.id)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between px-2 py-2 rounded-md mx-1 cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-zinc-200">{model.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {model.description}
                      </span>
                    </div>
                    {selectedModel === model.id && (
                      <Check className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
