"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  comingSoon?: boolean
}

export interface BaseDropdownProps {
  id: string
  value: string | undefined
  options: DropdownOption[]
  onChange: (value: string) => void
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  placeholder?: string
  displayValue?: string // Override the display value (useful for async widgets)
  className?: string
}

/**
 * Base dropdown component - shared by all select widgets.
 * Uses React Portal with z-index below chat input so dropdown goes behind it when scrolling.
 */
export function BaseDropdown({
  id,
  value,
  options,
  onChange,
  disabled = false,
  readonly = false,
  loading = false,
  placeholder = "Select...",
  displayValue,
  className,
}: BaseDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Get display label
  const label = React.useMemo(() => {
    if (displayValue) return displayValue
    if (!value) return ""
    const selected = options.find(opt => opt.value === value)
    return selected?.label || value
  }, [value, options, displayValue])

  // Update position using requestAnimationFrame loop for smooth 60fps sync
  // This eliminates the lag from scroll event listeners firing less frequently
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current || !dropdownRef.current) return

    const trigger = triggerRef.current
    const dropdown = dropdownRef.current
    let rafId: number

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect()
      dropdown.style.top = `${rect.bottom + 4}px`
      dropdown.style.left = `${rect.left}px`
      dropdown.style.width = `${rect.width}px`
      rafId = requestAnimationFrame(updatePosition)
    }

    // Start the animation loop
    rafId = requestAnimationFrame(updatePosition)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [open])

  // Close on outside click
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Handle selection
  const handleSelect = React.useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  const isDisabled = disabled || readonly || (loading && options.length === 0)

  // Dropdown menu rendered via portal
  const dropdownMenu = open && typeof document !== 'undefined' && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        zIndex: 40, // Below chat input (z-50)
      }}
      className={cn(
        "bg-popover text-popover-foreground",
        "border border-border rounded shadow-md",
        "max-h-80 overflow-y-auto"
      )}
    >
      {options.length > 0 && (
        <div className="p-1">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                disabled={opt.disabled}
                className={cn(
                  "relative flex w-full cursor-pointer items-center rounded py-1 pl-2 pr-6 text-xs outline-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent",
                  opt.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.comingSoon && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Coming Soon
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="absolute right-2 flex h-3 w-3 items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body
  )

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => !isDisabled && setOpen(!open)}
        disabled={isDisabled}
        className={cn(
          "flex h-7 w-full items-center justify-between rounded border px-2 py-1 text-xs",
          "bg-transparent dark:bg-input/30 border-input",
          "text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[color,box-shadow]",
          !label && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {loading ? "Loading..." : label || placeholder}
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 opacity-50 shrink-0 transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {dropdownMenu}
    </div>
  )
}

/**
 * Simple text input fallback - used when no options available
 */
export function FallbackInput({
  id,
  value,
  onChange,
  disabled,
  readonly,
  placeholder,
}: {
  id: string
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  readonly?: boolean
  placeholder: string
}) {
  return (
    <input
      id={id}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || readonly}
      placeholder={placeholder}
      className={cn(
        "flex h-7 w-full rounded border px-2 py-1 text-xs",
        "bg-transparent dark:bg-input/30 border-input",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      )}
    />
  )
}

/**
 * Dependency message - shown when parent field not selected
 */
export function DependencyMessage({ parentLabel }: { parentLabel: string }) {
  return (
    <div className={cn(
      "flex h-7 w-full items-center rounded border px-2 text-xs",
      "bg-transparent dark:bg-input/30 border-input text-muted-foreground"
    )}>
      Select {parentLabel} first
    </div>
  )
}
