"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"

/**
 * Square toggle button widget for ENABLED/DISABLED state fields.
 * Uses a 7x7 square button with Power icon - consistent with other toggles.
 *
 * Usage in uiSchema:
 * "state": { "ui:widget": "ToggleWidget" }
 */
export function ToggleWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly } = props

  const isEnabled = value === "ENABLED"

  const handleToggle = React.useCallback(() => {
    if (disabled || readonly) return
    onChange(isEnabled ? "DISABLED" : "ENABLED")
  }, [disabled, readonly, isEnabled, onChange])

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={isEnabled}
      onClick={handleToggle}
      disabled={disabled || readonly}
      title={isEnabled ? "Enabled - click to disable" : "Disabled - click to enable"}
      className={cn(
        "h-7 w-7 rounded flex items-center justify-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isEnabled
          ? "bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/40"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
    >
      <Power className="h-3.5 w-3.5" />
    </button>
  )
}
