"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, RefreshCw, X, Check } from "lucide-react"
import { useEntityData } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"

/**
 * Compact multi-select widget - h-7 base, square refresh button.
 */
export function MultiSelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext

  const {
    getCachedEntities,
    fetchEntities,
    isLoading,
    getError,
    getDisplayNames,
  } = useEntityData()

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  const fetchType = options?.fetchType as string | undefined
  const explicitDependsOn = options?.dependsOn as string | undefined
  const showRefresh = (options?.showRefresh as boolean) ?? true
  const maxItems = options?.maxItems as number | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  const formData = formContext?.formData || {}
  const dependencyValue = dependsOn ? (formData[dependsOn] as string | undefined) : undefined
  const parentId = dependencyValue ?? null

  const selectedIds = React.useMemo<string[]>(() => {
    if (!value) return []
    if (Array.isArray(value)) return value as string[]
    if (typeof value === "string") {
      return value.split(",").map((s) => s.trim()).filter(Boolean)
    }
    return []
  }, [value])

  const cachedItems = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId)
  }, [fetchType, parentId, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId) : false
  const error = fetchType ? getError(fetchType, parentId) : null

  const selectedNames = React.useMemo(() => {
    if (!fetchType || selectedIds.length === 0) return []
    return getDisplayNames(fetchType, selectedIds, parentId)
  }, [fetchType, selectedIds, parentId, getDisplayNames])

  const selectedItems = React.useMemo(() => {
    return selectedIds.map((id, i) => ({
      id,
      name: selectedNames[i] || id,
    }))
  }, [selectedIds, selectedNames])

  const filteredItems = React.useMemo(() => {
    if (!search) return cachedItems
    const lower = search.toLowerCase()
    return cachedItems.filter((item) =>
      item.name.toLowerCase().includes(lower) ||
      item.id.toLowerCase().includes(lower)
    )
  }, [cachedItems, search])

  React.useEffect(() => {
    if (!fetchType) return
    if (dependsOn && !dependencyValue) return
    fetchEntities(fetchType, parentId, false)
  }, [fetchType, dependsOn, dependencyValue, parentId, fetchEntities])

  const handleRefresh = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!fetchType) return
    await fetchEntities(fetchType, parentId, true)
  }, [fetchType, parentId, fetchEntities])

  const prevDependencyRef = React.useRef(dependencyValue)
  React.useEffect(() => {
    if (dependsOn && prevDependencyRef.current !== dependencyValue) {
      if (prevDependencyRef.current !== undefined && selectedIds.length > 0) {
        onChange([])
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, selectedIds.length, onChange])

  React.useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const toggleItem = React.useCallback(
    (itemId: string) => {
      const newSelected = selectedIds.includes(itemId)
        ? selectedIds.filter((id) => id !== itemId)
        : maxItems && selectedIds.length >= maxItems
        ? selectedIds
        : [...selectedIds, itemId]
      onChange(newSelected)
    },
    [selectedIds, maxItems, onChange]
  )

  const removeItem = React.useCallback(
    (itemId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(selectedIds.filter((id) => id !== itemId))
    },
    [selectedIds, onChange]
  )

  // Wrapper to maintain consistent layout with refresh button
  const renderWithRefresh = (content: React.ReactNode, canRefresh = false) => (
    <div className="relative flex gap-1.5">
      <div className="flex-1 min-w-0">{content}</div>
      {showRefresh && (
        <button
          type="button"
          onClick={canRefresh ? handleRefresh : undefined}
          disabled={!canRefresh || loading || disabled || readonly}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded border shrink-0",
            "bg-transparent dark:bg-input/30 border-input",
            "text-muted-foreground",
            canRefresh ? "hover:text-foreground hover:bg-accent" : "opacity-30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors"
          )}
          title={canRefresh ? "Refresh" : "Manual input"}
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      )}
    </div>
  )

  const renderInput = (placeholder: string, canRefresh = false) => renderWithRefresh(
    <input
      id={id}
      value={Array.isArray(value) ? value.join(", ") : value || ""}
      onChange={(e) => {
        const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
        onChange(vals)
      }}
      disabled={disabled || readonly}
      placeholder={placeholder}
      className={cn(
        "flex h-7 w-full rounded border px-2 py-1 text-xs",
        "bg-transparent dark:bg-input/30 border-input",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      )}
    />,
    canRefresh
  )

  if (!fetchType) return renderInput("Comma-separated values...", false)

  if (dependsOn && !dependencyValue) {
    const parentLabel = getParamDisplayName(dependsOn)
    return renderWithRefresh(
      <div className={cn(
        "flex h-7 w-full items-center rounded border px-2 text-xs",
        "bg-transparent dark:bg-input/30 border-input text-muted-foreground"
      )}>
        Select {parentLabel} first
      </div>,
      false
    )
  }

  const hasData = cachedItems.length > 0
  if (error && !hasData) return renderInput("Enter manually...", true)
  if (!hasData && !loading) return renderInput("No options", true)

  return (
    <div className="relative flex gap-1.5">
      {/* Trigger with tags */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        className={cn(
          "flex min-h-7 flex-1 flex-wrap items-center gap-1 rounded border px-1.5 py-1",
          "bg-transparent dark:bg-input/30 border-input",
          "cursor-pointer transition-[color,box-shadow]",
          open && "border-ring ring-ring/50 ring-[3px]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => (
            <span
              key={item.id}
              data-testid="entity-chip"
              data-entity-id={item.id}
              data-entity-name={item.name}
              data-is-resolved={item.name !== item.id}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px]",
                "bg-secondary text-secondary-foreground border-transparent"
              )}
            >
              <span className="truncate max-w-[80px]">{item.name}</span>
              <X
                className="h-2.5 w-2.5 cursor-pointer opacity-70 hover:opacity-100"
                onClick={(e) => removeItem(item.id, e)}
              />
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground px-0.5">
            {loading ? "Loading..." : "Select..."}
          </span>
        )}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 ml-auto opacity-50 shrink-0 transition-transform",
          open && "rotate-180"
        )} />
      </div>

      {/* Square refresh button */}
      {showRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || disabled || readonly}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded border shrink-0",
            "bg-transparent dark:bg-input/30 border-input",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors"
          )}
          title="Refresh"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      )}

      {/* Dropdown */}
      {open && hasData && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 z-50 mt-8 w-full",
            showRefresh && "w-[calc(100%-2.25rem)]",
            "bg-popover text-popover-foreground",
            "border border-border rounded shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {/* Search */}
          <div className="p-1.5 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className={cn(
                "flex h-6 w-full rounded border px-2 py-1 text-xs",
                "bg-transparent border-input",
                "text-foreground placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:border-ring"
              )}
            />
          </div>

          {/* Options */}
          <div className="max-h-36 overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="py-1.5 text-center text-xs text-muted-foreground">
                No matches
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                const isDisabled = !isSelected && maxItems && selectedIds.length >= maxItems

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid="dropdown-option"
                    data-option-id={item.id}
                    data-option-name={item.name}
                    data-option-selected={isSelected}
                    onClick={() => !isDisabled && toggleItem(item.id)}
                    disabled={isDisabled as boolean}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center gap-1.5 rounded py-1 pl-1.5 pr-6 text-xs outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <span className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded border",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input"
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
              <span>{selectedItems.length} selected{maxItems && ` / ${maxItems}`}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                className="hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
