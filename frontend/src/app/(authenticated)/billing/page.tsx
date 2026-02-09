"use client"

import * as React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "@/atoms/button"
import { Skeleton } from "@/atoms/skeleton"
import {
  PageContainer,
  PageHeader,
  StatusMessage,
} from "@/organisms/theme"
import { useBilling } from "@/hooks/useBilling"
import { PlanCards, RecentInvoicesCard } from "@/components/billing"
import { useUser } from "@/contexts/user-context"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface UsageData {
  queries: number       // Number of user messages
  toolCalls: number     // Number of MCP tools executed
  tokens: number        // Total tokens used
  cost: number          // Estimated cost in USD
  limits: {
    queries: number
    tokens: number
  }
  isPro: boolean
  isAdmin: boolean
  periodStart: string
  periodEnd: string
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function UsageCard({ usage, loading }: { usage: UsageData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    )
  }

  if (!usage) return null

  return (
    <div className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Stats row - inline */}
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Queries</p>
            <p className="text-base font-semibold tabular-nums">{usage.queries}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Tool Calls</p>
            <p className="text-base font-semibold tabular-nums">{usage.toolCalls}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Tokens</p>
            <p className="text-base font-semibold tabular-nums">{formatTokens(usage.tokens)}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Cost</p>
            <p className="text-base font-semibold tabular-nums">${usage.cost.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress or period info */}
        <div className="flex items-center gap-4">
          {!usage.isPro && usage.limits.queries > 0 && (
            <div className="w-32">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Quota</span>
                <span>{Math.round((usage.queries / usage.limits.queries) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    (usage.queries / usage.limits.queries) >= 0.9 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${Math.min((usage.queries / usage.limits.queries) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">
            Resets {new Date(usage.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  )
}

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

  const { getAccessToken } = useUser()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await authFetch(`${API_URL}/api/billing/usage`, token)
        if (res.ok) {
          const data = await res.json()
          setUsage(data)
        }
      } catch (err) {
        console.error("Failed to fetch usage:", err)
      } finally {
        setUsageLoading(false)
      }
    }
    fetchUsage()
  }, [getAccessToken])

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
        <PageHeader
          title="Billing"
          description="Manage your subscription and view usage."
        />

        {/* Error card */}
        <div className="mt-6 rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] px-[var(--item-padding-x)] py-8">
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader
          title="Billing"
          description="Manage your subscription and view usage."
        />
        <Link
          href="/pricing"
          className="flex items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          All plans
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Usage stats */}
      <UsageCard usage={usage} loading={usageLoading} />

      {/* Plan cards - two column grid */}
      <div className="mt-6">
        <PlanCards
          isPro={isPro}
          isUpgrading={isUpgrading}
          onUpgrade={handleUpgrade}
        />
      </div>

      {/* Recent invoices */}
      <div className="mt-6">
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
