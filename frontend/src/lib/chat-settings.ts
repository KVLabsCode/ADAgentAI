"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type DisplayMode = "detailed" | "compact"

interface ChatSettingsState {
  displayMode: DisplayMode
  selectedModel: string
  setDisplayMode: (mode: DisplayMode) => void
  setSelectedModel: (model: string) => void
}

export const useChatSettings = create<ChatSettingsState>()(
  persist(
    (set) => ({
      displayMode: "detailed",
      selectedModel: "claude-sonnet-4-20250514",
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setSelectedModel: (model) => set({ selectedModel: model }),
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
