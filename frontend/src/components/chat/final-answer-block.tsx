"use client"

import * as React from "react"
import { Copy, ThumbsUp, ThumbsDown, CheckCheck, Share2, AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/molecules/tooltip"
import { ResponseSkeleton } from "@/atoms/skeleton"
import { Markdown } from "@/atoms/markdown"
import { ActionButton } from "@/atoms/action-button"
import { useAnswerActions } from "./hooks/use-answer-actions"

interface FinalAnswerBlockProps {
  content: string
  isStreaming?: boolean
  messageId: string
  className?: string
}

export function FinalAnswerBlock({ content, isStreaming = false, messageId, className }: FinalAnswerBlockProps) {
  const { copied, liked, disliked, copy, toggleLike, toggleDislike, share } = useAnswerActions(messageId)

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
              <ActionButton
                icon={Copy}
                activeIcon={CheckCheck}
                tooltip="Copy"
                activeTooltip="Copied!"
                isActive={copied}
                onClick={() => copy(content)}
              />
              <ActionButton
                icon={ThumbsUp}
                tooltip={liked ? "Liked" : "Like"}
                isActive={liked}
                onClick={toggleLike}
              />
              <ActionButton
                icon={ThumbsDown}
                tooltip={disliked ? "Disliked" : "Dislike"}
                isActive={disliked}
                onClick={toggleDislike}
                activeClassName="text-red-500 dark:text-red-400"
              />
              <ActionButton
                icon={Share2}
                tooltip="Share"
                onClick={() => share(content)}
              />
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
