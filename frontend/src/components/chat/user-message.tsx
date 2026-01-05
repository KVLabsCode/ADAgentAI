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
          "bg-muted/60 dark:bg-muted/40",
          "rounded-2xl rounded-tr-sm",
          "px-4 py-2.5"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      {user?.avatar ? (
        <Image
          src={user.avatar}
          alt={user.name}
          width={28}
          height={28}
          className="flex-shrink-0 w-7 h-7 rounded-full object-cover"
        />
      ) : (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
