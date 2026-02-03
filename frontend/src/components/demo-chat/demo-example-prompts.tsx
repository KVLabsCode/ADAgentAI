"use client"

import * as React from "react"
import { useState } from "react"
import { FlaskConical, TrendingUp, Zap, HelpCircle, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { PromptSuggestion } from "@/molecules/prompt-suggestion"
import { Button } from "@/atoms/button"

interface DemoExamplePromptsProps {
  onSelectExample: (prompt: string) => void
}

const suggestionGroups = [
  {
    label: "Create",
    icon: FlaskConical,
    highlight: "Create",
    items: [
      "Create an A/B test comparing AdMob and MAX with 50/50 split",
      "Create an experiment with 60% AdMob and 40% MAX for US users",
      "Set up a split test for Tier-1 countries, run for 14 days",
    ],
  },
  {
    label: "Insights",
    icon: TrendingUp,
    highlight: "performing",
    items: [
      "Which platform is performing better?",
      "Show me the experiment results",
      "What's the winner so far?",
    ],
  },
  {
    label: "Simulate",
    icon: Zap,
    highlight: "What if",
    items: [
      "What if we shift 20% more traffic to AdMob?",
      "Simulate increasing MAX allocation by 30%",
      "What would happen if we gave AdMob 70%?",
    ],
  },
  {
    label: "Help",
    icon: HelpCircle,
    highlight: "help",
    items: [
      "What can you help me with?",
      "Show me example commands",
      "List my experiments",
    ],
  },
]

export function DemoExamplePrompts({ onSelectExample }: DemoExamplePromptsProps) {
  const [activeCategory, setActiveCategory] = useState("")

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  )

  const showCategorySuggestions = activeCategory !== ""

  const handleBack = () => {
    setActiveCategory("")
  }

  return (
    <div className="w-full">
      {showCategorySuggestions ? (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex flex-col gap-1">
            {activeCategoryData?.items.map((suggestion) => (
              <PromptSuggestion
                key={suggestion}
                highlight={activeCategoryData.highlight}
                onClick={() => {
                  onSelectExample(suggestion)
                  setActiveCategory("")
                }}
                className="h-auto py-2.5 px-3 text-sm justify-start"
              >
                {suggestion}
              </PromptSuggestion>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {suggestionGroups.map((group) => {
            const Icon = group.icon
            return (
              <PromptSuggestion
                key={group.label}
                onClick={() => setActiveCategory(group.label)}
                className={cn(
                  "h-9 px-4 text-sm font-normal",
                  "border-border/40 bg-background hover:bg-muted/50",
                  "transition-colors duration-150"
                )}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {group.label}
              </PromptSuggestion>
            )
          })}
        </div>
      )}
    </div>
  )
}
