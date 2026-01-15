"use client"

import * as React from "react"
import { Suspense } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  EmptyState,
  StatusMessage,
} from "@/components/ui/theme"
import { useBilling } from "@/hooks/useBilling"
import {
  CurrentPlanCard,
  PlanSelector,
  InvoiceList,
  PaymentMethodsCard,
} from "@/components/billing"

function BillingContent() {
  const {
    subscription,
    usage,
    invoices,
    isPro,
    usagePercent,
    isLoading,
    loadError,
    isUpgrading,
    isOpeningPortal,
    statusMessage,
    handleUpgrade,
    handleManageSubscription,
    retry,
  } = useBilling()

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Billing"
          description="Manage your subscription and payment methods."
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SectionCard key={i}>
              <div className="p-4 animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </SectionCard>
          ))}
        </div>
      </PageContainer>
    )
  }

  if (loadError) {
    return (
      <PageContainer>
        <PageHeader
          title="Billing"
          description="Manage your subscription and payment methods."
        />
        <SectionCard>
          <EmptyState
            icon={AlertCircle}
            title="Unable to load billing"
            description={loadError}
            className="py-12"
          >
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={retry}
            >
              Try again
            </Button>
          </EmptyState>
        </SectionCard>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      <PageHeader
        title="Billing"
        description="Manage your subscription and payment methods."
      />

      <CurrentPlanCard
        subscription={subscription}
        usage={usage}
        isPro={isPro}
        usagePercent={usagePercent}
        isOpeningPortal={isOpeningPortal}
        onManage={handleManageSubscription}
      />

      <PlanSelector
        isPro={isPro}
        isUpgrading={isUpgrading}
        onUpgrade={handleUpgrade}
      />

      {isPro && (
        <PaymentMethodsCard
          isOpeningPortal={isOpeningPortal}
          onManage={handleManageSubscription}
        />
      )}

      <InvoiceList invoices={invoices} />

      <div className="flex items-start gap-2 px-4 py-3 rounded border border-border/30 bg-muted/20">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">
            Need help with billing? Contact{" "}
            <a href="mailto:support@kovio.dev" className="text-foreground hover:underline underline-offset-2">
              support@kovio.dev
            </a>
          </p>
        </div>
      </div>
    </PageContainer>
  )
}

function BillingLoadingSkeleton() {
  return (
    <PageContainer>
      <div className="space-y-1">
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-56 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <SectionCard key={i}>
            <div className="p-4 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingLoadingSkeleton />}>
      <BillingContent />
    </Suspense>
  )
}
