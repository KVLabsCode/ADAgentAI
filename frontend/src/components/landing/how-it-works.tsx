"use client"

import { Link2, MessageSquare, TrendingUp } from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Connect",
    description: "Link your AdMob account via secure OAuth. Read-only access means your credentials are never stored.",
    icon: Link2,
  },
  {
    step: "02",
    title: "Ask",
    description: "Query in natural language. \"What was my eCPM by country last week?\" or \"Set up an A/B test.\"",
    icon: MessageSquare,
  },
  {
    step: "03",
    title: "Insights",
    description: "Get instant answers, run experiments, optimize waterfalls. Dangerous operations require approval.",
    icon: TrendingUp,
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              How it works
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight">
              From dashboards to conversation
            </h2>
          </div>

          {/* Steps - Horizontal on desktop */}
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((item, index) => (
              <div key={item.step} className="relative text-center md:text-left">
                {/* Connector line - gradient fades at edges */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[3rem] w-[calc(100%-1rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                )}

                <div className="space-y-4">
                  {/* Icon */}
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <span className="hidden md:inline text-[10px] font-mono text-muted-foreground/70">
                        {item.step}
                      </span>
                      <h3 className="text-lg font-medium">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
