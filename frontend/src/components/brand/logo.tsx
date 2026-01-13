"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { box: "h-6 w-6", text: "text-[10px]", name: "text-sm", gap: "gap-2" },
  md: { box: "h-8 w-8", text: "text-xs", name: "text-[15px]", gap: "gap-2.5" },
  lg: { box: "h-10 w-10", text: "text-sm", name: "text-lg", gap: "gap-3" },
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-foreground text-background font-bold",
          s.box,
          s.text
        )}
      >
        AD
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight", s.name)}>
          ADAgentAI
        </span>
      )}
    </div>
  )
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold",
        className
      )}
    >
      AD
    </div>
  )
}
