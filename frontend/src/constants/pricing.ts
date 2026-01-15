import type { PricingTier } from "@/lib/billing"

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Trial",
    price: "$0",
    description: "For individuals getting started",
    features: [
      "1 connected provider",
      "25 AI queries per month",
      "Basic analytics",
      "Community support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Unlimited providers",
      "Unlimited AI queries",
      "Advanced analytics",
      "Dedicated support",
      "SLA guarantees",
      "Custom integrations",
      "Team management",
      "Audit logs",
    ],
    popular: true,
  },
]
