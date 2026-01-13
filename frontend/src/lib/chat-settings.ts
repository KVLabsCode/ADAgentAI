"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type DisplayMode = "detailed" | "compact"
export type ResponseStyle = "concise" | "detailed"
// JSON display mode for tool results:
// - "tree": Collapsible tree view with syntax highlighting
// - "json": Raw JSON code block (original behavior)
export type JsonViewMode = "tree" | "json"
// Context mode for entity grounding:
// - "soft": Prefer enabled entities, but allow explicit references to others
// - "strict": ONLY use enabled entities, prompt user to enable if needed
export type ContextMode = "soft" | "strict"

interface ChatSettingsState {
  displayMode: DisplayMode
  selectedModel: string
  responseStyle: ResponseStyle
  contextMode: ContextMode
  // JSON view mode for tool results (tree or raw json)
  jsonViewMode: JsonViewMode
  // Safe mode: blocks all write operations (dangerous tools)
  safeMode: boolean
  // Provider IDs that are enabled for context (empty = all enabled)
  enabledProviderIds: string[]
  // App IDs that are enabled for context (keyed by provider ID)
  // Format: { "provider-id": ["app-id-1", "app-id-2"] }
  // Empty array or missing key = all apps enabled for that provider
  enabledAppIds: Record<string, string[]>
  // Whether to auto-include account context in queries
  autoIncludeContext: boolean
  setDisplayMode: (mode: DisplayMode) => void
  setSelectedModel: (model: string) => void
  setResponseStyle: (style: ResponseStyle) => void
  setContextMode: (mode: ContextMode) => void
  setJsonViewMode: (mode: JsonViewMode) => void
  setSafeMode: (enabled: boolean) => void
  setEnabledProviderIds: (ids: string[]) => void
  toggleProvider: (id: string) => void
  setEnabledAppIds: (providerId: string, appIds: string[]) => void
  toggleApp: (providerId: string, appId: string) => void
  setAutoIncludeContext: (enabled: boolean) => void
}

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      displayMode: "compact",
      selectedModel: "openrouter/google/gemini-2.5-flash",
      responseStyle: "concise",
      contextMode: "soft", // Default to soft mode (more flexible)
      jsonViewMode: "tree", // Default to tree view for better readability
      safeMode: false, // Default: write operations allowed with approval
      enabledProviderIds: [], // Empty means all are enabled
      enabledAppIds: {}, // Empty means all apps enabled for all providers
      autoIncludeContext: true,
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setResponseStyle: (style) => set({ responseStyle: style }),
      setContextMode: (mode) => set({ contextMode: mode }),
      setJsonViewMode: (mode) => set({ jsonViewMode: mode }),
      setSafeMode: (enabled) => set({ safeMode: enabled }),
      setEnabledProviderIds: (ids) => set({ enabledProviderIds: ids }),
      toggleProvider: (id) => {
        const current = get().enabledProviderIds
        if (current.includes(id)) {
          set({ enabledProviderIds: current.filter((i) => i !== id) })
        } else {
          set({ enabledProviderIds: [...current, id] })
        }
      },
      setEnabledAppIds: (providerId, appIds) => {
        const current = get().enabledAppIds
        set({ enabledAppIds: { ...current, [providerId]: appIds } })
      },
      toggleApp: (providerId, appId) => {
        const current = get().enabledAppIds
        const providerApps = current[providerId] || []
        if (providerApps.includes(appId)) {
          // Remove app
          set({
            enabledAppIds: {
              ...current,
              [providerId]: providerApps.filter((id) => id !== appId),
            },
          })
        } else {
          // Add app
          set({
            enabledAppIds: {
              ...current,
              [providerId]: [...providerApps, appId],
            },
          })
        }
      },
      setAutoIncludeContext: (enabled) => set({ autoIncludeContext: enabled }),
    }),
    {
      name: "chat-settings",
    }
  )
)

// Available models grouped by provider
export const AVAILABLE_MODELS = [
  {
    provider: "Anthropic",
    models: [
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Fast and capable" },
    ],
  },
  {
    provider: "Google",
    models: [
      { id: "openrouter/google/gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast and cost-effective" },
      { id: "openrouter/google/gemini-3-flash-preview", name: "Gemini 3 Flash", description: "Latest free Gemini model" },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      { id: "openrouter/openai/gpt-5-mini", name: "GPT-5 Mini", description: "Compact and efficient" },
    ],
  },
]
