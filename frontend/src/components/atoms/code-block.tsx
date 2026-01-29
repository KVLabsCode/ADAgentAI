"use client"

import * as React from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

/**
 * Code block component with language tag, copy button, and syntax styling.
 * Supports dark/light theme automatically via CSS variables.
 */
export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  return (
    <div
      className={cn(
        "group/codeblock relative rounded-xl overflow-hidden",
        "border border-zinc-200 dark:border-zinc-700/50",
        "bg-zinc-50 dark:bg-zinc-900/80",
        className
      )}
    >
      {/* Header with language tag and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-100/50 dark:bg-zinc-800/50">
        {language ? (
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {language}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
            "opacity-0 group-hover/codeblock:opacity-100",
            copied
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            "hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
          )}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="p-4 overflow-x-auto">
        <code
          className={cn(
            "text-sm font-mono leading-relaxed",
            "text-zinc-800 dark:text-zinc-200"
          )}
        >
          {code}
        </code>
      </pre>
    </div>
  )
}
