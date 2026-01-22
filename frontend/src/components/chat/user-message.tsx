"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"
import { useUser } from "@/hooks/use-user"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  const { user } = useUser()

  // Get initials for fallback avatar
  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex items-center gap-3 pb-2">
      {/* Avatar - sized to match text line height */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        {user?.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name || "User"}
            width={28}
            height={28}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-white">
            {getInitials(user?.name)}
          </span>
        )}
      </div>

      {/* Query text */}
      <p className={cn(
        "flex-1 text-lg font-semibold leading-snug whitespace-pre-wrap",
        "text-zinc-900 dark:text-zinc-50"
      )}>
        {content}
      </p>
    </div>
  )
}
