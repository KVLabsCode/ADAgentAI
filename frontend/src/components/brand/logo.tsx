"use client"

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

function LogoSvg({ className }: { className?: string }) {
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

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <LogoSvg className={cn(s.icon, "text-foreground")} />
      {showText && (
        <span className={cn("font-semibold tracking-tight", s.name)}>
          ADAgentAI
        </span>
      )}
    </div>
  )
}

export function LogoIcon({ className }: { className?: string }) {
  return <LogoSvg className={cn("h-8 w-8 text-foreground", className)} />
}

export { LogoSvg }
