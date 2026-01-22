"use client"

import { Check } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import { PRICING_TIERS } from "@/constants/pricing"

interface PlanCardsProps {
  isPro: boolean
  isUpgrading: string | null
  onUpgrade: (priceId?: string) => void
}

// Linear-style two-column plan cards
export function PlanCards({ isPro, isUpgrading, onUpgrade }: PlanCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRICING_TIERS.map((tier) => {
        const isCurrent = (tier.name === 'Trial' && !isPro) || (tier.name !== 'Trial' && isPro)
        const canUpgrade = false // No automatic upgrades available
        const isUpgradingThis = isUpgrading === tier.priceId

        return (
          <div
            key={tier.name}
            className={cn(
              "rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)]",
              "px-[var(--item-padding-x)] py-[var(--item-padding-y)]",
              tier.popular && !isCurrent && "border-primary/30"
            )}
          >
            {/* Header with plan name and badge */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
                  {tier.name}
                </span>
                {isCurrent && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    Current
                  </Badge>
                )}
                {tier.popular && !isCurrent && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/50 text-primary">
                    Popular
                  </Badge>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="mb-2">
              <span className="text-xl font-semibold">{tier.price}</span>
              {tier.price !== "Custom" && (
                <span className="text-[length:var(--text-description)] text-muted-foreground">/mo</span>
              )}
            </div>

            {/* Description */}
            <p className="text-[length:var(--text-description)] text-[color:var(--text-color-description)] mb-4">
              {tier.description}
            </p>

            {/* Features list */}
            <ul className="space-y-1.5 mb-4">
              {tier.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[length:var(--text-description)] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {feature}
                </li>
              ))}
              {tier.features.length > 4 && (
                <li className="text-[length:var(--text-description)] text-muted-foreground pl-5">
                  +{tier.features.length - 4} more
                </li>
              )}
            </ul>

            {/* Action button */}
            <Button
              size="sm"
              className="w-full"
              variant={isCurrent ? "outline" : tier.popular ? "default" : "outline"}
              disabled={isCurrent || isUpgradingThis || (tier.name === 'Enterprise')}
              onClick={() => canUpgrade && onUpgrade(tier.priceId)}
            >
              {isUpgradingThis ? (
                <>
                  <Spinner size="xs" />
                  Upgrading...
                </>
              ) : isCurrent ? (
                "Current plan"
              ) : tier.name === "Enterprise" ? (
                "Contact sales"
              ) : (
                "Upgrade"
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
