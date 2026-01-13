"use client"

import { Lock, Eye, ShieldAlert, FileCheck } from "lucide-react"

const securityFeatures = [
  {
    icon: Lock,
    title: "Read-only OAuth",
    description: "Your credentials are never stored. We use Google's secure OAuth with minimal permissions.",
  },
  {
    icon: ShieldAlert,
    title: "LLM Guardrails",
    description: "AI cannot make unauthorized changes. Dangerous operations require approval.",
  },
  {
    icon: Eye,
    title: "Data Stays with Google",
    description: "We query APIs in real-time. Your ad data never leaves Google's servers.",
  },
  {
    icon: FileCheck,
    title: "GDPR Compliant",
    description: "Built with privacy by design. Full data control and deletion capabilities.",
  },
]

export function SecuritySection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              Security
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-3">
              Your ad revenue, protected
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Every safeguard designed with ad publishers in mind.
            </p>
          </div>

          {/* Security Features - Centered Grid */}
          <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {securityFeatures.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">{feature.title}</h3>
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
