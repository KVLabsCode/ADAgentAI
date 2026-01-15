"use client"

import { CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency, type Subscription, type Usage } from "@/lib/billing"

interface CurrentPlanCardProps {
  subscription: Subscription | null
  usage: Usage | null
  isPro: boolean
  usagePercent: number
  isOpeningPortal: boolean
  onManage: () => void
}

export function CurrentPlanCard({
  subscription,
  usage,
  isPro,
  usagePercent,
  isOpeningPortal,
  onManage,
}: CurrentPlanCardProps) {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={CreditCard}
        title="Current Plan"
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
            {isPro ? subscription?.plan?.name || 'Pro' : 'Trial'}
          </Badge>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              subscription?.cancelAtPeriodEnd ? "bg-warning" : "bg-success"
            )} />
            <span className="text-[10px] text-muted-foreground">
              {subscription?.cancelAtPeriodEnd ? 'Cancelling' : 'Active'}
            </span>
          </div>
        </div>
      </SectionCardHeader>
      <SectionCardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {isPro && subscription?.plan
                ? formatCurrency(subscription.plan.amount, subscription.plan.currency)
                : '$0'}
              <span className="text-xs text-muted-foreground font-normal">/month</span>
            </p>
            {usage && (
              <>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {usage.limit.chatMessages === -1
                    ? 'Unlimited queries'
                    : `${usage.chatMessages} of ${usage.limit.chatMessages} queries used`}
                </p>
                {usage.limit.chatMessages !== -1 && (
                  <div className="mt-2 h-1 w-32 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/70 rounded-full transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                )}
              </>
            )}
            {subscription?.currentPeriodEnd && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isPro && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={onManage}
                disabled={isOpeningPortal}
              >
                {isOpeningPortal ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3 mr-1" />
                )}
                Manage
              </Button>
            )}
          </div>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}
