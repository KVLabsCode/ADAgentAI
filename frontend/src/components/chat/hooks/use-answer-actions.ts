"use client"

import { useState, useCallback } from "react"

interface AnswerActions {
  copied: boolean
  liked: boolean
  disliked: boolean
  copy: (text: string) => Promise<void>
  toggleLike: () => void
  toggleDislike: () => void
  share: (text: string) => Promise<void>
}

/**
 * useAnswerActions - Manages state and actions for answer feedback buttons.
 *
 * Uses functional setState to ensure stable callback references and prevent stale closures.
 * All callbacks are memoized with empty dependency arrays for optimal performance.
 *
 * @param _messageId - Optional message ID for future analytics tracking
 * @returns Object containing state booleans and action handlers
 *
 * @example
 * const { copied, liked, disliked, copy, toggleLike, toggleDislike, share } = useAnswerActions(messageId)
 */
export function useAnswerActions(_messageId?: string): AnswerActions {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  const toggleLike = useCallback(() => {
    setLiked(prev => !prev)
    // When liking, clear dislike using functional update to avoid stale closure
    setDisliked(prev => (prev ? false : prev))
  }, [])

  const toggleDislike = useCallback(() => {
    setDisliked(prev => !prev)
    // When disliking, clear like using functional update to avoid stale closure
    setLiked(prev => (prev ? false : prev))
  }, [])

  const share = useCallback(async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch (err) {
        // User cancelled or error - fallback to copy
        console.error("Share failed:", err)
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } else {
      // Fallback to copy
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return { copied, liked, disliked, copy, toggleLike, toggleDislike, share }
}
