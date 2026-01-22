"use client"

import * as React from "react"
import type { Message } from "@/lib/types"
import { storage } from "@/lib/storage"

const CHAT_STORAGE_KEY = "adagent_active_chat"

export interface ChatState {
  messages: Message[]
  sessionId: string | null
}

// Load chat state from localStorage
export function loadChatState(): ChatState | null {
  const saved = storage.get<ChatState | null>(CHAT_STORAGE_KEY, null)
  if (saved && Array.isArray(saved.messages)) {
    return { messages: saved.messages, sessionId: saved.sessionId || null }
  }
  return null
}

// Save chat state to localStorage
export function saveChatState(messages: Message[], sessionId: string | null) {
  if (messages.length > 0) {
    storage.set(CHAT_STORAGE_KEY, { messages, sessionId })
  } else {
    storage.remove(CHAT_STORAGE_KEY)
  }
}

// Clear chat state from localStorage
export function clearChatState() {
  storage.remove(CHAT_STORAGE_KEY)
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
