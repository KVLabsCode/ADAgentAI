"use client"

import { cn } from "@/lib/utils"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          "bg-primary text-primary-foreground",
          "rounded-br-sm"
        )}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
