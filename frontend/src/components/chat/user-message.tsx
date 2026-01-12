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
          "rounded-xl",
          // Match card height for short messages, allow expansion for longer
          isShort ? "h-10 px-3.5 flex items-center" : "px-3.5 py-2.5"
        )}
      >
        <p className={cn(
          "text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-100",
          isShort && "truncate"
        )}>
          {content}
        </p>
      </div>
      {user?.avatar ? (
        <Image
          src={user.avatar}
          alt={user.name}
          width={40}
          height={40}
          className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center">
          <User className="h-5 w-5 text-zinc-300" />
        </div>
      )}
    </div>
  )
}
