"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Copy, ThumbsUp, ThumbsDown, CheckCheck, Share2, AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/molecules/tooltip"
import { ResponseSkeleton } from "@/atoms/skeleton"

interface FinalAnswerBlockProps {
  content: string
  isStreaming?: boolean
  messageId: string
  className?: string
}

export function FinalAnswerBlock({ content, isStreaming = false, messageId: _messageId, className }: FinalAnswerBlockProps) {
  const [copied, setCopied] = React.useState(false)
  const [liked, setLiked] = React.useState(false)
  const [disliked, setDisliked] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content })
      } catch (err) {
        // User cancelled or error
        console.error("Share failed:", err)
      }
    } else {
      // Fallback to copy
      handleCopy()
    }
  }

  // Show skeleton while streaming with no content yet
  if (isStreaming && !content) {
    return (
      <div className={cn("py-1", className)}>
        <ResponseSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("group", className)}>
      {/* Answer header - Perplexity style */}
      <div className="flex items-center gap-3 mb-5">
        <AlignLeft className="h-6 w-6 text-foreground" />
        <span className="text-lg font-semibold text-foreground">Answer</span>
      </div>

      {/* Content - clean markdown */}
      <div>
        <div className={cn(
          "prose dark:prose-invert max-w-none",
          // Typography
          "text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200",
          // Headings
          "prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-3",
          "prose-h1:border-b prose-h1:border-zinc-200 dark:prose-h1:border-zinc-700/50 prose-h1:pb-2",
          "prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2",
          "prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2",
          // Paragraphs
          "prose-p:my-2.5 prose-p:leading-relaxed",
          // Lists
          "prose-ul:my-2.5 prose-ul:pl-4",
          "prose-ol:my-2.5 prose-ol:pl-4",
          "prose-li:my-1 prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-500",
          // Code
          "prose-code:bg-zinc-100 dark:prose-code:bg-zinc-700/60",
          "prose-code:text-emerald-600 dark:prose-code:text-emerald-300",
          "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal",
          "prose-code:before:content-none prose-code:after:content-none",
          // Pre/Code blocks
          "prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-900/80",
          "prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700/50",
          "prose-pre:rounded-xl prose-pre:text-zinc-900 dark:prose-pre:text-zinc-300",
          // Strong/Em
          "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold",
          "prose-em:text-zinc-700 dark:prose-em:text-zinc-300",
          // Links
          "prose-a:text-violet-600 dark:prose-a:text-violet-400",
          "prose-a:no-underline hover:prose-a:underline",
          // Blockquotes
          "prose-blockquote:border-l-violet-500/50",
          "prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800/50",
          "prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:px-3",
          "prose-blockquote:not-italic prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-300",
          // Tables
          "prose-table:border prose-table:border-zinc-200 dark:prose-table:border-zinc-700/50",
          "prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800",
          "prose-th:px-3 prose-th:py-2 prose-th:text-zinc-900 dark:prose-th:text-zinc-200 prose-th:font-medium",
          "prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-zinc-200 dark:prose-td:border-zinc-700/50"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span
              className="inline-block w-2 h-5 ml-0.5 bg-violet-500 dark:bg-violet-400 rounded-sm animate-pulse"
              aria-label="Streaming response"
            />
          )}
        </div>
      </div>

      {/* Action buttons - visible on hover or when actions taken */}
      {!isStreaming && content && (
        <div className="pt-2">
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={200}>
              {/* Copy */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      "opacity-0 group-hover:opacity-100",
                      copied
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                    )}
                  >
                    {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {copied ? "Copied!" : "Copy"}
                </TooltipContent>
              </Tooltip>

              {/* Like */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setLiked(!liked)
                      if (!liked && disliked) setDisliked(false)
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      liked
                        ? "text-emerald-500 dark:text-emerald-400 opacity-100"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {liked ? "Liked" : "Like"}
                </TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setDisliked(!disliked)
                      if (!disliked && liked) setLiked(false)
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      disliked
                        ? "text-red-500 dark:text-red-400 opacity-100"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {disliked ? "Disliked" : "Dislike"}
                </TooltipContent>
              </Tooltip>

              {/* Share */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50",
                      "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Share
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
