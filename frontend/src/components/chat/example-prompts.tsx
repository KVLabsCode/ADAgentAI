"use client"

import { useState } from "react"
import { PromptSuggestion } from "@/molecules/prompt-suggestion"
import { Button } from "@/atoms/button"
import { cn } from "@/lib/utils"
import { DollarSign, TrendingUp, Lightbulb, Wrench, ChevronLeft } from "lucide-react"

interface ExamplePromptsProps {
  onPromptClick: (prompt: string) => void
}

const suggestionGroups = [
  {
    label: "Revenue",
    icon: DollarSign,
    highlight: "revenue",
    items: [
      "What was my revenue yesterday?",
      "Show me revenue trends this month",
      "Compare revenue between my apps",
      "Which days had the highest revenue?",
    ],
  },
  {
    label: "Performance",
    icon: TrendingUp,
    highlight: "performing",
    items: [
      "Show me top performing ad units",
      "Which ad formats have the highest eCPM?",
      "What's my fill rate this week?",
      "Top performing apps by impressions",
    ],
  },
  {
    label: "Insights",
    icon: Lightbulb,
    highlight: "How",
    items: [
      "How can I improve my eCPM?",
      "How do my metrics compare to last month?",
      "How are banner ads performing vs interstitials?",
      "How much did I earn from rewarded ads?",
    ],
  },
  {
    label: "Actions",
    icon: Wrench,
    highlight: "Create",
    items: [
      "Create a new mediation group",
      "Create a new ad unit for my app",
      "Create a rewarded ad placement",
      "Create a banner ad unit",
    ],
  },
]

export function ExamplePrompts({ onPromptClick }: ExamplePromptsProps) {
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
                  onPromptClick(suggestion)
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
