"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { icon: "h-6 w-6", name: "text-sm", gap: "gap-2" },
  md: { icon: "h-8 w-8", name: "text-[15px]", gap: "gap-2.5" },
  lg: { icon: "h-10 w-10", name: "text-lg", gap: "gap-3" },
}

// Wide spacing version (D further from backslash)
function LogoSvgWide({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("fill-current", className)}
    >
      <path
        d="M 113.431 145.841 L 163.803 145.841 L 251.634 366.159 L 203.467 366.159 L 185.017 319.878 L 92.217 319.878 L 73.767 366.159 L 25.600 366.159 Z M 138.617 201.527 L 108.517 278.990 L 168.717 278.990 Z"
        fillRule="evenodd"
      />
      <path d="M 210.476 145.841 L 258.643 145.841 L 346.474 366.159 L 298.307 366.159 Z" />
      <path d="M 288.410 145.841 L 376.241 145.841 A 110.159 110.159 0 0 1 376.241 366.159 L 376.241 366.159 L 357.039 317.993 L 376.241 317.993 A 61.993 61.993 0 0 0 376.241 194.007 L 307.612 194.007 Z" />
    </svg>
  )
}

// Tight spacing version (D closer to backslash)
function LogoSvgTight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("fill-current", className)}
    >
      <path
        d="M 115.492 143.256 L 167.046 143.256 L 256.938 368.744 L 207.641 368.744 L 188.758 321.377 L 93.780 321.377 L 74.897 368.744 L 25.600 368.744 Z M 141.269 200.249 L 110.462 279.530 L 172.075 279.530 Z"
        fillRule="evenodd"
      />
      <path d="M 214.815 143.256 L 264.112 143.256 L 354.003 368.744 L 304.706 368.744 Z" />
      <path d="M 283.764 143.256 L 373.656 143.256 A 112.744 112.744 0 0 1 373.656 368.744 L 373.656 368.744 L 354.003 319.448 L 373.656 319.448 A 63.448 63.448 0 0 0 373.656 192.552 L 303.416 192.552 Z" />
    </svg>
  )
}

// Default export uses wide version
function LogoSvg({ className, variant = "wide" }: { className?: string; variant?: "wide" | "tight" }) {
  return variant === "wide"
    ? <LogoSvgWide className={className} />
    : <LogoSvgTight className={className} />
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const [variant, setVariant] = useState<"wide" | "tight">("wide")
  const s = sizes[size]

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <LogoSvg className={cn(s.icon, "text-foreground")} variant={variant} />
      {showText && (
        <span className={cn("font-semibold tracking-tight", s.name)}>
          ADAgentAI
        </span>
      )}
      {/* Temporary toggle dot - remove later */}
      <button
        onClick={() => setVariant(v => v === "wide" ? "tight" : "wide")}
        className="ml-1 h-2 w-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
        title={`Current: ${variant} (click to toggle)`}
      />
    </div>
  )
}

export function LogoIcon({ className }: { className?: string }) {
  return <LogoSvgWide className={cn("h-8 w-8 text-foreground", className)} />
}

export { LogoSvg, LogoSvgWide, LogoSvgTight }
