"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { DollarSign, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Currency input widget for CPM fields.
 * Displays value in dollars ($1.50) but stores value in micros (1500000).
 *
 * Conversion: 1 USD = 1,000,000 micros
 *
 * Usage in uiSchema:
 * "cpm_floor": { "ui:widget": "CurrencyWidget" }
 *
 * Features:
 * - Shows $ symbol prefix
 * - +/- stepper buttons for easy adjustment
 * - Accepts decimal input (up to 2 decimal places)
 * - Converts to/from micros automatically
 * - Validates positive numbers only
 */
export function CurrencyWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, placeholder, options } = props

  // Step amount in dollars (default $0.10)
  const step = (options?.step as number) ?? 0.1

  // Convert micros to dollars for display
  const microsToDollars = React.useCallback((micros: number | string | undefined): string => {
    if (micros === undefined || micros === null || micros === "") return ""
    const numMicros = typeof micros === "string" ? parseInt(micros, 10) : micros
    if (isNaN(numMicros)) return ""
    // Convert micros to dollars (divide by 1,000,000)
    const dollars = numMicros / 1_000_000
    // Format to 2 decimal places, but trim trailing zeros
    return dollars.toFixed(2).replace(/\.?0+$/, "") || "0"
  }, [])

  // Convert dollars to micros for storage
  const dollarsToMicros = React.useCallback((dollars: string): number | undefined => {
    if (!dollars || dollars === "" || dollars === ".") return undefined
    const numDollars = parseFloat(dollars)
    if (isNaN(numDollars) || numDollars < 0) return undefined
    // Convert dollars to micros (multiply by 1,000,000)
    return Math.round(numDollars * 1_000_000)
  }, [])

  // Local state for the input value (in dollars)
  const [inputValue, setInputValue] = React.useState(() => microsToDollars(value))

  // Sync input value when external value changes
  React.useEffect(() => {
    const dollarValue = microsToDollars(value)
    if (dollarValue !== inputValue) {
      setInputValue(dollarValue)
    }
  }, [value, microsToDollars]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Allow empty, numbers, and decimals only
      if (newValue !== "" && !/^\d*\.?\d{0,2}$/.test(newValue)) {
        return
      }

      setInputValue(newValue)

      // Convert to micros and update parent
      const micros = dollarsToMicros(newValue)
      onChange(micros)
    },
    [onChange, dollarsToMicros]
  )

  const handleBlur = React.useCallback(() => {
    // On blur, format the value properly
    if (inputValue === "" || inputValue === ".") {
      setInputValue("")
      onChange(undefined)
      return
    }

    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      // Format to 2 decimal places on blur
      setInputValue(numValue.toFixed(2))
    }
  }, [inputValue, onChange])

  const handleStep = React.useCallback(
    (direction: "up" | "down") => {
      const current = parseFloat(inputValue) || 0
      const newValue = direction === "up" ? current + step : Math.max(0, current - step)
      const formatted = newValue.toFixed(2)
      setInputValue(formatted)
      onChange(dollarsToMicros(formatted))
    },
    [inputValue, step, onChange, dollarsToMicros]
  )

  const isDisabled = disabled || readonly

  return (
    <div className="flex items-center gap-1">
      {/* Input with dollar prefix */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            "absolute left-0 flex h-7 w-7 items-center justify-center",
            "text-muted-foreground border-r border-input",
            "bg-muted/30 rounded-l pointer-events-none"
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isDisabled}
          placeholder={placeholder || "0.00"}
          className={cn(
            "flex h-7 w-full rounded border px-2 py-1 text-xs",
            "pl-9", // Space for dollar symbol
            "bg-[var(--input-bg)] border-[var(--input-border)]",
            "text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-[color,box-shadow]",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
      </div>

      {/* Stepper buttons together on right */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={() => handleStep("down")}
          disabled={isDisabled}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-l border border-r-0",
            "bg-muted/30 hover:bg-[var(--input-bg)] border-[var(--input-border)] transition-colors",
            "text-muted-foreground hover:text-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          tabIndex={-1}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleStep("up")}
          disabled={isDisabled}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-r border",
            "bg-muted/30 hover:bg-[var(--input-bg)] border-[var(--input-border)] transition-colors",
            "text-muted-foreground hover:text-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          tabIndex={-1}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
