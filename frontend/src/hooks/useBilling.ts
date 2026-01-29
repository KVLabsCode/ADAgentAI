"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Subscription, Usage, Invoice } from "@/lib/billing"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

export function useBilling() {
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
  const [statusMessage, setStatusMessage] = React.useState<StatusMessage | null>(null)

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

  // Initial fetch
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

  const handleUpgrade = React.useCallback(async (priceId?: string) => {
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
      setStatusMessage({
        type: 'error',
        text: message.includes('fetch') ? 'Backend API not running. Please start the server.' : message
      })
      setIsUpgrading(null)
    }
  }, [getAccessToken, resolvedTheme])

  const handleManageSubscription = React.useCallback(async () => {
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
  }, [getAccessToken])

  const retry = React.useCallback(() => {
    setLoadError(null)
    setIsLoading(true)
    fetchBillingData()
  }, [fetchBillingData])

  const isPro = !!(subscription?.hasSubscription && subscription.status === 'active') || usage?.isPro || false
  const usagePercent = usage && usage.limits.queries > 0
    ? Math.min((usage.queries / usage.limits.queries) * 100, 100)
    : 0

  return {
    // Data
    subscription,
    usage,
    invoices,
    isPro,
    usagePercent,
    // State
    isLoading,
    loadError,
    isUpgrading,
    isOpeningPortal,
    statusMessage,
    // Actions
    handleUpgrade,
    handleManageSubscription,
    retry,
  }
}
