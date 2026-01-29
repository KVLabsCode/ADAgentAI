"use client"

import * as React from "react"
import { Copy, ThumbsUp, ThumbsDown, CheckCheck, Share2, AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/molecules/tooltip"
import { ResponseSkeleton } from "@/atoms/skeleton"
import { Markdown } from "@/atoms/markdown"

interface FinalAnswerBlockProps {
  content: string
  isStreaming?: boolean
  messageId: string
  className?: string
}

export function FinalAnswerBlock({ content, isStreaming = false, messageId, className }: FinalAnswerBlockProps) {
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

      {/* Content - optimized memoized markdown */}
      <div>
        <Markdown content={content} id={messageId} />
        {isStreaming && (
          <span
            className="inline-block w-2 h-5 ml-0.5 bg-violet-500 dark:bg-violet-400 rounded-sm animate-pulse"
            aria-label="Streaming response"
          />
        )}
      </div>

      {/* Action buttons - visible on hover or when actions taken */}
      {!isStreaming && content && (
        <div className="pt-2">
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={200}>
              {/* Copy */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        "opacity-0 group-hover:opacity-100",
                        copied
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                      )}
                    />
                  }
                >
                  {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {copied ? "Copied!" : "Copy"}
                </TooltipContent>
              </Tooltip>

              {/* Like */}
              <Tooltip>
                <TooltipTrigger
                  render={
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
                    />
                  }
                >
                  <ThumbsUp className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {liked ? "Liked" : "Like"}
                </TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger
                  render={
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
                    />
                  }
                >
                  <ThumbsDown className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {disliked ? "Disliked" : "Dislike"}
                </TooltipContent>
              </Tooltip>

              {/* Share */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleShare}
                      className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50",
                        "opacity-0 group-hover:opacity-100"
                      )}
                    />
                  }
                >
                  <Share2 className="h-4 w-4" />
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
