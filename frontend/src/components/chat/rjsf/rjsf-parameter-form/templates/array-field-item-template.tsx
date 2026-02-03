import * as React from "react"
import type { ArrayFieldItemTemplateProps } from "@rjsf/utils"
import { ChevronDown, ChevronRight, Power, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useArrayFieldContext } from "../context"
import type { FormContextValue } from "../types"

/**
 * ArrayFieldItemTemplate - handles per-item rendering in v6.
 * In RJSF v6, this is where we customize individual array items.
 * Includes collapsible header, status toggle, and delete button.
 */
export const ArrayFieldItemTemplate = React.memo(function ArrayFieldItemTemplate(
  props: ArrayFieldItemTemplateProps
) {
  const { children, index, registry, buttonsProps } = props
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  // Get array field context from parent ArrayFieldTemplate
  const arrayContext = useArrayFieldContext()

  // Get formContext for data and callbacks
  const formContext = registry?.formContext as FormContextValue | undefined

  const formData = formContext?.formData || {}
  const arrayFieldName = arrayContext?.arrayFieldName || ""

  // Get item data from form data
  const arrayData = formData[arrayFieldName] as Array<Record<string, unknown>> | undefined
  const itemFormData = arrayData?.[index]

  // Determine item type for labels from context
  const isBidding = arrayContext?.isBidding ?? false
  const isWaterfall = arrayContext?.isWaterfall ?? false

  const itemLabel =
    (itemFormData?.display_name as string) ||
    `${isBidding ? "Bidder" : isWaterfall ? "Network" : "Line"} ${index + 1}`
  const itemState = (itemFormData?.state as string) || "ENABLED"
  const isEnabled = itemState === "ENABLED"

  const handleToggleState = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      formContext?.updateArrayItemField?.(
        arrayFieldName,
        index,
        "state",
        isEnabled ? "DISABLED" : "ENABLED"
      )
    },
    [formContext, arrayFieldName, index, isEnabled]
  )

  const handleDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      buttonsProps?.onRemoveItem(e)
    },
    [buttonsProps]
  )

  return (
    <div className="border border-input rounded bg-background/80">
      {/* Collapsible header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer",
          "hover:bg-muted/10 transition-colors"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {!isCollapsed ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-xs font-medium flex-1 truncate text-foreground">
          {itemLabel}
        </span>
        {/* Status toggle - square Power button */}
        <button
          type="button"
          onClick={handleToggleState}
          className={cn(
            "h-7 w-7 rounded flex items-center justify-center transition-colors shrink-0",
            isEnabled
              ? "bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/40"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          title={isEnabled ? "Enabled - click to disable" : "Disabled - click to enable"}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
        {/* Delete button */}
        {buttonsProps?.hasRemove && (
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              "h-7 w-7 rounded flex items-center justify-center transition-colors shrink-0",
              "text-destructive/70 hover:text-destructive",
              "hover:bg-destructive/10"
            )}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "px-3 pb-3 pt-3 border-t border-input/50 space-y-2",
          isCollapsed && "hidden"
        )}
      >
        {children}
      </div>
    </div>
  )
})
