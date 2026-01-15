"use client"

import { CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"

interface PaymentMethodsCardProps {
  isOpeningPortal: boolean
  onManage: () => void
}

export function PaymentMethodsCard({ isOpeningPortal, onManage }: PaymentMethodsCardProps) {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={CreditCard}
        title="Payment Methods"
        description="Manage payment methods in the billing portal."
      >
        <Button
          size="sm"
          variant="outline"
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
      </SectionCardHeader>
      <SectionCardContent>
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 rounded border border-border/30 bg-muted/30 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Payment methods are managed through Polar
            </p>
            <p className="text-[10px] text-muted-foreground">
              Click &quot;Manage&quot; to update your billing details
            </p>
          </div>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}
