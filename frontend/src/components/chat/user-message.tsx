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

  return (
    <div className="flex gap-3 justify-end">
      <div
        className={cn(
          "max-w-[80%]",
          // Light theme: blue-tinted background for user messages
          // Dark theme: slate/blue tinted background
          "bg-blue-100 dark:bg-slate-700",
          "rounded-2xl rounded-tr-sm",
          "px-4 py-2.5",
          "shadow-sm"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-100">
          {content}
        </p>
      </div>
      {user?.avatar ? (
        <Image
          src={user.avatar}
          alt={user.name}
          width={28}
          height={28}
          className="flex-shrink-0 w-7 h-7 rounded-full object-cover shadow-sm"
        />
      ) : (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shadow-sm">
          <User className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        </div>
      )}
    </div>
  )
}
