"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

type IconBoxColor = "violet" | "amber" | "emerald" | "red" | "zinc"

interface IconBoxProps {
  color: IconBoxColor
  children: React.ReactNode
}

const bgColors: Record<IconBoxColor, string> = {
  violet: "bg-violet-600/60",
  amber: "bg-amber-600/60",
  emerald: "bg-emerald-600/60",
  red: "bg-red-600/60",
  zinc: "bg-zinc-600/60",
}

/**
 * IconBox - Colored square background for icons (higher contrast)
 */
export const IconBox = memo(function IconBox({ color, children }: IconBoxProps) {
  return (
    <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", bgColors[color])}>
      {children}
    </div>
  )
})
