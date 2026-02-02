"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useSyncExternalStore } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { storage } from "@/lib/storage"

const DEMO_MODE_STORAGE_KEY = "demo_mode"
const DEMO_URL_PARAM = "demo"

interface DemoModeContextValue {
  isDemoMode: boolean
  enableDemoMode: () => void
  disableDemoMode: () => void
  toggleDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null)

/**
 * Check if demo mode is enabled from localStorage
 */
function getStoredDemoMode(): boolean {
  if (typeof window === "undefined") return false
  // Storage parses "true" as boolean true, so check for both
  const value = storage.get<boolean | string>(DEMO_MODE_STORAGE_KEY, false)
  return value === true || value === "true"
}

/**
 * Check if demo mode is enabled from URL parameter
 */
function getDemoModeFromUrl(): boolean {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.search)
  return params.get(DEMO_URL_PARAM) === "true"
}

// Custom hook to sync demo mode with localStorage using useSyncExternalStore
function useDemoModeStore() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback)
    // Custom event for same-tab updates
    window.addEventListener("demo-mode-change", callback)
    return () => {
      window.removeEventListener("storage", callback)
      window.removeEventListener("demo-mode-change", callback)
    }
  }, [])

  const getSnapshot = useCallback(() => {
    return getStoredDemoMode() || getDemoModeFromUrl()
  }, [])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Use useSyncExternalStore to properly sync with localStorage
  const isDemoMode = useDemoModeStore()

  // Track internal state for URL param from Next.js
  const urlDemoParam = searchParams.get(DEMO_URL_PARAM) === "true"

  // Sync URL param to storage on mount (only runs on client)
  const [hasSynced, setHasSynced] = useState(false)
  if (!hasSynced && typeof window !== "undefined" && urlDemoParam && !getStoredDemoMode()) {
    storage.set(DEMO_MODE_STORAGE_KEY, true)
    window.dispatchEvent(new Event("demo-mode-change"))
    setHasSynced(true)
  }

  // Update URL when demo mode changes
  const updateUrl = useCallback((enabled: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (enabled) {
      params.set(DEMO_URL_PARAM, "true")
    } else {
      params.delete(DEMO_URL_PARAM)
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [searchParams, pathname, router])

  const enableDemoMode = useCallback(() => {
    storage.set(DEMO_MODE_STORAGE_KEY, true)
    window.dispatchEvent(new Event("demo-mode-change"))
    updateUrl(true)
  }, [updateUrl])

  const disableDemoMode = useCallback(() => {
    storage.remove(DEMO_MODE_STORAGE_KEY)
    window.dispatchEvent(new Event("demo-mode-change"))
    updateUrl(false)
  }, [updateUrl])

  const toggleDemoMode = useCallback(() => {
    if (isDemoMode) {
      disableDemoMode()
    } else {
      enableDemoMode()
    }
  }, [isDemoMode, enableDemoMode, disableDemoMode])

  const value: DemoModeContextValue = {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
  }

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemo(): DemoModeContextValue {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error("useDemo must be used within a DemoModeProvider")
  }
  return context
}

/**
 * Utility function to check demo mode outside of React components
 * (e.g., in initialization functions)
 */
export function isDemoModeEnabled(): boolean {
  return getStoredDemoMode() || getDemoModeFromUrl()
}
