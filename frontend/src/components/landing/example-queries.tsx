"use client"

import * as React from "react"
import { BarChart3, Layers, FlaskConical, FolderTree } from "lucide-react"

const categories = [
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    queries: [
      "What was my revenue yesterday by app?",
      "Show me eCPM trends for the past week",
      "Which ad format is performing best?",
      "Compare network performance for my apps",
    ],
  },
  {
    id: "mediation",
    label: "Mediation",
    icon: Layers,
    queries: [
      "Compare mediation network performance",
      "What ad sources are available?",
      "Set up a mediation group with AppLovin",
      "Show adapters for ironSource",
    ],
  },
  {
    id: "testing",
    label: "A/B Testing",
    icon: FlaskConical,
    queries: [
      "Run an A/B test on my waterfall",
      "What was the experiment performance?",
      "Apply the winning variant",
      "Stop the banner experiment",
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: FolderTree,
    queries: [
      "List all my apps and ad units",
      "Create a new rewarded ad unit",
      "Show ad units by format",
      "What apps are pending approval?",
    ],
  },
]

export function ExampleQueriesSection() {
  const [activeTab, setActiveTab] = React.useState("analytics")
  const activeCategory = categories.find((c) => c.id === activeTab) || categories[0]

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              Capabilities
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-3">
              Ask anything about your ad business
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Revenue analytics, waterfall optimization, A/B testing, and more.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-col items-center gap-2 mb-10">
            <div className="flex justify-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                    activeTab === cat.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              ))}
            </div>
            <span className="sm:hidden text-xs text-muted-foreground">{activeCategory.label}</span>
          </div>

          {/* Queries */}
          <div className="grid sm:grid-cols-2 gap-3">
            {activeCategory.queries.map((query, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border/30 bg-background/50 hover:bg-background transition-colors"
              >
                <p className="text-sm leading-relaxed">{query}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            ...and hundreds more queries across 20+ API endpoints
          </p>
        </div>
      </div>
    </section>
  )
}
