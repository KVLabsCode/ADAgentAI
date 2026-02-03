"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  parseTrafficPrompt,
  summarizeParsedAllocation,
  type ParsedPromptAllocation,
} from "@/lib/experiments"

interface UsePromptParserResult {
  prompt: string
  parsed: ParsedPromptAllocation | null
  summary: string
  setPrompt: (prompt: string) => void
  clear: () => void
}

/**
 * Hook for parsing traffic allocation prompts with debounce
 */
export function usePromptParser(
  initialPrompt: string = "",
  debounceMs: number = 150
): UsePromptParserResult {
  const [prompt, setPromptInternal] = useState(initialPrompt)
  const [parsed, setParsed] = useState<ParsedPromptAllocation | null>(null)
  const [summary, setSummary] = useState("")
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  // Parse with debounce
  const parseWithDebounce = useCallback(
    (text: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (!text.trim()) {
        setParsed(null)
        setSummary("")
        return
      }

      timeoutRef.current = setTimeout(() => {
        const result = parseTrafficPrompt(text)
        setParsed(result)
        setSummary(summarizeParsedAllocation(result))
      }, debounceMs)
    },
    [debounceMs]
  )

  // Update prompt and trigger parse
  const setPrompt = useCallback(
    (newPrompt: string) => {
      setPromptInternal(newPrompt)
      parseWithDebounce(newPrompt)
    },
    [parseWithDebounce]
  )

  // Clear everything
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setPromptInternal("")
    setParsed(null)
    setSummary("")
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Parse initial prompt on mount
  useEffect(() => {
    if (initialPrompt.trim()) {
      const result = parseTrafficPrompt(initialPrompt)
      // Use queueMicrotask to avoid calling setState synchronously in effect
      queueMicrotask(() => {
        setParsed(result)
        setSummary(summarizeParsedAllocation(result))
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    prompt,
    parsed,
    summary,
    setPrompt,
    clear,
  }
}
