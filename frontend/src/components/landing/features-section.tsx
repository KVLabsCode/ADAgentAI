"use client"

import { Sparkles, Zap, ShieldCheck, Database, RefreshCw, Users2 } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Natural Language",
    description: "Ask questions like you'd ask a colleague who knows your data.",
  },
  {
    icon: Zap,
    title: "Real-time Data",
    description: "Direct API connection. Always fresh, never cached reports.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop",
    description: "All dangerous operations require your explicit approval.",
  },
  {
    icon: Database,
    title: "10+ Ad Networks",
    description: "AppLovin, Unity, ironSource, Facebook, Vungle, and more.",
  },
  {
    icon: RefreshCw,
    title: "A/B Testing",
    description: "Run experiments with customizable traffic splits.",
  },
  {
    icon: Users2,
    title: "Multi-Account",
    description: "Switch between publisher accounts seamlessly.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              Features
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight">
              <span className="sm:hidden">Everything you need<br />Nothing you don&apos;t</span>
              <span className="hidden sm:inline">Everything you need, nothing you don&apos;t</span>
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="h-9 w-9 shrink-0 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
