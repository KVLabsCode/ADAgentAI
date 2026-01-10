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
    <div className="flex gap-2.5 justify-end">
      <div
        className={cn(
          "max-w-[80%]",
          "bg-sky-900/80 border border-sky-700/50",
          "rounded-2xl",
          // Match card height for short messages, allow expansion for longer
          isShort ? "h-10 px-3 flex items-center" : "px-3 py-2.5"
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
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center">
          <User className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  )
}
