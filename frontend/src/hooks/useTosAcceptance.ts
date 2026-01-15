"use client"

import * as React from "react"

interface UseTosAcceptanceProps {
  acceptTos: (marketingOptIn?: boolean) => Promise<boolean>
}

interface TosAcceptanceState {
  isAccepting: boolean
  agreedToTerms: boolean
  agreedToPrivacy: boolean
  marketingOptIn: boolean
  error: string | null
}

export function useTosAcceptance({ acceptTos }: UseTosAcceptanceProps) {
  const [state, setState] = React.useState<TosAcceptanceState>({
    isAccepting: false,
    agreedToTerms: false,
    agreedToPrivacy: false,
    marketingOptIn: false,
    error: null,
  })

  const setAgreedToTerms = (value: boolean) =>
    setState(prev => ({ ...prev, agreedToTerms: value }))

  const setAgreedToPrivacy = (value: boolean) =>
    setState(prev => ({ ...prev, agreedToPrivacy: value }))

  const setMarketingOptIn = (value: boolean) =>
    setState(prev => ({ ...prev, marketingOptIn: value }))

  const toggleTerms = () => setAgreedToTerms(!state.agreedToTerms)
  const togglePrivacy = () => setAgreedToPrivacy(!state.agreedToPrivacy)
  const toggleMarketing = () => setMarketingOptIn(!state.marketingOptIn)

  const canAccept = state.agreedToTerms && state.agreedToPrivacy

  const handleAccept = async () => {
    if (!canAccept) return

    setState(prev => ({ ...prev, isAccepting: true, error: null }))

    try {
      const success = await acceptTos(state.marketingOptIn)
      if (!success) {
        setState(prev => ({
          ...prev,
          error: "Failed to accept terms. Please try again.",
          isAccepting: false,
        }))
      }
    } catch {
      setState(prev => ({
        ...prev,
        error: "An error occurred. Please try again.",
        isAccepting: false,
      }))
    }
  }

  return {
    ...state,
    setAgreedToTerms,
    setAgreedToPrivacy,
    setMarketingOptIn,
    toggleTerms,
    togglePrivacy,
    toggleMarketing,
    canAccept,
    handleAccept,
  }
}
