"use client"

import * as React from "react"
import type { Message } from "@/lib/types"

const CHAT_STORAGE_KEY = "adagent_active_chat"

export interface ChatState {
  messages: Message[]
  sessionId: string | null
}

// Load chat state from localStorage
export function loadChatState(): ChatState | null {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && Array.isArray(parsed.messages)) {
        return { messages: parsed.messages, sessionId: parsed.sessionId || null }
      }
    }
  } catch (e) {
    console.error("[ChatPersistence] Load error:", e)
  }
  return null
}

// Save chat state to localStorage
export function saveChatState(messages: Message[], sessionId: string | null) {
  if (typeof window === "undefined") return
  try {
    if (messages.length > 0) {
      const data = JSON.stringify({ messages, sessionId })
      localStorage.setItem(CHAT_STORAGE_KEY, data)
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    }
  } catch (e) {
    console.error("[ChatPersistence] Save error:", e)
  }
}

// Clear chat state from localStorage
export function clearChatState() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

interface UseChatPersistenceOptions {
  initialMessages: Message[]
  initialSessionId: string | undefined
  onRestore: (messages: Message[], sessionId: string | null) => void
}

export function useChatPersistence({
  initialMessages,
  initialSessionId,
  onRestore,
}: UseChatPersistenceOptions) {
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Hydrate from localStorage after mount (client-side only)
  React.useEffect(() => {
    const saved = loadChatState()

    // Case 1: Same session, localStorage has more messages (mid-conversation restore)
    if (saved && initialSessionId && saved.sessionId === initialSessionId) {
      if (saved.messages.length > initialMessages.length) {
        onRestore(saved.messages, saved.sessionId)
        setIsHydrated(true)
        return
      }
    }

    // Case 2: New chat page, restore from localStorage if available
    if (!initialSessionId && saved && saved.messages.length > 0) {
      onRestore(saved.messages, saved.sessionId)
      // Update URL to match the restored session
      if (saved.sessionId) {
        window.history.replaceState(null, '', `/chat/${saved.sessionId}`)
      }
      setIsHydrated(true)
      return
    }

    // Case 3: Use server data (or empty for new chat)
    setIsHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, [])

  return { isHydrated }
}
