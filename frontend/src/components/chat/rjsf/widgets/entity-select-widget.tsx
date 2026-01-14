"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, RefreshCw, Check } from "lucide-react"
import { useEntityData } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"

/**
 * Compact entity select widget - h-7, square refresh button.
 */
export function EntitySelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext

  const {
    getCachedEntities,
    fetchEntities,
    isLoading,
    getError,
    getDisplayName,
  } = useEntityData()

  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const fetchType = options?.fetchType as string | undefined
  const explicitDependsOn = options?.dependsOn as string | undefined
  const showRefresh = (options?.showRefresh as boolean) ?? true
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  const formData = formContext?.formData || {}
  const dependencyValue = dependsOn ? (formData[dependsOn] as string | undefined) : undefined
  const parentId = dependencyValue ?? null

  const cachedItems = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId)
  }, [fetchType, parentId, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId) : false
  const error = fetchType ? getError(fetchType, parentId) : null

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
      if (prevDependencyRef.current !== undefined && value) {
        onChange("")
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, value, onChange])

  const displayValue = React.useMemo(() => {
    if (!value || !fetchType) return ""
    return getDisplayName(fetchType, value, parentId)
  }, [value, fetchType, parentId, getDisplayName])

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

  const handleSelect = React.useCallback((itemId: string) => {
    onChange(itemId)
    setOpen(false)
  }, [onChange])

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
    />,
    canRefresh
  )

  if (!fetchType) return renderInput("Enter value...", false)

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
      {/* Select trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        disabled={disabled || readonly || (loading && !hasData)}
        className={cn(
          "flex h-7 flex-1 items-center justify-between rounded border px-2 py-1 text-xs",
          "bg-transparent dark:bg-input/30 border-input",
          "text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[color,box-shadow]",
          !displayValue && "text-muted-foreground",
          loading && "opacity-70"
        )}
      >
        <span className="truncate">
          {loading && !displayValue ? "Loading..." : displayValue || "Select..."}
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 opacity-50 shrink-0 transition-transform",
          open && "rotate-180"
        )} />
      </button>

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
            "absolute left-0 right-0 z-50 mt-8",
            showRefresh && "right-9",
            "bg-popover text-popover-foreground",
            "border border-border rounded shadow-md",
            "max-h-48 overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="p-1">
            {cachedItems.map((item) => {
              const isSelected = item.id === value
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center rounded py-1 pl-2 pr-6 text-xs outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent"
                  )}
                >
                  <span className="truncate">{item.name}</span>
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
