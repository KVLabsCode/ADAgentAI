"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { useEntityData } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import { BaseDropdown, FallbackInput, DependencyMessage } from "./base-dropdown"
import { AlertTriangle } from "lucide-react"

/**
 * Parse widget ID to extract array context
 * e.g., "root_bidding_lines_0_ad_source_id" -> { arrayField: "bidding_lines", index: 0 }
 */
function parseArrayItemId(widgetId: string): { arrayField: string; index: number } | null {
  // Pattern: root_<arrayField>_<index>_<fieldName>
  const match = widgetId.match(/^root_(\w+)_(\d+)_/)
  if (!match) return null
  return { arrayField: match[1], index: parseInt(match[2], 10) }
}

/**
 * Get backend-resolved entity data from the array item
 */
function getResolvedEntityData(
  widgetId: string,
  formData: Record<string, unknown>
): { name: string | null; valid: boolean } | null {
  const arrayInfo = parseArrayItemId(widgetId)
  if (!arrayInfo) return null

  const arrayData = formData[arrayInfo.arrayField] as Array<Record<string, unknown>> | undefined
  const item = arrayData?.[arrayInfo.index]
  if (!item) return null

  // Check for backend-enriched fields (_ad_source_name, _ad_source_valid)
  const hasResolvedData = "_ad_source_name" in item || "_ad_source_valid" in item
  if (!hasResolvedData) return null

  return {
    name: item._ad_source_name as string | null,
    valid: item._ad_source_valid !== false, // Default to valid if not explicitly false
  }
}

/**
 * Ad source select widget - fetches ad source options from API.
 * Used for ad_source_id fields in mediation groups.
 *
 * Supports backend-resolved entity names via _ad_source_name and _ad_source_valid fields.
 */
export function AdSourceSelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // Get form data from registry - memoize to prevent new object on every render
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext
  const formData = React.useMemo(
    () => formContext?.formData ?? {},
    [formContext?.formData]
  )

  // Get backend-resolved entity data (if available)
  const resolvedData = React.useMemo(
    () => getResolvedEntityData(id, formData),
    [id, formData]
  )

  // Check if this entity was marked invalid by backend
  const isInvalid = resolvedData?.valid === false

  // Try to get sibling display_name for fallback display
  const siblingDisplayName = React.useMemo(() => {
    const arrayInfo = parseArrayItemId(id)
    if (!arrayInfo) return undefined
    const arrayData = formData[arrayInfo.arrayField] as Array<Record<string, unknown>> | undefined
    return arrayData?.[arrayInfo.index]?.display_name as string | undefined
  }, [id, formData])

  // Entity data for fetching ad sources
  const { getCachedEntities, fetchEntities, isLoading } = useEntityData()

  // Widget options from uiSchema
  const fetchType = options?.fetchType as string | undefined
  const explicitDependsOn = options?.dependsOn as string | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  // Get dependency value (e.g., account_id)
  const dependencyValue = dependsOn ? (formData[dependsOn] as string | undefined) : undefined
  const parentId = dependencyValue ?? null

  // Fetch ad sources
  const cachedItems = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId, undefined)
  }, [fetchType, parentId, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId, undefined) : false

  // Trigger fetch on mount/dependency change
  React.useEffect(() => {
    if (!fetchType) return
    if (dependsOn && !dependencyValue) return
    fetchEntities(fetchType, parentId, false, undefined)
  }, [fetchType, dependsOn, dependencyValue, parentId, fetchEntities])

  // Clear selection when dependency changes
  const prevDependencyRef = React.useRef(dependencyValue)
  React.useEffect(() => {
    if (dependsOn && prevDependencyRef.current !== dependencyValue) {
      if (prevDependencyRef.current !== undefined && value) {
        onChange("")
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, value, onChange])

  // Convert to dropdown options
  const dropdownOptions = React.useMemo(() => {
    return cachedItems.map(item => ({
      value: item.id,
      label: item.name
    }))
  }, [cachedItems])

  // Get display label - prioritize backend-resolved name, then dropdown match, then fallbacks
  const displayLabel = React.useMemo(() => {
    if (!value) return ""

    // While loading, show loading indicator
    if (loading) return "Loading..."

    // If marked invalid by backend, show error message
    if (isInvalid) return "Select from dropdown"

    // Priority 1: Backend-resolved name (most accurate)
    if (resolvedData?.name) return resolvedData.name

    // Priority 2: Try to find matching option from dropdown
    const selected = dropdownOptions.find(opt => opt.value === value)
    if (selected) return selected.label

    // Priority 3: Use sibling display_name (LLM-provided name)
    if (siblingDisplayName) return siblingDisplayName

    // Last resort: show truncated ID
    if (value.length > 12) {
      return `ID: ${value.slice(0, 8)}...${value.slice(-4)}`
    }
    return value
  }, [dropdownOptions, value, loading, siblingDisplayName, resolvedData, isInvalid])

  // Show dependency message if parent not selected
  if (dependsOn && !dependencyValue) {
    return <DependencyMessage parentLabel={getParamDisplayName(dependsOn)} />
  }

  // Fallback to text input if no options
  if (dropdownOptions.length === 0 && !loading) {
    return <FallbackInput id={id} value={value} onChange={onChange} disabled={disabled} readonly={readonly} placeholder="Enter ad source ID..." />
  }

  // Show error state for invalid entities
  if (isInvalid) {
    return (
      <div className="relative">
        <BaseDropdown
          id={id}
          value={value}
          options={dropdownOptions}
          onChange={onChange}
          disabled={disabled}
          readonly={readonly}
          loading={loading}
          displayValue={displayLabel}
          className="border-destructive ring-destructive/20"
        />
        <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Invalid ID - select a valid ad source</span>
        </div>
      </div>
    )
  }

  return (
    <BaseDropdown
      id={id}
      value={value}
      options={dropdownOptions}
      onChange={onChange}
      disabled={disabled}
      readonly={readonly}
      loading={loading}
      displayValue={displayLabel}
    />
  )
}
