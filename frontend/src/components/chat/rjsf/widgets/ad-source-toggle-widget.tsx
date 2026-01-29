"use client"

import * as React from "react"
import { FieldProps } from "@rjsf/utils"
import { useEntityData, EntityItem } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"
import { Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/molecules/scroll-area"

/**
 * Ad Source Toggle Field - Chip-style selectable list for ad source selection.
 * Each row is a clickable chip that highlights when selected.
 */

interface AdSourceLine {
  ad_source_id: string
  state?: string
  pricing_mode?: string
  cpm_floor?: number
  cpm_micros?: number
  experiment_variant?: string
  _ad_source_name?: string
}

interface FormContextType {
  formData?: Record<string, unknown>
  updateArrayField?: (arrayName: string, newArray: unknown[]) => void
}

export function AdSourceToggleField(props: FieldProps) {
  const { formData: value, onChange, disabled, readonly, uiSchema, registry, name } = props

  // Get formContext for direct state updates (avoids RJSF re-render issues)
  const formContext = (registry as { formContext?: FormContextType })?.formContext
  const rootFormData = formContext?.formData ?? {}
  const updateArrayField = formContext?.updateArrayField

  // Get the field name for updateArrayField
  const fieldName = name || ""

  const uiOptions = uiSchema?.["ui:options"] as Record<string, unknown> | undefined
  const fetchType = (uiOptions?.fetchType as string) || "ad_sources"
  const explicitDependsOn = uiOptions?.dependsOn as string | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)
  const isWaterfall = fetchType.includes("waterfall")

  const rawDependencyValue = dependsOn ? (rootFormData[dependsOn] as string | undefined) : undefined
  const dependencyValue = React.useMemo(() => {
    if (!rawDependencyValue) return undefined
    if (rawDependencyValue.startsWith("accounts/")) {
      return rawDependencyValue.replace("accounts/", "")
    }
    return rawDependencyValue
  }, [rawDependencyValue])
  const parentId = dependencyValue ?? null

  const { getCachedEntities, fetchEntities, isLoading } = useEntityData()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [hasFetched, setHasFetched] = React.useState(false)

  const adSources = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId, undefined)
  }, [fetchType, parentId, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId, undefined) : false

  React.useEffect(() => {
    if (!fetchType) return
    if (dependsOn && !dependencyValue) return
    fetchEntities(fetchType, parentId, false, undefined)
  }, [fetchType, dependsOn, dependencyValue, parentId, fetchEntities])

  // Reset hasFetched when parentId changes
  React.useEffect(() => {
    setHasFetched(false)
  }, [parentId])

  // Mark as fetched when we have data
  React.useEffect(() => {
    if (adSources.length > 0) setHasFetched(true)
  }, [adSources.length])

  // Parse current value
  const currentLines = React.useMemo((): AdSourceLine[] => {
    if (!value) return []
    if (Array.isArray(value)) return value as AdSourceLine[]
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed as AdSourceLine[]
      } catch { /* ignore */ }
    }
    return []
  }, [value])

  const validSourceIds = React.useMemo(() => new Set(adSources.map(s => s.id)), [adSources])

  const enabledSourcesMap = React.useMemo(() => {
    const map = new Map<string, AdSourceLine>()
    for (const line of currentLines) {
      if (line.ad_source_id && line.state !== "DISABLED" && line.state !== "REMOVED") {
        if (validSourceIds.has(line.ad_source_id)) {
          map.set(line.ad_source_id, line)
        }
      }
    }
    return map
  }, [currentLines, validSourceIds])

  const sortedSources = React.useMemo(() => {
    return [...adSources].sort((a, b) => {
      // Coming soon always at the bottom
      const aComingSoon = a.comingSoon ? 1 : 0
      const bComingSoon = b.comingSoon ? 1 : 0
      if (aComingSoon !== bComingSoon) return aComingSoon - bComingSoon

      // Within available: enabled first, then alphabetical
      const aEnabled = enabledSourcesMap.has(a.id) ? 0 : 1
      const bEnabled = enabledSourcesMap.has(b.id) ? 0 : 1
      if (aEnabled !== bEnabled) return aEnabled - bEnabled

      return a.name.localeCompare(b.name)
    })
  }, [adSources, enabledSourcesMap])

  // Use formContext.updateArrayField if available, fallback to onChange
  const updateField = React.useCallback((newLines: AdSourceLine[]) => {
    if (updateArrayField && fieldName) {
      updateArrayField(fieldName, newLines)
    } else {
      // Fallback to RJSF onChange (FieldProps requires path as second arg)
      onChange(newLines, [])
    }
  }, [updateArrayField, fieldName, onChange])

  const handleToggle = React.useCallback(
    (sourceId: string, sourceName: string) => {
      if (disabled || readonly) return
      const existingLine = enabledSourcesMap.get(sourceId)
      if (existingLine) {
        const newLines = currentLines.filter((line) => line.ad_source_id !== sourceId)
        updateField(newLines)
      } else {
        const newLine: AdSourceLine = {
          ad_source_id: sourceId,
          state: "ENABLED",
          _ad_source_name: sourceName,
        }
        if (isWaterfall) {
          newLine.pricing_mode = "NETWORK_OPTIMIZED"
        }
        updateField([...currentLines, newLine])
      }
    },
    [disabled, readonly, enabledSourcesMap, currentLines, updateField, isWaterfall]
  )

  const handlePricingModeChange = React.useCallback(
    (sourceId: string, mode: string) => {
      const newLines = currentLines.map((line) => {
        if (line.ad_source_id === sourceId) return { ...line, pricing_mode: mode }
        return line
      })
      updateField(newLines)
    },
    [currentLines, updateField]
  )

  const handleCpmChange = React.useCallback(
    (sourceId: string, cpmValue: string) => {
      const numValue = parseFloat(cpmValue)
      const newLines = currentLines.map((line) => {
        if (line.ad_source_id === sourceId) {
          return { ...line, cpm_floor: isNaN(numValue) ? undefined : numValue }
        }
        return line
      })
      updateField(newLines)
    },
    [currentLines, updateField]
  )

  // Show loading if: explicitly loading, OR we have a parent but haven't fetched yet
  const showLoading = loading || (!hasFetched && adSources.length === 0)

  if (dependsOn && !dependencyValue) {
    return (
      <div className="text-[10px] text-muted-foreground/60 h-6 flex items-center px-2">
        Select {getParamDisplayName(dependsOn)} first
      </div>
    )
  }

  if (showLoading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 h-6 px-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading...
      </div>
    )
  }

  if (adSources.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground/50 italic py-1 px-2">
        No ad sources available
      </div>
    )
  }

  const enabledCount = enabledSourcesMap.size

  return (
    <div className="rounded-[var(--card-radius)] overflow-hidden border-[length:var(--card-border-width)] border-[var(--card-border)] bg-[var(--card-bg)]">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1.5 w-full px-2.5 py-2 text-left bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 transition-colors border-b border-[var(--card-header-border)]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {isWaterfall ? "Waterfall Networks" : "Bidding Networks"}
        </span>
        <span className="text-[11px] text-muted-foreground/60 ml-auto">
          {enabledCount}/{adSources.length}
        </span>
      </button>

      {/* Chip list */}
      {!isCollapsed && (
        <ScrollArea maxHeight="176px">
          {sortedSources.map((source) => (
            <AdSourceChip
              key={source.id}
              source={source}
              isEnabled={enabledSourcesMap.has(source.id)}
              lineData={enabledSourcesMap.get(source.id)}
              isWaterfall={isWaterfall}
              disabled={disabled || readonly || source.disabled}
              onToggle={() => handleToggle(source.id, source.name)}
              onPricingModeChange={(mode) => handlePricingModeChange(source.id, mode)}
              onCpmChange={(val) => handleCpmChange(source.id, val)}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  )
}

interface AdSourceChipProps {
  source: EntityItem
  isEnabled: boolean
  lineData?: AdSourceLine
  isWaterfall: boolean
  disabled?: boolean
  onToggle: () => void
  onPricingModeChange: (mode: string) => void
  onCpmChange: (value: string) => void
}

function AdSourceChip({
  source,
  isEnabled,
  lineData,
  isWaterfall,
  disabled,
  onToggle,
  onPricingModeChange,
  onCpmChange,
}: AdSourceChipProps) {
  const pricingMode = lineData?.pricing_mode || "NETWORK_OPTIMIZED"
  const cpmFloor = lineData?.cpm_floor ?? (lineData?.cpm_micros ? lineData.cpm_micros / 1_000_000 : 1.0)

  // Coming soon items are always non-interactive
  const isComingSoon = source.comingSoon === true
  const isDisabled = disabled || isComingSoon

  return (
    <div className={cn("transition-colors", isDisabled && "opacity-50")}>
      {/* Main row: Name + Soon badge + Toggle */}
      <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-[11px]">
        {/* Network name - strip (bidding) suffix */}
        <span className={cn(
          "flex-1",
          isEnabled && !isDisabled ? "text-foreground" : "text-muted-foreground"
        )}>
          {source.name.replace(/\s*\(bidding\)\s*$/i, "")}
        </span>

        {isComingSoon && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">Soon</span>
        )}

        {/* Toggle switch - rightmost, green when enabled */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={isDisabled}
          onClick={isDisabled ? undefined : onToggle}
          className={cn(
            "relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
            isEnabled ? "bg-success" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
              "translate-y-0.5",
              isEnabled ? "translate-x-3.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Waterfall pricing - expandable row below when enabled */}
      {isWaterfall && isEnabled && (
        <div className="flex items-center gap-3 pl-2.5 pr-2.5 pb-1.5 text-[10px]">
          <span className="text-muted-foreground/60">Pricing:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={`pricing-${source.id}`}
              checked={pricingMode === "FIXED"}
              onChange={() => onPricingModeChange("FIXED")}
              className="h-2.5 w-2.5 accent-primary"
            />
            <span className={pricingMode === "FIXED" ? "text-foreground" : "text-muted-foreground"}>Fixed $</span>
            {pricingMode === "FIXED" && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={cpmFloor || ""}
                onChange={(e) => onCpmChange(e.target.value)}
                className="w-14 h-4 px-1.5 text-[10px] rounded-[var(--input-radius)] border bg-[var(--input-bg)] border-[var(--input-border)] text-foreground focus:outline-none focus:border-ring"
              />
            )}
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={`pricing-${source.id}`}
              checked={pricingMode === "NETWORK_OPTIMIZED"}
              onChange={() => onPricingModeChange("NETWORK_OPTIMIZED")}
              className="h-2.5 w-2.5 accent-primary"
            />
            <span className={pricingMode === "NETWORK_OPTIMIZED" ? "text-foreground" : "text-muted-foreground"}>Network Optimized</span>
          </label>
        </div>
      )}
    </div>
  )
}
