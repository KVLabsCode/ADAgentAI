"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, X, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Common ISO 3166-1 alpha-2 country codes for ad targeting.
 * Sorted by ad market size and user base.
 */
const COMMON_REGIONS = [
  // Tier 1 - Major ad markets
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },

  // Tier 2 - Growth markets
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "MY", name: "Malaysia" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "RO", name: "Romania" },
  { code: "TR", name: "Turkey" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "UAE" },
  { code: "IL", name: "Israel" },
  { code: "ZA", name: "South Africa" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },

  // Other notable regions
  { code: "CN", name: "China" },
  { code: "RU", name: "Russia" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "NG", name: "Nigeria" },
  { code: "EG", name: "Egypt" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "UA", name: "Ukraine" },
]

/**
 * Region codes multi-select widget for targeted/excluded regions.
 * Accepts comma-separated ISO 3166-1 alpha-2 country codes.
 *
 * Usage in uiSchema:
 * "targeted_region_codes": { "ui:widget": "RegionCodesWidget" }
 *
 * Value format: "US,CA,GB" (comma-separated string)
 */
export function RegionCodesWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, placeholder } = props

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Parse current value (comma-separated string) into array
  const selectedCodes = React.useMemo<string[]>(() => {
    if (!value || typeof value !== "string") return []
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }, [value])

  // Get display labels for selected codes
  const selectedLabels = React.useMemo(() => {
    return selectedCodes.map((code) => {
      const region = COMMON_REGIONS.find((r) => r.code === code)
      return region ? `${region.code}` : code
    })
  }, [selectedCodes])

  // Filter regions by search
  const filteredRegions = React.useMemo(() => {
    if (!search) return COMMON_REGIONS
    const lowerSearch = search.toLowerCase()
    return COMMON_REGIONS.filter(
      (r) =>
        r.code.toLowerCase().includes(lowerSearch) ||
        r.name.toLowerCase().includes(lowerSearch)
    )
  }, [search])

  // Toggle a region code
  const toggleRegion = React.useCallback(
    (code: string) => {
      const newCodes = selectedCodes.includes(code)
        ? selectedCodes.filter((c) => c !== code)
        : [...selectedCodes, code]
      onChange(newCodes.length > 0 ? newCodes.join(",") : undefined)
    },
    [selectedCodes, onChange]
  )

  // Remove a specific code
  const removeCode = React.useCallback(
    (code: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const newCodes = selectedCodes.filter((c) => c !== code)
      onChange(newCodes.length > 0 ? newCodes.join(",") : undefined)
    },
    [selectedCodes, onChange]
  )

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        disabled={disabled || readonly}
        className={cn(
          "flex min-h-[1.75rem] w-full items-center justify-between rounded border px-2 py-1 text-xs",
          "bg-[var(--input-bg)] border-[var(--input-border)]",
          "text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[color,box-shadow]"
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">
              {placeholder || "Select regions..."}
            </span>
          ) : (
            selectedLabels.map((label, idx) => (
              <span
                key={selectedCodes[idx]}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                  "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                {label}
                {!disabled && !readonly && (
                  <button
                    type="button"
                    onClick={(e) => removeCode(selectedCodes[idx], e)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 opacity-50 shrink-0 transition-transform ml-1",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 right-0 z-50 mt-1",
            "bg-popover text-popover-foreground",
            "border border-border rounded shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                className={cn(
                  "flex h-7 w-full rounded border px-2 py-1 text-xs pl-7",
                  "bg-[var(--input-bg)] border-[var(--input-border)]",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:border-ring"
                )}
              />
            </div>
          </div>

          {/* Region list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredRegions.length === 0 ? (
              <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                No countries found
              </div>
            ) : (
              filteredRegions.map((region) => {
                const isSelected = selectedCodes.includes(region.code)
                return (
                  <button
                    key={region.code}
                    type="button"
                    onClick={() => toggleRegion(region.code)}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center rounded py-1.5 pl-2 pr-8 text-xs outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <span className="font-mono text-muted-foreground w-8">
                      {region.code}
                    </span>
                    <span className="truncate">{region.name}</span>
                    {isSelected && (
                      <span className="absolute right-2 flex h-3 w-3 items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Quick actions */}
          <div className="p-2 border-t border-border flex gap-2">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => onChange("US,CA,GB,DE,FR,AU")}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Tier 1 (US, CA, GB, DE, FR, AU)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
