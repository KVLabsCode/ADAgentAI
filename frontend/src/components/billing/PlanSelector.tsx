"use client"

import * as React from "react"
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

interface PlanCardProps {
  tier: (typeof PRICING_TIERS)[number]
  isCurrent: boolean
  isUpgrading: boolean
  onUpgrade: () => void
}

/**
 * Get button text based on plan state.
 */
function getButtonText(
  tierName: string,
  isCurrent: boolean,
  isUpgrading: boolean
): React.ReactNode {
  if (isUpgrading) {
    return (
      <>
        <Spinner size="xs" />
        Upgrading...
      </>
    )
  }
  if (isCurrent) return "Current plan"
  if (tierName === "Enterprise") return "Contact sales"
  return "Upgrade"
}

/**
 * Get button variant based on plan state.
 */
function getButtonVariant(
  isCurrent: boolean,
  isPopular: boolean
): "default" | "outline" {
  if (isCurrent) return "outline"
  return isPopular ? "default" : "outline"
}

/**
 * Individual plan card component.
 * Memoized to prevent re-renders when sibling cards change.
 */
const PlanCard = React.memo(function PlanCard({
  tier,
  isCurrent,
  isUpgrading,
  onUpgrade,
}: PlanCardProps) {
  const isEnterprise = tier.name === "Enterprise"
  const showPopularBadge = tier.popular && !isCurrent

  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)]",
        "px-[var(--item-padding-x)] py-[var(--item-padding-y)]",
        showPopularBadge && "border-primary/30"
      )}
    >
      {/* Header with plan name and badge */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
            {tier.name}
          </span>
          {isCurrent ? (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              Current
            </Badge>
          ) : null}
          {showPopularBadge ? (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 border-primary/50 text-primary"
            >
              Popular
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Price */}
      <div className="mb-2">
        <span className="text-xl font-semibold">{tier.price}</span>
        {tier.price !== "Custom" ? (
          <span className="text-[length:var(--text-description)] text-muted-foreground">
            /mo
          </span>
        ) : null}
      </div>

      {/* Description */}
      <p className="text-[length:var(--text-description)] text-[color:var(--text-color-description)] mb-4">
        {tier.description}
      </p>

      {/* Features list */}
      <ul className="space-y-1.5 flex-1">
        {tier.features.slice(0, 4).map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-[length:var(--text-description)] text-muted-foreground"
          >
            <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {feature}
          </li>
        ))}
        {tier.features.length > 4 ? (
          <li className="text-[length:var(--text-description)] text-muted-foreground pl-5">
            +{tier.features.length - 4} more
          </li>
        ) : null}
      </ul>

      {/* Action button - pushed to bottom */}
      <Button
        size="sm"
        className="w-full mt-4"
        variant={getButtonVariant(isCurrent, tier.popular ?? false)}
        disabled={isCurrent || isUpgrading || isEnterprise}
        onClick={onUpgrade}
      >
        {getButtonText(tier.name, isCurrent, isUpgrading)}
      </Button>
    </div>
  )
})

/**
 * Linear-style two-column plan cards.
 */
export function PlanCards({ isPro, isUpgrading, onUpgrade }: PlanCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRICING_TIERS.map((tier) => {
        const isCurrent =
          (tier.name === "Trial" && !isPro) || (tier.name !== "Trial" && isPro)
        const isUpgradingThis = isUpgrading === tier.priceId

        return (
          <PlanCard
            key={tier.name}
            tier={tier}
            isCurrent={isCurrent}
            isUpgrading={isUpgradingThis}
            onUpgrade={() => onUpgrade(tier.priceId)}
          />
        )
      })}
    </div>
  )
}
