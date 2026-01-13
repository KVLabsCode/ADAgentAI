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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  EmptyState,
  StatusMessage,
} from "@/components/ui/theme"
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
              onClick={() => {
                setLoadError(null)
                setIsLoading(true)
                fetchBillingData()
              }}
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
      {/* Status Message */}
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      <PageHeader
        title="Billing"
        description="Manage your subscription and payment methods."
      />

      {/* Current Plan */}
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
                subscription?.cancelAtPeriodEnd ? "bg-amber-500" : "bg-emerald-500"
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
        </SectionCardContent>
      </SectionCard>

      {/* Available Plans */}
      <div>
        <h2 className="text-sm font-medium mb-3">Available Plans</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {tiers.map((tier) => {
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
                      <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
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
      )}

      {/* Invoice History */}
      <SectionCard>
        <SectionCardHeader
          icon={FileText}
          title="Invoice History"
          description="Your past invoices and payments."
        />
        <SectionCardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Invoices will appear here after your first payment"
              className="py-8"
            />
          ) : (
            <div className="space-y-1">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{invoice.product}</span>
                        <Badge
                          variant="outline"
                          className="text-[8px] h-3.5 px-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        >
                          paid
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCardContent>
      </SectionCard>

      {/* Help Notice */}
      <div className="flex items-start gap-2 px-4 py-3 rounded border border-border/30 bg-muted/20">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">
            Need help with billing? Contact{" "}
            <a href="mailto:support@adagent.app" className="text-foreground hover:underline underline-offset-2">
              support@adagent.app
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
