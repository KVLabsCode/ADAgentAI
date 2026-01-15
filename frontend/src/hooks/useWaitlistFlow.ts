"use client"

import * as React from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export type WaitlistStep = "email" | "survey" | "success"

interface OAuthMessageData {
  success: boolean
  email?: string
  name?: string
  picture?: string
  error?: string
}

interface WaitlistFlowState {
  step: WaitlistStep
  // Google auth
  email: string
  name: string
  picture: string | null
  googleLoading: boolean
  // Survey
  role: string
  useCase: string
  // Submission
  loading: boolean
  error: string
  position: number | null
  referralCode: string
  copied: boolean
}

export function useWaitlistFlow() {
  const [state, setState] = React.useState<WaitlistFlowState>({
    step: "email",
    email: "",
    name: "",
    picture: null,
    googleLoading: false,
    role: "",
    useCase: "",
    loading: false,
    error: "",
    position: null,
    referralCode: "",
    copied: false,
  })

  const setStep = (step: WaitlistStep) => setState(prev => ({ ...prev, step }))
  const setRole = (role: string) => setState(prev => ({ ...prev, role }))
  const setUseCase = (useCase: string) => setState(prev => ({ ...prev, useCase }))

  // Handle Google OAuth - redirect flow
  const handleGoogleAuth = async () => {
    setState(prev => ({ ...prev, googleLoading: true, error: "" }))

    try {
      sessionStorage.setItem("waitlist_return_url", window.location.href)

      const initResponse = await fetch(`${API_URL}/api/waitlist/oauth/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect: true }),
      })

      if (!initResponse.ok) {
        throw new Error("Failed to initialize authentication")
      }

      const { url } = await initResponse.json()
      window.location.href = url
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to authenticate",
        googleLoading: false,
      }))
    }
  }

  // Check for OAuth callback data on mount
  const checkOAuthCallback = React.useCallback(() => {
    try {
      const stored = sessionStorage.getItem("waitlist_oauth_result")
      if (stored) {
        sessionStorage.removeItem("waitlist_oauth_result")
        const data = JSON.parse(stored) as OAuthMessageData

        if (data.success && data.email) {
          setState(prev => ({
            ...prev,
            email: data.email || "",
            name: data.name || "",
            picture: data.picture || null,
            step: "survey",
          }))
          return true // Signal to open dialog
        } else if (data.error) {
          setState(prev => ({ ...prev, error: data.error || "" }))
          return true // Signal to open dialog with error
        }
      }
    } catch (e) {
      console.error("Failed to process OAuth callback:", e)
    }
    return false
  }, [])

  // Handle final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.email || !state.role || !state.useCase) return

    setState(prev => ({ ...prev, loading: true, error: "" }))

    try {
      // Check if user already exists
      const checkResponse = await fetch(`${API_URL}/api/waitlist/check-existing/${encodeURIComponent(state.email)}`)
      const { exists } = await checkResponse.json()

      if (exists) {
        setState(prev => ({
          ...prev,
          error: "You already have an account! Please sign in instead.",
          loading: false,
        }))
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get("ref")

      const response = await fetch(`${API_URL}/api/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          name: state.name || undefined,
          referralCode: refCode || undefined,
          role: state.role,
          useCase: state.useCase,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          step: "success",
          position: data.position,
          referralCode: data.referralCode,
          loading: false,
        }))
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
      step: "email",
      email: "",
      name: "",
      picture: null,
      googleLoading: false,
      role: "",
      useCase: "",
      loading: false,
      error: "",
      position: null,
      referralCode: "",
      copied: false,
    })
  }

  const goToEmailStep = () => setState(prev => ({ ...prev, step: "email" }))

  const isValid = state.role !== "" && state.useCase !== ""

  return {
    ...state,
    setStep,
    setRole,
    setUseCase,
    handleGoogleAuth,
    handleSubmit,
    copyReferralLink,
    resetForm,
    goToEmailStep,
    checkOAuthCallback,
    isValid,
  }
}
