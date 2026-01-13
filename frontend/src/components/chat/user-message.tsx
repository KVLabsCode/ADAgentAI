"use client"

import { cn } from "@/lib/utils"
import { User } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import Image from "next/image"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  const { user } = useUser()

  // Check if content is short (single line)
  const isShort = content.length <= 80 && !content.includes('\n')

  return (
    <div className="flex items-start gap-2.5 justify-end">
      <div
        className={cn(
          "max-w-[80%]",
          "bg-zinc-700/60 border border-zinc-600/40",
          "rounded-3xl",
          // Match card height for short messages, allow expansion for longer
          isShort ? "h-10 px-3.5 flex items-center" : "px-3.5 py-2.5"
        )}
      >
        <p className={cn(
          "text-base leading-relaxed whitespace-pre-wrap text-zinc-100",
          isShort && "truncate"
        )}>
          {content}
        </p>
      </div>
      {/* User avatar hidden */}
    </div>
  )
}
