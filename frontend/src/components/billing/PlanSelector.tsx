"use client"

import { CreditCard, Crown, Zap, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PRICING_TIERS } from "@/constants/pricing"

interface PlanSelectorProps {
  isPro: boolean
  isUpgrading: string | null
  onUpgrade: (priceId?: string) => void
}

export function PlanSelector({ isPro, isUpgrading, onUpgrade }: PlanSelectorProps) {
  return (
    <div>
      <h2 className="text-sm font-medium mb-3">Available Plans</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {PRICING_TIERS.map((tier) => {
          const isCurrent = (tier.name === 'Trial' && !isPro) || (tier.name !== 'Trial' && isPro)
          const canUpgrade = false // No automatic upgrades available
          const isUpgradingThis = isUpgrading === tier.priceId

          return (
            <div
              key={tier.name}
              className={cn(
                "rounded border p-4",
                tier.popular
                  ? "border-foreground/30"
                  : "border-border/30",
                isCurrent && "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {tier.name === "Enterprise" ? (
                    <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : tier.popular ? (
                    <Zap className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{tier.name}</span>
                </div>
                {tier.popular && !isCurrent && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                    Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                    Current
                  </Badge>
                )}
              </div>
              <div className="mb-2">
                <span className="text-lg font-semibold">{tier.price}</span>
                {tier.price !== "Custom" && (
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">{tier.description}</p>
              <ul className="space-y-1 mb-3">
                {tier.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Check className="h-2.5 w-2.5 text-success shrink-0" />
                    {feature}
                  </li>
                ))}
                {tier.features.length > 3 && (
                  <li className="text-[10px] text-muted-foreground">
                    +{tier.features.length - 3} more
                  </li>
                )}
              </ul>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                variant={isCurrent ? "outline" : tier.popular ? "default" : "outline"}
                disabled={isCurrent || isUpgradingThis || (tier.name === 'Enterprise')}
                onClick={() => canUpgrade && onUpgrade(tier.priceId)}
              >
                {isUpgradingThis ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Upgrading...
                  </>
                ) : isCurrent ? (
                  "Current"
                ) : tier.name === "Enterprise" ? (
                  "Contact"
                ) : (
                  "Upgrade"
                )}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
