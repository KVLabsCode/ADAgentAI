"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { useEntityData } from "@/contexts/entity-data-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import type { FieldFilterParams } from "@/lib/api"
import { BaseDropdown, FallbackInput, DependencyMessage } from "./base-dropdown"

/**
 * Entity select widget for async data fetching.
 * Uses shared BaseDropdown for consistent styling.
 * Fetches options from API with caching.
 *
 * Supports two types of dependencies:
 * 1. Structural dependencies (dependsOn): Parent-child relationships where changing
 *    parent means ALL child options change. Clears selection when parent changes.
 *    Example: account_id → app_id
 *
 * 2. Filter dependencies (filterBy): Filter criteria where changing filter may still
 *    leave some options valid. Keeps valid selections when filter changes.
 *    Example: ad_format → ad_unit_ids
 */
export function EntitySelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext

  // Stable empty object to avoid creating new reference each render
  const emptyFormData = React.useMemo<Record<string, unknown>>(() => ({}), [])

  const {
    getCachedEntities,
    fetchEntities,
    isLoading,
    getError,
    getDisplayName,
  } = useEntityData()

  const fetchType = options?.fetchType as string | undefined
  const explicitDependsOn = options?.dependsOn as string | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  // Filter dependencies - fields that filter this field's options (don't clear selection)
  const filterBy = options?.filterBy as string[] | undefined // e.g., ["platform", "ad_format"]

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
        // Map field names to filter param keys
        if (field === "platform") params.platform = fieldValue
        else if (field === "ad_format" || field === "adFormat") params.adFormat = fieldValue
        else if (field === "app_id" || field === "appId") params.appId = fieldValue
      }
    }

    // Only return if we have at least one filter
    return Object.keys(params).length > 0 ? params : undefined
  }, [filterBy, formData])

  const cachedItems = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId, filterParams)
  }, [fetchType, parentId, filterParams, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId, filterParams) : false
  const error = fetchType ? getError(fetchType, parentId, filterParams) : null

  React.useEffect(() => {
    if (!fetchType) return
    if (dependsOn && !dependencyValue) return
    fetchEntities(fetchType, parentId, false, filterParams)
  }, [fetchType, dependsOn, dependencyValue, parentId, filterParams, fetchEntities])

  // Clear selection when structural dependency (dependsOn) changes
  const prevDependencyRef = React.useRef(dependencyValue)
  React.useEffect(() => {
    if (dependsOn && prevDependencyRef.current !== dependencyValue) {
      if (prevDependencyRef.current !== undefined && value) {
        onChange("")
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, value, onChange])

  // Note: For filter dependencies (filterBy), we don't clear selection automatically.

  // Convert cached items to dropdown options
  const dropdownOptions = React.useMemo(() => {
    return cachedItems.map(item => ({
      value: item.id,
      label: item.name,
      disabled: item.disabled === true,
      comingSoon: item.comingSoon === true
    }))
  }, [cachedItems])

  const displayValue = React.useMemo(() => {
    if (!value || !fetchType) return ""
    return getDisplayName(fetchType, value, parentId)
  }, [value, fetchType, parentId, getDisplayName])

  if (!fetchType) {
    return <FallbackInput id={id} value={value} onChange={onChange} disabled={disabled} readonly={readonly} placeholder="Enter value..." />
  }

  if (dependsOn && !dependencyValue) {
    return <DependencyMessage parentLabel={getParamDisplayName(dependsOn)} />
  }

  const hasData = dropdownOptions.length > 0
  if (error && !hasData) {
    return <FallbackInput id={id} value={value} onChange={onChange} disabled={disabled} readonly={readonly} placeholder="Enter manually..." />
  }
  if (!hasData && !loading) {
    return <FallbackInput id={id} value={value} onChange={onChange} disabled={disabled} readonly={readonly} placeholder="No options" />
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
      displayValue={displayValue}
    />
  )
}
