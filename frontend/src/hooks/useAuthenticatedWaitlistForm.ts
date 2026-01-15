"use client"

import * as React from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface UseAuthenticatedWaitlistFormProps {
  email: string
  onSuccess?: () => void
}

interface WaitlistFormState {
  role: string
  useCase: string
  submitted: boolean
  loading: boolean
  error: string
  position: number | null
  referralCode: string
  copied: boolean
}

export function useAuthenticatedWaitlistForm({ email, onSuccess }: UseAuthenticatedWaitlistFormProps) {
  const [state, setState] = React.useState<WaitlistFormState>({
    role: "",
    useCase: "",
    submitted: false,
    loading: false,
    error: "",
    position: null,
    referralCode: "",
    copied: false,
  })

  const setRole = (role: string) => setState(prev => ({ ...prev, role }))
  const setUseCase = (useCase: string) => setState(prev => ({ ...prev, useCase }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.role || !state.useCase) return

    setState(prev => ({ ...prev, loading: true, error: "" }))

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get("ref")

      const response = await fetch(`${API_URL}/api/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referralCode: refCode || undefined,
          role: state.role,
          useCase: state.useCase,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          submitted: true,
          position: data.position,
          referralCode: data.referralCode,
          loading: false,
        }))
        onSuccess?.()
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || "Failed to join waitlist",
          loading: false,
        }))
      }
    } catch {
      setState(prev => ({
        ...prev,
        error: "Something went wrong. Please try again.",
        loading: false,
      }))
    }
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${state.referralCode}`
    navigator.clipboard.writeText(link)
    setState(prev => ({ ...prev, copied: true }))
    setTimeout(() => setState(prev => ({ ...prev, copied: false })), 2000)
  }

  const resetForm = () => {
    setState({
      role: "",
      useCase: "",
      submitted: false,
      loading: false,
      error: "",
      position: null,
      referralCode: "",
      copied: false,
    })
  }

  const isValid = state.role !== "" && state.useCase !== ""

  return {
    ...state,
    setRole,
    setUseCase,
    handleSubmit,
    copyReferralLink,
    resetForm,
    isValid,
  }
}
