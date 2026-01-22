"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, X, Check, AlertTriangle } from "lucide-react"
import { useEntityData } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"
import type { FieldFilterParams } from "@/lib/api"

/**
 * Resolved entity from backend enrichment
 */
interface ResolvedEntity {
  id: string
  name: string | null
  valid: boolean
}

/**
 * Get backend-resolved ad units from enrichedFields (passed via formContext)
 * enrichedFields contains underscore-prefixed fields that RJSF would filter out
 */
function getResolvedAdUnits(enrichedFields: Record<string, unknown> | undefined): ResolvedEntity[] | null {
  if (!enrichedFields) return null

  if (Array.isArray(enrichedFields._resolved_ad_units)) {
    return enrichedFields._resolved_ad_units as ResolvedEntity[]
  }

  return null
}

/**
 * Multi-select widget for selecting multiple entities.
 * Fetches options from API with caching. No refresh button - uses cached data.
 *
 * Supports two types of dependencies:
 * 1. Structural dependencies (dependsOn): Parent-child relationships where changing
 *    parent means ALL child options change. Clears selection when parent changes.
 * 2. Filter dependencies (filterBy): Filter criteria where changing filter may still
 *    leave some options valid. Keeps valid selections when filter changes.
 *
 * Also supports backend-resolved entity names via _resolved_ad_units field.
 */
