"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "1 connected account",
      "50 queries per month",
      "Basic reporting",
      "7-day chat history",
      "Community support",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For power users and small teams",
    features: [
      "5 connected accounts",
      "Unlimited queries",
      "Advanced analytics",
      "Unlimited chat history",
      "Export to PDF/CSV",
      "Priority support",
      "Custom reports",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For agencies and large teams",
    features: [
      "Unlimited accounts",
      "Unlimited queries",
      "Advanced analytics",
      "Unlimited chat history",
      "API access",
      "SSO & SAML",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@adagent.ai",
    highlighted: false,
  },
]

const faqs = [
  {
    question: "What happens after the free trial?",
    answer: "After your 14-day free trial, you can continue using the Free plan or upgrade to Pro for more features. No credit card required to start.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and are prorated.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards through our payment processor, Polar. Enterprise customers can also pay via invoice.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use read-only OAuth access to your ad platforms. Your credentials are never stored, and all data is encrypted in transit.",
  },
]

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            {/* Early Access Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Free during Early Access</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Simple, transparent pricing
            </h1>

            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start for free, upgrade when you need more. All plans include core AI features.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-lg border p-5 flex flex-col ${
                    tier.highlighted
                      ? "border-foreground/20 bg-foreground/[0.02] dark:bg-foreground/[0.03]"
                      : "border-border/50"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="px-2 py-0.5 rounded-full bg-foreground text-background text-[10px] font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 mb-5">
                    <h3 className="text-sm font-medium">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold tracking-tight">{tier.price}</span>
                      <span className="text-xs text-muted-foreground">/{tier.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={tier.highlighted ? "default" : "outline"}
                    size="sm"
                    className="w-full h-8 text-xs"
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-base font-medium text-center mb-8">
              Frequently asked questions
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="space-y-1.5">
                  <h3 className="text-xs font-medium">{faq.question}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Questions about pricing?
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="mailto:support@adagent.ai">Contact us</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
