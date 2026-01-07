"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  FileText,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PricingTier {
  name: string
  price: string
  priceId?: string
  description: string
  features: string[]
  popular?: boolean
}

interface Subscription {
  hasSubscription: boolean
  status: string
  plan: {
    id: string
    name: string
    amount: number
    currency: string
    interval: string
  } | null
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  customerId?: string
}

interface Usage {
  chatMessages: number
  providerQueries: number
  limit: {
    chatMessages: number
    providerQueries: number
  }
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  product: string
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals getting started",
    features: [
      "1 connected provider",
      "50 AI queries per month",
      "Basic analytics",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    priceId: process.env.NEXT_PUBLIC_POLAR_PRO_PRICE_ID,
    description: "For growing publishers",
    features: [
      "Unlimited providers",
      "Unlimited AI queries",
      "Advanced analytics",
      "Priority support",
      "Export reports",
      "Custom agents",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "SLA guarantees",
      "Custom integrations",
      "Team management",
      "Audit logs",
    ],
  },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Polar amounts are in cents
}

function BillingContent() {
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const { getAccessToken } = useUser()
  const [subscription, setSubscription] = React.useState<Subscription | null>(null)
  const [usage, setUsage] = React.useState<Usage | null>(null)
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = React.useState<string | null>(null)
  const [isOpeningPortal, setIsOpeningPortal] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch billing data
  const fetchBillingData = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      const [subRes, usageRes, invoicesRes] = await Promise.all([
        authFetch(`${API_URL}/api/billing/subscription`, accessToken),
        authFetch(`${API_URL}/api/billing/usage`, accessToken),
        authFetch(`${API_URL}/api/billing/invoices`, accessToken),
      ])

      if (subRes.ok) {
        setSubscription(await subRes.json())
      }
      if (usageRes.ok) {
        setUsage(await usageRes.json())
      }
      if (invoicesRes.ok) {
        const data = await invoicesRes.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
      setLoadError('Failed to connect to billing service. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken])

  React.useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  // Handle success/error from checkout redirect
  React.useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      setStatusMessage({ type: 'success', text: 'Subscription activated successfully!' })
      fetchBillingData()
      window.history.replaceState({}, '', '/billing')
    } else if (error) {
      setStatusMessage({ type: 'error', text: 'Checkout failed. Please try again.' })
      window.history.replaceState({}, '', '/billing')
    }

    if (success || error) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, fetchBillingData])

  const handleUpgrade = async (priceId?: string) => {
    if (!priceId) return
    setIsUpgrading(priceId)
    try {
      const accessToken = await getAccessToken()
      const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
      const response = await authFetch(`${API_URL}/api/billing/checkout`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ priceId, theme }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create checkout (${response.status})`)
      }

      const { checkoutUrl } = await response.json()
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Checkout error:', error)
      const message = error instanceof Error ? error.message : 'Failed to start checkout'
      setStatusMessage({ type: 'error', text: message.includes('fetch') ? 'Backend API not running. Please start the server.' : message })
      setIsUpgrading(null)
    }
  }

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true)
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/billing/portal`, accessToken, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to get portal URL')

      const { portalUrl } = await response.json()
      window.location.href = portalUrl
    } catch (error) {
      console.error('Portal error:', error)
      setStatusMessage({ type: 'error', text: 'Failed to open billing portal. Please try again.' })
      setIsOpeningPortal(false)
    }
  }

  const isPro = subscription?.hasSubscription && subscription.status === 'active'
  const usagePercent = usage ? Math.min((usage.chatMessages / (usage.limit.chatMessages || 1)) * 100, 100) : 0

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
        <div className="space-y-0.5">
          <h1 className="text-base font-medium tracking-tight">Billing</h1>
          <p className="text-xs text-muted-foreground/80">
            Manage your subscription and payment methods.
          </p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded border border-border/30 p-3 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
        <div className="space-y-0.5">
          <h1 className="text-base font-medium tracking-tight">Billing</h1>
          <p className="text-xs text-muted-foreground/80">
            Manage your subscription and payment methods.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-red-500/10 p-3 mb-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-foreground/80 mb-1">Unable to load billing</p>
          <p className="text-xs text-muted-foreground/70 mb-4 max-w-sm">{loadError}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setLoadError(null)
              setIsLoading(true)
              fetchBillingData()
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      {/* Status Message */}
      {statusMessage && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-xs",
          statusMessage.type === 'success'
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {statusMessage.text}
        </div>
      )}

      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Billing</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your subscription and payment methods.
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium">Current Plan</h2>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              {isPro ? subscription?.plan?.name || 'Pro' : 'Free'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              subscription?.cancelAtPeriodEnd ? "bg-amber-500/80" : "bg-green-500/80"
            )} />
            <span className="text-[10px] text-muted-foreground/60">
              {subscription?.cancelAtPeriodEnd ? 'Cancelling' : 'Active'}
            </span>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {isPro && subscription?.plan
                  ? formatCurrency(subscription.plan.amount, subscription.plan.currency)
                  : '$0'}
                <span className="text-xs text-muted-foreground/60 font-normal">/month</span>
              </p>
              {usage && (
                <>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {usage.limit.chatMessages === -1
                      ? 'Unlimited queries'
                      : `${usage.chatMessages} of ${usage.limit.chatMessages} queries used`}
                  </p>
                  {usage.limit.chatMessages !== -1 && (
                    <div className="mt-2 h-1 w-32 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  )}
                </>
              )}
              {subscription?.currentPeriodEnd && (
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isPro && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleManageSubscription}
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
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xs font-medium mb-2">Available Plans</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = (tier.name === 'Free' && !isPro) || (tier.name === 'Pro' && isPro)
            const canUpgrade = tier.name === 'Pro' && !isPro && tier.priceId
            const isUpgradingThis = isUpgrading === tier.priceId

            return (
              <div
                key={tier.name}
                className={cn(
                  "rounded border px-3 py-2.5",
                  tier.popular
                    ? "border-primary/50 bg-primary/[0.02]"
                    : "border-border/30",
                  isCurrent && "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {tier.name === "Enterprise" ? (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    ) : tier.popular ? (
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span className="text-sm font-medium">{tier.name}</span>
                  </div>
                  {tier.popular && !isCurrent && (
                    <Badge className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-0">
                      Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-border/40">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="mb-1.5">
                  <span className="text-lg font-semibold">{tier.price}</span>
                  {tier.price !== "Custom" && (
                    <span className="text-[10px] text-muted-foreground/60">/mo</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mb-2">{tier.description}</p>
                <ul className="space-y-1 mb-2.5">
                  {tier.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                      <Check className="h-2.5 w-2.5 text-green-500/70 shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {tier.features.length > 3 && (
                    <li className="text-[10px] text-muted-foreground/50">
                      +{tier.features.length - 3} more
                    </li>
                  )}
                </ul>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  variant={isCurrent ? "outline" : tier.popular ? "default" : "outline"}
                  disabled={isCurrent || isUpgradingThis || (tier.name === 'Enterprise')}
                  onClick={() => canUpgrade && handleUpgrade(tier.priceId)}
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

      {/* Payment Methods - Managed via Polar Portal */}
      {isPro && (
        <div className="rounded border border-border/30">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium">Payment Methods</h2>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Manage payment methods in the billing portal.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={handleManageSubscription}
              disabled={isOpeningPortal}
            >
              {isOpeningPortal ? (
                <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
              ) : (
                <ExternalLink className="h-2.5 w-2.5 mr-1" />
              )}
              Manage
            </Button>
          </div>
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-12 rounded border border-border/40 bg-muted/30 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">
                  Payment methods are managed through Polar
                </p>
                <p className="text-[10px] text-muted-foreground/50">
                  Click &quot;Manage&quot; to update your billing details
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2 border-b border-border/30">
          <h2 className="text-xs font-medium">Invoice History</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Your past invoices and payments.
          </p>
        </div>
        <div className="px-3 py-2">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded bg-muted/50 p-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-[11px] text-muted-foreground/70">No invoices yet</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded bg-muted/50 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{invoice.product}</span>
                        <Badge
                          variant="secondary"
                          className="text-[8px] h-3.5 px-1 bg-green-500/10 text-green-600"
                        >
                          paid
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDate(invoice.createdAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">•</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Notice */}
      <div className="flex items-start gap-2 px-3 py-2 rounded bg-muted/30 border border-border/20">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] text-muted-foreground/70">
            Need help with billing? Contact{" "}
            <a href="mailto:support@adagent.app" className="text-foreground/70 hover:text-foreground underline-offset-2 hover:underline">
              support@adagent.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function BillingLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Billing</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your subscription and payment methods.
        </p>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded border border-border/30 p-3 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingLoadingSkeleton />}>
      <BillingContent />
    </Suspense>
  )
}