export function MultiSelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  // formContext includes formData, updateArrayItemField, and enrichedFields
  const formContext = (registry as { formContext?: {
    formData?: Record<string, unknown>
    enrichedFields?: Record<string, unknown>
  } })?.formContext

  // Stable empty object to avoid creating new reference each render
  const emptyFormData = React.useMemo<Record<string, unknown>>(() => ({}), [])

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
  const maxItems = options?.maxItems as number | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  // Filter dependencies - fields that filter this field's options (don't clear selection)
  const filterBy = options?.filterBy as string[] | undefined

  const formData = formContext?.formData || emptyFormData
  const dependencyValue = dependsOn ? (formData[dependsOn] as string | undefined) : undefined
  const parentId = dependencyValue ?? null

  // Build filter params from filterBy fields
  const filterParams = React.useMemo<FieldFilterParams | undefined>(() => {
    if (!filterBy || filterBy.length === 0) return undefined

    const params: FieldFilterParams = {}
    for (const field of filterBy) {
      const fieldValue = formData[field] as string | undefined
      if (fieldValue) {
        if (field === "platform") params.platform = fieldValue
        else if (field === "ad_format" || field === "adFormat") params.adFormat = fieldValue
        else if (field === "app_id" || field === "appId") params.appId = fieldValue
      }
    }

    return Object.keys(params).length > 0 ? params : undefined
  }, [filterBy, formData])

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
    return getCachedEntities(fetchType, parentId, filterParams)
  }, [fetchType, parentId, filterParams, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId, filterParams) : false
  const error = fetchType ? getError(fetchType, parentId, filterParams) : null

  // Get backend-resolved ad units from enrichedFields (if available)
  const enrichedFields = formContext?.enrichedFields
  const resolvedAdUnits = React.useMemo(() => {
    if (fetchType !== "ad_units") return null
    return getResolvedAdUnits(enrichedFields)
  }, [fetchType, enrichedFields])

  // Build a map of resolved IDs for quick lookup
  const resolvedMap = React.useMemo(() => {
    if (!resolvedAdUnits) return null
    const map = new Map<string, ResolvedEntity>()
    for (const entity of resolvedAdUnits) {
      map.set(entity.id, entity)
    }
    return map
  }, [resolvedAdUnits])

  const selectedNames = React.useMemo(() => {
    if (!fetchType || selectedIds.length === 0) return []
    return getDisplayNames(fetchType, selectedIds, parentId)
  }, [fetchType, selectedIds, parentId, getDisplayNames])

  // Check if any selected items are invalid (backend-resolved as invalid)
  const hasInvalidItems = React.useMemo(() => {
    if (!resolvedMap) return false
    return selectedIds.some(id => {
      const resolved = resolvedMap.get(id)
      return resolved && resolved.valid === false
    })
  }, [selectedIds, resolvedMap])

  const selectedItems = React.useMemo(() => {
    return selectedIds.map((id, i) => {
      // Priority 1: Use backend-resolved name if available
      const resolved = resolvedMap?.get(id)
      if (resolved) {
        return {
          id,
          name: resolved.name || id,
          valid: resolved.valid,
        }
      }
      // Priority 2: Use entity data context name
      return {
        id,
        name: selectedNames[i] || id,
        valid: true, // Assume valid if not backend-resolved
      }
    })
  }, [selectedIds, selectedNames, resolvedMap])

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
    fetchEntities(fetchType, parentId, false, filterParams)
  }, [fetchType, dependsOn, dependencyValue, parentId, filterParams, fetchEntities])

  // Clear selection when structural dependency (dependsOn) changes
  const prevDependencyRef = React.useRef(dependencyValue)
  React.useEffect(() => {
    if (dependsOn && prevDependencyRef.current !== dependencyValue) {
      if (prevDependencyRef.current !== undefined && selectedIds.length > 0) {
        onChange([])
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, selectedIds.length, onChange])

  // Clear selection when filter dependencies (filterBy) change
  const prevFilterParamsRef = React.useRef(filterParams)
  React.useEffect(() => {
    if (filterBy && filterBy.length > 0) {
      const prevJson = JSON.stringify(prevFilterParamsRef.current)
      const currJson = JSON.stringify(filterParams)
      if (prevJson !== currJson && prevFilterParamsRef.current !== undefined && selectedIds.length > 0) {
        onChange([])
      }
      prevFilterParamsRef.current = filterParams
    }
  }, [filterBy, filterParams, selectedIds.length, onChange])

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

  // Simple text input fallback
  const renderInput = (placeholder: string) => (
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
    />
  )

  if (!fetchType) return renderInput("Comma-separated values...")

  if (dependsOn && !dependencyValue) {
    const parentLabel = getParamDisplayName(dependsOn)
    return (
      <div className={cn(
        "flex h-7 w-full items-center rounded border px-2 text-xs",
        "bg-transparent dark:bg-input/30 border-input text-muted-foreground"
      )}>
        Select {parentLabel} first
      </div>
    )
  }

  const hasData = cachedItems.length > 0
  if (error && !hasData) return renderInput("Enter manually...")
  if (!hasData && !loading) return renderInput("No options")

  return (
    <div className="relative">
      {/* Trigger with tags */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        className={cn(
          "flex min-h-7 w-full flex-wrap items-center gap-1 rounded border px-1.5 py-1",
          "bg-transparent dark:bg-input/30 border-input",
          "cursor-pointer transition-[color,box-shadow]",
          open && "border-ring ring-ring/50 ring-[3px]",
          disabled && "cursor-not-allowed opacity-50",
          hasInvalidItems && "border-destructive ring-destructive/20"
        )}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => {
            const isInvalid = "valid" in item && item.valid === false
            return (
              <span
                key={item.id}
                data-testid="entity-chip"
                data-entity-id={item.id}
                data-entity-name={item.name}
                data-is-resolved={item.name !== item.id}
                data-is-invalid={isInvalid}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px]",
                  isInvalid
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-secondary text-secondary-foreground border-transparent"
                )}
              >
                {isInvalid && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                <span className="truncate max-w-[80px]">{isInvalid ? "Invalid" : item.name}</span>
                <X
                  className="h-2.5 w-2.5 cursor-pointer opacity-70 hover:opacity-100"
                  onClick={(e) => removeItem(item.id, e)}
                />
              </span>
            )
          })
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

      {/* Dropdown */}
      {open && hasData && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 z-50 mt-1 w-full",
            "bg-popover text-popover-foreground",
            "border border-border rounded shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{ willChange: "transform" }}
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
          <div className="max-h-80 overflow-y-auto p-1">
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

      {/* Error message for invalid items */}
      {hasInvalidItems && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Some IDs are invalid - select valid options from dropdown</span>
        </div>
      )}
    </div>
  )
}
