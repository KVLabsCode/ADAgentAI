"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, Check, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Compact select widget - h-7, dark theme.
 */
export function SelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, schema } = props
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Show refresh button for visual consistency (non-functional for static enums)
  const showRefresh = (options?.showRefresh as boolean) ?? true

  const enumOptions = React.useMemo(() => {
    const enumOpts = options?.enumOptions
    const schemaEnum = schema?.enum
    if (enumOpts && Array.isArray(enumOpts)) {
      return enumOpts as { value: string; label: string }[]
    }
    if (schemaEnum && Array.isArray(schemaEnum)) {
      return schemaEnum
        .filter((val): val is string => typeof val === "string")
        .map((val) => ({ value: val, label: val }))
    }
    return []
  }, [options, schema])

  const displayLabel = React.useMemo(() => {
    const selected = enumOptions.find((opt) => opt.value === value)
    return selected?.label || value || ""
  }, [enumOptions, value])

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleSelect = React.useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  if (enumOptions.length === 0) {
    return (
      <div className="relative flex gap-1.5">
        <input
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || readonly}
          className={cn(
            "flex h-7 flex-1 rounded border px-2 py-1 text-xs",
            "bg-transparent dark:bg-input/30 border-input",
            "text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
        />
        {showRefresh && (
          <button
            type="button"
            disabled={true}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded border shrink-0",
              "bg-transparent dark:bg-input/30 border-input",
              "text-muted-foreground opacity-30",
              "cursor-not-allowed"
            )}
            title="Static options"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex gap-1.5">
      {/* Select trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        disabled={disabled || readonly}
        className={cn(
          "flex h-7 flex-1 items-center justify-between rounded border px-2 py-1 text-xs",
          "bg-transparent dark:bg-input/30 border-input",
          "text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[color,box-shadow]",
          !displayLabel && "text-muted-foreground"
        )}
      >
        <span className="truncate">{displayLabel || "Select..."}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 opacity-50 shrink-0 transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {/* Square refresh button (visual consistency - no-op for static enums) */}
      {showRefresh && (
        <button
          type="button"
          disabled={true}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded border shrink-0",
            "bg-transparent dark:bg-input/30 border-input",
            "text-muted-foreground opacity-30",
            "cursor-not-allowed"
          )}
          title="Static options"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 z-50 mt-8",
            showRefresh ? "w-[calc(100%-2.25rem)]" : "w-full",
            "bg-popover text-popover-foreground",
            "border border-border rounded shadow-md",
            "max-h-48 overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="p-1">
            {enumOptions.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center rounded py-1 pl-2 pr-6 text-xs outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="absolute right-2 flex h-3 w-3 items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
