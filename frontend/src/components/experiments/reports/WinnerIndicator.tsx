"use client"

import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface WinnerIndicatorProps {
  isWinner: boolean
  className?: string
}

export function WinnerIndicator({ isWinner, className }: WinnerIndicatorProps) {
  if (!isWinner) return null

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
        "bg-success/10 text-success text-xs font-medium",
        className
      )}
    >
      <Trophy className="h-3 w-3" />
      WINNER
    </div>
  )
}
