"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
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
    <div className="flex items-start gap-3 justify-end pb-2">
      {/* Message bubble - right-aligned */}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-tr-none px-4 py-2.5",
          "bg-secondary text-secondary-foreground"
        )}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Avatar - on the right for user messages */}
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
    </div>
  )
}
