import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/atoms/input"

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Callback when the clear button is clicked */
  onClear?: () => void
  /** Show/hide the clear button when there's a value */
  showClear?: boolean
  /** Width of the search input - defaults to 300px (Linear standard) */
  width?: string | number
}

/**
 * SearchInput - Linear-style search input with icon and clear button
 *
 * Uses design tokens for consistent styling:
 * - --input-bg: Background color
 * - --input-border: Border color
 * - --input-height: Height (32px)
 * - --input-radius: Border radius (5px)
 */
function SearchInput({
  className,
  onClear,
  showClear = true,
  width = 300,
  value,
  onChange,
  ...props
}: SearchInputProps) {
  const hasValue = value !== undefined && value !== ""

  const handleClear = React.useCallback(() => {
    onClear?.()
    // Also trigger onChange with empty value for controlled inputs
    if (onChange) {
      const event = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(event)
    }
  }, [onClear, onChange])

  return (
    <div
      className="relative"
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    >
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={onChange}
        className={cn(
          "pl-8 pr-8",
          "!bg-[var(--input-bg)] border-[color:var(--input-border)]",
          // Remove native search input cancel button
          "[&::-webkit-search-cancel-button]:hidden",
          "[&::-webkit-search-decoration]:hidden",
          className
        )}
        {...props}
      />
      {showClear && hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
