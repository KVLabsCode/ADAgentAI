"use client"

import * as React from "react"
import { memo, useState, useCallback } from "react"
import { Copy, ThumbsUp, ThumbsDown, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/molecules/tooltip"

interface MessageActionsProps {
  content: string
  messageId: string
}

/**
 * MessageActions - Copy, like, dislike actions for messages
 */
export const MessageActions = memo(function MessageActions({ content, messageId: _messageId }: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  const handleLike = useCallback(() => {
    setLiked(prev => !prev)
    setDisliked(prev => (prev ? false : prev))
  }, [])

  const handleDislike = useCallback(() => {
    setDisliked(prev => !prev)
    setLiked(prev => (prev ? false : prev))
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={handleCopy}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  copied ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              />
            }
          >
            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{copied ? "Copied!" : "Copy"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={handleLike}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  liked ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              />
            }
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{liked ? "Liked" : "Like"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={handleDislike}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  disliked ? "text-red-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              />
            }
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{disliked ? "Disliked" : "Dislike"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
})
