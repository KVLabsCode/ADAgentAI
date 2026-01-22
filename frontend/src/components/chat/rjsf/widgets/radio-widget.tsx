"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { cn } from "@/lib/utils"

/**
 * Radio button widget for mutually exclusive options.
 * Used for pricing mode (Fixed CPM vs Network Optimized).
 * Compact inline layout, h-7 height.
 *
 * Usage in uiSchema:
 * "pricing_mode": { "ui:widget": "RadioWidget" }
 *
 * Expects schema.enum or options.enumOptions with values like:
 * ["FIXED", "NETWORK_OPTIMIZED"]
 */
export function RadioWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, schema } = props

  // Get enum options from various sources
  const enumOptions = React.useMemo(() => {
    // 1. options.enumOptions - standard RJSF way
    if (options?.enumOptions && Array.isArray(options.enumOptions)) {
      return options.enumOptions as { value: string; label: string }[]
    }

    // 2. schema.enum - from JSON Schema
    if (schema?.enum && Array.isArray(schema.enum)) {
      return (schema.enum as unknown[])
        .filter((val): val is string => typeof val === "string")
        .map((val) => ({
          value: val,
          label: formatLabel(val),
        }))
    }

    // 3. oneOf pattern
    if (schema?.oneOf && Array.isArray(schema.oneOf)) {
      return (schema.oneOf as Array<{ const: string; title?: string }>)
        .filter((item) => typeof item.const === "string")
        .map((item) => ({
          value: item.const,
          label: item.title || formatLabel(item.const),
        }))
    }

    return []
  }, [options, schema])

  const handleChange = React.useCallback(
    (newValue: string) => {
      if (disabled || readonly) return
      onChange(newValue)
    },
    [disabled, readonly, onChange]
  )

  if (enumOptions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground h-7 flex items-center">
        No options available
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={id}
      className="flex items-center gap-4 h-7"
    >
      {enumOptions.map((opt) => {
        const isSelected = opt.value === value
        const inputId = `${id}-${opt.value}`

        return (
          <label
            key={opt.value}
            htmlFor={inputId}
            className={cn(
              "flex items-center gap-1.5 cursor-pointer",
              "text-xs font-medium",
              disabled || readonly ? "cursor-not-allowed opacity-50" : "",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {/* Custom radio circle */}
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border-2",
                "transition-colors duration-150",
                isSelected
                  ? "border-emerald-500 dark:border-emerald-400"
                  : "border-zinc-400 dark:border-zinc-600",
                !disabled && !readonly && !isSelected && "hover:border-zinc-500 dark:hover:border-zinc-500"
              )}
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              )}
            </span>

            {/* Hidden actual radio for accessibility */}
            <input
              type="radio"
              id={inputId}
              name={id}
              value={opt.value}
              checked={isSelected}
              onChange={() => handleChange(opt.value)}
              disabled={disabled || readonly}
              className="sr-only"
            />

            {/* Label text */}
            <span>{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}

/**
 * Format enum value to human-readable label
 * "FIXED" -> "Fixed CPM"
 * "NETWORK_OPTIMIZED" -> "Network Optimized"
 */
function formatLabel(value: string): string {
  // Special cases
  if (value === "FIXED") return "Fixed CPM"
  if (value === "NETWORK_OPTIMIZED") return "Network Optimized"

  // Default: convert SCREAMING_SNAKE to Title Case
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
