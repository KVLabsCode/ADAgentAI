"use client"

import * as React from "react"
import { useChatSettings } from "@/lib/chat-settings"
import type { Provider, ProviderApp } from "@/lib/types"

export interface SelectedContextItem {
  id: string
  name: string
  type: "provider" | "app" | "entity"
  subtype?: string // e.g., "admob", "gam", "ANDROID", "IOS"
  providerId?: string // For apps, the parent provider
}

// Inline mention that appears in the text (keyboard "/" mode)
export interface InlineMention {
  id: string
  name: string
  type: "provider" | "app"
  subtype?: string
}

export type PaletteTriggerMode = "keyboard" | "button" | null

interface UseCommandPaletteOptions {
  providers: Provider[]
  providerApps: Record<string, ProviderApp[]>
  onInsertMention?: (mention: InlineMention) => void
}

export function useCommandPalette({ providers, providerApps, onInsertMention }: UseCommandPaletteOptions) {
  const [isOpen, setIsOpen] = React.useState(false)
  // Track how the palette was triggered: keyboard (/) or button click
  const [triggerMode, setTriggerMode] = React.useState<PaletteTriggerMode>(null)
  const {
    enabledProviderIds,
    enabledAppIds,
    toggleProvider,
    toggleApp,
  } = useChatSettings()

  // Compute selected context items for display as badges
  const selectedContext = React.useMemo((): SelectedContextItem[] => {
    const items: SelectedContextItem[] = []

    // Add selected providers
    // If enabledProviderIds is empty, all are enabled (don't show badges)
    // If it has items, those are the enabled ones
    if (enabledProviderIds.length > 0 && enabledProviderIds.length < providers.length) {
      enabledProviderIds.forEach((providerId) => {
        const provider = providers.find((p) => p.id === providerId)
        if (provider) {
          items.push({
            id: provider.id,
            name: provider.displayName,
            type: "provider",
            subtype: provider.type,
          })
        }
      })
    }

    // Add selected apps (if not all apps are selected for a provider)
    Object.entries(enabledAppIds).forEach(([providerId, appIds]) => {
      const apps = providerApps[providerId] || []
      // Only show badges if some but not all apps are selected
      if (appIds.length > 0 && appIds.length < apps.length) {
        appIds.forEach((appId) => {
          const app = apps.find((a) => a.id === appId)
          if (app) {
            items.push({
              id: app.id,
              name: app.name,
              type: "app",
              subtype: app.platform,
              providerId,
            })
          }
        })
      }
    })

    return items
  }, [enabledProviderIds, enabledAppIds, providers, providerApps])

  // Check if a provider is in the selected context
  const isProviderSelected = React.useCallback(
    (providerId: string) => {
      if (enabledProviderIds.length === 0) return true // All enabled
      return enabledProviderIds.includes(providerId)
    },
    [enabledProviderIds]
  )

  // Check if an app is in the selected context
  const isAppSelected = React.useCallback(
    (providerId: string, appId: string) => {
      const providerAppIds = enabledAppIds[providerId]
      if (!providerAppIds || providerAppIds.length === 0) return true // All enabled
      return providerAppIds.includes(appId)
    },
    [enabledAppIds]
  )

  // Remove an item from context (for badge dismiss)
  const removeFromContext = React.useCallback(
    (item: SelectedContextItem) => {
      if (item.type === "provider") {
        toggleProvider(item.id)
      } else if (item.type === "app" && item.providerId) {
        toggleApp(item.providerId, item.id)
      }
    },
    [toggleProvider, toggleApp]
  )

  // Handle @ key press to open palette (inline mode)
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, _currentValue: string) => {
      // Open command palette when @ is pressed (anywhere in text)
      if (e.key === "@") {
        e.preventDefault()
        setTriggerMode("keyboard")
        setIsOpen(true)
      }
    },
    []
  )

  // Open palette via button click (popover mode)
  const openFromButton = React.useCallback(() => {
    setTriggerMode("button")
    setIsOpen(true)
  }, [])

  // Close palette and reset trigger mode
  const closePalette = React.useCallback(() => {
    setIsOpen(false)
    // Reset trigger mode after animation completes
    setTimeout(() => setTriggerMode(null), 200)
  }, [])

  // Custom setIsOpen that handles closing
  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      setIsOpen(true)
    } else {
      closePalette()
    }
  }, [closePalette])

  // Select item for inline mention (keyboard "/" mode) - single select, inserts into text
  const selectForInline = React.useCallback(
    (item: { id: string; name: string; type: "provider" | "app"; subtype?: string }) => {
      if (onInsertMention) {
        onInsertMention({
          id: item.id,
          name: item.name,
          type: item.type,
          subtype: item.subtype,
        })
      }
      closePalette()
    },
    [onInsertMention, closePalette]
  )

  return {
    isOpen,
    setIsOpen: handleOpenChange,
    triggerMode,
    openFromButton,
    closePalette,
    selectedContext,
    enabledProviderIds,
    isProviderSelected,
    isAppSelected,
    removeFromContext,
    handleKeyDown,
    toggleProvider,
    toggleApp,
    selectForInline,
  }
}
