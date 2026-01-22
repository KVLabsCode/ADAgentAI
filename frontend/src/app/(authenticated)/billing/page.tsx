"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/atoms/button"
import { Skeleton } from "@/atoms/skeleton"
import {
  PageContainer,
  StatusMessage,
} from "@/organisms/theme"
import { useBilling } from "@/hooks/useBilling"
import { PlanCards, RecentInvoicesCard } from "@/components/billing"

function BillingContent() {
  const {
    invoices,
    isPro,
    isLoading,
    loadError,
    isUpgrading,
    statusMessage,
    handleUpgrade,
    retry,
  } = useBilling()

  if (isLoading) {
    return (
      <PageContainer>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Plan cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 mt-8">
          <Skeleton className="h-48 w-full rounded-[var(--card-radius)]" />
          <Skeleton className="h-48 w-full rounded-[var(--card-radius)]" />
        </div>

        {/* Invoices skeleton */}
        <div className="mt-8">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-16 w-full rounded-[var(--card-radius)]" />
        </div>
      </PageContainer>
    )
  }

  if (loadError) {
    return (
      <PageContainer>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[length:var(--text-title)] font-[var(--font-weight-semibold)] leading-[var(--line-height-title)]">
              Billing
            </h1>
            <p className="text-[length:var(--text-description)] leading-[var(--line-height-description)] text-[color:var(--text-color-description)]">
              For questions about billing,{" "}
              <Link href="/support" className="text-foreground hover:underline underline-offset-2">
                contact us
              </Link>
            </p>
          </div>
        </div>

        {/* Error card */}
        <div className="mt-8 rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] px-[var(--item-padding-x)] py-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-1">
              Unable to load billing
            </p>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">
              {loadError}
            </p>
            <Button size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      {/* Header - Linear style */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[length:var(--text-title)] font-[var(--font-weight-semibold)] leading-[var(--line-height-title)]">
            Billing
          </h1>
          <p className="text-[length:var(--text-description)] leading-[var(--line-height-description)] text-[color:var(--text-color-description)]">
            For questions about billing,{" "}
            <Link href="/support" className="text-foreground hover:underline underline-offset-2">
              contact us
            </Link>
          </p>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-[length:var(--text-description)] text-muted-foreground hover:text-foreground transition-colors"
        >
          All plans
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Plan cards - two column grid */}
      <div className="mt-8">
        <PlanCards
          isPro={isPro}
          isUpgrading={isUpgrading}
          onUpgrade={handleUpgrade}
        />
      </div>

      {/* Recent invoices */}
      <div className="mt-8">
        <h2 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-3">
          Recent invoices
        </h2>
        <RecentInvoicesCard invoices={invoices} />
      </div>
    </PageContainer>
  )
}

function BillingLoadingSkeleton() {
  return (
    <PageContainer>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-8">
        <Skeleton className="h-48 w-full rounded-[var(--card-radius)]" />
        <Skeleton className="h-48 w-full rounded-[var(--card-radius)]" />
      </div>
      <div className="mt-8">
        <Skeleton className="h-4 w-28 mb-3" />
        <Skeleton className="h-16 w-full rounded-[var(--card-radius)]" />
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
