"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { ChevronDown, Check, RefreshCw, Loader2 } from "lucide-react"
import { fetchFieldOptions, FieldOption } from "@/lib/api"
import { useUser } from "@/contexts/user-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"
import { MultiSelectWidget } from "./multi-select-widget"

/**
 * Compact async select widget - h-7, matches other widgets.
 * Auto-derives dependencies from fetchType using entity-config.
 * Proxies to MultiSelectWidget when multiSelect option is true.
 */
export function AsyncSelectWidget(props: WidgetProps) {
  // Early check for multi-select mode - MUST be before any hooks
  const isMultiSelect = props.options?.multiSelect === true

  if (isMultiSelect) {
    return <MultiSelectWidget {...props} />
  }

  // Single-select mode - render as async dropdown
  return <AsyncSelectWidgetInner {...props} />
}

// Inner component to avoid hooks rules violation
function AsyncSelectWidgetInner(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props
  const { getAccessToken, selectedOrganization } = useUser()

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext

  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [fieldOptions, setFieldOptions] = React.useState<FieldOption[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [manualInput, setManualInput] = React.useState(false)

  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const fetchType = options?.fetchType as string | undefined
  const explicitDependsOn = options?.dependsOn as string | undefined
  const showRefresh = (options?.showRefresh as boolean) ?? true
  // Auto-derive dependency from fetchType if not explicitly set
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  const formData = formContext?.formData || {}
  const dependencyValue = dependsOn ? formData[dependsOn] : undefined

  // Get friendly name for dependency field
  const dependencyDisplayName = dependsOn ? getParamDisplayName(dependsOn) : ""

  const loadOptions = React.useCallback(async () => {
    if (!fetchType) { setManualInput(true); return }
    if (dependsOn && !dependencyValue) { setFieldOptions([]); return }

    setLoading(true)
    setError(null)
    try {
      const accessToken = await getAccessToken()
      const response = await fetchFieldOptions(fetchType, accessToken, dependencyValue, selectedOrganization?.id)
      if (response.manual_input) { setManualInput(true); setFieldOptions([]) }
      else { setFieldOptions(response.options); setManualInput(false) }
    } catch (err) {
      console.error("[AsyncSelectWidget] Error:", err)
      setError("Failed to load")
      setManualInput(true)
    } finally { setLoading(false) }
  }, [fetchType, dependsOn, dependencyValue, getAccessToken, selectedOrganization?.id])

  React.useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const handleRefresh = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    await loadOptions()
  }, [loadOptions])

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleSelect = React.useCallback((val: string) => { onChange(val); setOpen(false) }, [onChange])

  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const option = fieldOptions.find((o) => o.value === value)
    return option?.label || value
  }, [value, fieldOptions])

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
    <input id={id} value={value || ""} onChange={(e) => onChange(e.target.value)}
      disabled={disabled || readonly} placeholder={placeholder}
      className={cn("flex h-7 w-full rounded border px-2 py-1 text-xs",
        "bg-transparent dark:bg-input/30 border-input",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]")} />,
    canRefresh
  )

  if (manualInput || !fetchType) {
    const placeholder = dependsOn && !dependencyValue ? "Select " + dependencyDisplayName + " first" : "Enter value..."
    return renderInput(placeholder, false)
  }

  if (loading) {
    return renderWithRefresh(
      <div className={cn("flex h-7 w-full items-center gap-2 rounded border px-2 text-xs",
        "bg-transparent dark:bg-input/30 border-input text-muted-foreground")}>
        <Loader2 className="h-3 w-3 animate-spin" /><span>Loading...</span>
      </div>,
      false
    )
  }

  if (dependsOn && !dependencyValue) {
    return renderWithRefresh(
      <div className={cn("flex h-7 w-full items-center rounded border px-2 text-xs",
        "bg-transparent dark:bg-input/30 border-input text-muted-foreground")}>
        Select {dependencyDisplayName} first
      </div>,
      false
    )
  }

  if (error || fieldOptions.length === 0) return renderInput(error ? "Enter manually..." : "No options", true)

  return (
    <div className="relative flex gap-1.5">
      {/* Select trigger */}
      <button ref={triggerRef} type="button" id={id}
        onClick={() => !disabled && !readonly && setOpen(!open)}
        disabled={disabled || readonly}
        className={cn("flex h-7 flex-1 items-center justify-between rounded border px-2 py-1 text-xs",
          "bg-transparent dark:bg-input/30 border-input text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-[color,box-shadow]",
          !displayValue && "text-muted-foreground")}>
        <span className="truncate">{displayValue || "Select..."}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 shrink-0 transition-transform", open && "rotate-180")} />
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
      {open && (
        <div ref={dropdownRef} className={cn(
          "absolute left-0 z-50 mt-8 w-full",
          showRefresh && "w-[calc(100%-2.25rem)]",
          "bg-popover text-popover-foreground",
          "border border-border rounded shadow-md max-h-48 overflow-y-auto animate-in fade-in-0 zoom-in-95")}>
          <div className="p-1">
            {fieldOptions.map((option) => {
              const isSelected = option.value === value
              return (
                <button key={option.value} type="button" onClick={() => handleSelect(option.value)}
                  className={cn("relative flex w-full cursor-pointer items-center rounded py-1 pl-2 pr-6 text-xs outline-none",
                    "hover:bg-accent hover:text-accent-foreground", isSelected && "bg-accent")}>
                  <span className="truncate">{option.label}</span>
                  {isSelected && (<span className="absolute right-2 flex h-3 w-3 items-center justify-center">
                    <Check className="h-3 w-3" /></span>)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
