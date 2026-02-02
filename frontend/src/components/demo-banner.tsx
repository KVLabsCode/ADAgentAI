"use client"

import { X } from "lucide-react"
import { Button } from "@/atoms/button"
import { useDemo } from "@/contexts/demo-mode-context"

interface DemoBannerProps {
  className?: string
}

/**
 * Banner displayed at the top of the viewport when demo mode is active.
 * Shows accent-colored background with message and exit button.
 */
export function DemoBanner({ className }: DemoBannerProps) {
  const { isDemoMode, disableDemoMode } = useDemo()

  if (!isDemoMode) {
    return null
  }

  return (
    <div
      className={`
        sticky top-0 z-[60]
        flex items-center justify-between
        px-4 py-2
        bg-accent text-accent-foreground
        text-sm font-medium
        ${className || ""}
      `}
    >
      <div className="flex-1" />
      <span className="text-center">
        Demo Mode - Using synthetic data
      </span>
      <div className="flex-1 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={disableDemoMode}
          className="h-7 px-2 hover:bg-accent-foreground/10 text-accent-foreground"
        >
          <span className="mr-1">Exit Demo</span>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
