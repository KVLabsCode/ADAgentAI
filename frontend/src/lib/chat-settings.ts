"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type DisplayMode = "detailed" | "compact"
export type ResponseStyle = "concise" | "detailed"

interface ChatSettingsState {
  displayMode: DisplayMode
  selectedModel: string
  responseStyle: ResponseStyle
  // Provider IDs that are enabled for context (empty = all enabled)
  enabledProviderIds: string[]
  // Whether to auto-include account context in queries
  autoIncludeContext: boolean
  setDisplayMode: (mode: DisplayMode) => void
  setSelectedModel: (model: string) => void
  setResponseStyle: (style: ResponseStyle) => void
  setEnabledProviderIds: (ids: string[]) => void
  toggleProvider: (id: string) => void
  setAutoIncludeContext: (enabled: boolean) => void
}

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      displayMode: "detailed",
      selectedModel: "claude-sonnet-4-20250514",
      responseStyle: "concise",
      enabledProviderIds: [], // Empty means all are enabled
      autoIncludeContext: true,
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setResponseStyle: (style) => set({ responseStyle: style }),
      setEnabledProviderIds: (ids) => set({ enabledProviderIds: ids }),
      toggleProvider: (id) => {
        const current = get().enabledProviderIds
        if (current.includes(id)) {
          set({ enabledProviderIds: current.filter((i) => i !== id) })
        } else {
          set({ enabledProviderIds: [...current, id] })
        }
      },
      setAutoIncludeContext: (enabled) => set({ autoIncludeContext: enabled }),
    }),
    {
      name: "chat-settings",
    }
  )
)

// Available models
export const AVAILABLE_MODELS = [
  {
    provider: "Anthropic",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Fast and capable" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", description: "Most powerful" },
    ],
  },
]
