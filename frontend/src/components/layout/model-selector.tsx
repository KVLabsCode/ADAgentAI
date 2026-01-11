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

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                      setOpen(false)
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
  )
}
