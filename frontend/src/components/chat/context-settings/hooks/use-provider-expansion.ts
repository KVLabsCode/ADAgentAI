import { useState, useCallback, useEffect } from "react"
import type { ProviderApp } from "@/lib/types"
import { getProvidersWithMatchingApps } from "../utils"

interface UseProviderExpansionOptions {
  searchQuery: string
  providerApps: Record<string, ProviderApp[]>
  onExpandProvider?: (providerId: string, providerType: string) => void
}

interface UseProviderExpansionReturn {
  expandedSections: Set<string>
  expandedProviders: Set<string>
  toggleSection: (section: string) => void
  toggleProviderExpanded: (providerId: string, providerType: string) => void
  isSectionExpanded: (section: string) => boolean
  isProviderExpanded: (providerId: string) => boolean
}

/**
 * Manages expansion state for sections and providers in ContextSettings.
 * Handles auto-expansion when searching for apps.
 */
export function useProviderExpansion({
  searchQuery,
  providerApps,
  onExpandProvider,
}: UseProviderExpansionOptions): UseProviderExpansionReturn {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["admob", "gam"])
  )
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())

  // Auto-expand providers when searching and they have matching apps
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: sync expansion state with search results */
  useEffect(() => {
    if (searchQuery.trim()) {
      const providersWithMatchingApps = getProvidersWithMatchingApps(
        searchQuery,
        providerApps
      )

      if (providersWithMatchingApps.length > 0) {
        setExpandedProviders((prev) => {
          const next = new Set(prev)
          providersWithMatchingApps.forEach((id) => next.add(id))
          return next
        })
      }
    }
  }, [searchQuery, providerApps])
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  const toggleProviderExpanded = useCallback(
    (providerId: string, providerType: string) => {
      setExpandedProviders((prev) => {
        const next = new Set(prev)
        if (next.has(providerId)) {
          next.delete(providerId)
        } else {
          next.add(providerId)
          // Trigger app fetching for admob providers
          if (providerType === "admob" && onExpandProvider) {
            onExpandProvider(providerId, providerType)
          }
        }
        return next
      })
    },
    [onExpandProvider]
  )

  const isSectionExpanded = useCallback(
    (section: string) => expandedSections.has(section),
    [expandedSections]
  )

  const isProviderExpanded = useCallback(
    (providerId: string) => expandedProviders.has(providerId),
    [expandedProviders]
  )

  return {
    expandedSections,
    expandedProviders,
    toggleSection,
    toggleProviderExpanded,
    isSectionExpanded,
    isProviderExpanded,
  }
}
