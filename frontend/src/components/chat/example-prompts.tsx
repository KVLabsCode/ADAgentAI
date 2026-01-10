"use client"

import { cn } from "@/lib/utils"

interface ExamplePromptsProps {
  onPromptClick: (prompt: string) => void
}

const examplePrompts = [
  "What was my ad revenue yesterday?",
  "Show me top performing ad units this week",
  "Compare revenue between AdMob and GAM",
  "Which ad formats have the highest eCPM?",
]

export function ExamplePrompts({ onPromptClick }: ExamplePromptsProps) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {examplePrompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPromptClick(prompt)}
          className={cn(
            "text-left px-2.5 py-2 rounded-xl border border-border/30",
            "text-xs text-muted-foreground/80",
            "hover:bg-muted/50 hover:text-foreground hover:border-border/50",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
