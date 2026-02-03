import * as React from "react"
import type { ArrayFieldTemplateProps } from "@rjsf/utils"
import { Plus, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getParamDisplayName } from "@/lib/entity-config"
import { ArrayFieldContext } from "../context"
import type { FormContextValue } from "../types"

/**
 * Array field template with collapsible section header.
 * In RJSF v6, items are already rendered by ArrayFieldItemTemplate.
 * We just render the section wrapper and {items} directly.
 */
export const ArrayFieldTemplate = React.memo(function ArrayFieldTemplate(
  props: ArrayFieldTemplateProps
) {
  const { items, canAdd, onAddClick, title, schema, uiSchema, registry, fieldPathId } = props
  const [sectionCollapsed, setSectionCollapsed] = React.useState(false)

  // Get display title - prefer uiSchema ui:title, then fallback to schema title
  const uiTitle = uiSchema?.["ui:title"] as string | undefined
  const schemaTitle = (schema as { title?: string }).title
  const fieldName = title || schemaTitle || "Items"

  // Extract actual array field name from fieldPathId (e.g., "root_bidding_lines" -> "bidding_lines")
  const fieldPathIdStr = fieldPathId?.$id || ""
  const arrayFieldName =
    fieldPathIdStr.replace(/^root_/, "") || fieldName.toLowerCase().replace(/\s+/g, "_")

  // Use uiTitle if provided (may include emoji), otherwise format field name
  const displayTitle = uiTitle || getParamDisplayName(arrayFieldName)

  // Determine if this is bidding or waterfall for customized empty state and button
  const isBidding = fieldName.toLowerCase().includes("bidding")
  const isWaterfall = fieldName.toLowerCase().includes("waterfall")

  const { addButtonText, emptyMessage } = React.useMemo(() => {
    if (isBidding) {
      return {
        addButtonText: "Add Bidder",
        emptyMessage:
          'No bidding networks configured. Click "Add Bidder" to add a real-time auction participant.',
      }
    }
    if (isWaterfall) {
      return {
        addButtonText: "Add Network",
        emptyMessage:
          'No waterfall networks configured. Click "Add Network" to add a priority-based ad source.',
      }
    }
    return {
      addButtonText: "Add Line",
      emptyMessage: 'No lines configured. Click "Add Line" to add an entry.',
    }
  }, [isBidding, isWaterfall])

  // Get item count from formData
  const formContext = registry?.formContext as FormContextValue | undefined
  const formData = formContext?.formData || {}
  const itemCount = Array.isArray(formData[arrayFieldName])
    ? (formData[arrayFieldName] as unknown[]).length
    : items.length

  const handleAddClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAddClick()
    },
    [onAddClick]
  )

  // Memoize context value to prevent unnecessary re-renders of children
  const contextValue = React.useMemo(
    () => ({ arrayFieldName, isBidding, isWaterfall }),
    [arrayFieldName, isBidding, isWaterfall]
  )

  return (
    <div className={cn("rounded-lg border", "bg-muted/30 border-border/50")}>
      {/* Section header - clickable to collapse */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 cursor-pointer",
          "hover:bg-muted/50 transition-colors",
          "border-b border-border/30",
          sectionCollapsed && "border-b-0"
        )}
        onClick={() => setSectionCollapsed(!sectionCollapsed)}
      >
        <div className="flex items-center gap-2">
          {sectionCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">{displayTitle}</span>
          <span className="text-xs text-muted-foreground">({itemCount})</span>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={handleAddClick}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs",
              "bg-muted/50 text-foreground hover:bg-muted border border-border/50",
              "transition-colors"
            )}
          >
            <Plus className="h-3 w-3" />
            {addButtonText}
          </button>
        )}
      </div>

      {/* Section content - in v6, just render {items} directly */}
      {!sectionCollapsed && (
        <div className="p-3 space-y-2">
          {itemCount === 0 ? (
            <div className="text-xs text-muted-foreground/60 italic py-2 px-3 border border-dashed border-input/30 rounded bg-background/30">
              {emptyMessage}
            </div>
          ) : (
            <ArrayFieldContext.Provider value={contextValue}>
              <div className="space-y-2">{items}</div>
            </ArrayFieldContext.Provider>
          )}
        </div>
      )}
    </div>
  )
})
