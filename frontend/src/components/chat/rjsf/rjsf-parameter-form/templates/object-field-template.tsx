import * as React from "react"
import type { ObjectFieldTemplateProps } from "@rjsf/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Object field template with optional collapsible support.
 *
 * For regular objects: renders as compact vertical stack
 * For collapsible objects (ui:options.collapsible): renders with expand/collapse header
 */
export const ObjectFieldTemplate = React.memo(function ObjectFieldTemplate(
  props: ObjectFieldTemplateProps
) {
  const { properties, uiSchema, title, fieldPathId } = props

  // Check if this object should be collapsible
  const isCollapsible = uiSchema?.["ui:options"]?.collapsible === true
  const defaultCollapsed = uiSchema?.["ui:options"]?.defaultCollapsed === true
  const displayTitle = (uiSchema?.["ui:title"] as string) || title || "Options"

  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  // For root object or non-collapsible objects, render normally
  // fieldPathId.$id is "root" for root level objects
  const isRoot = !fieldPathId || fieldPathId.$id === "root"
  if (!isCollapsible || isRoot) {
    return (
      <div className={cn("space-y-2", isRoot && "px-2")}>
        {properties.map((prop) => (
          <div key={prop.name}>{prop.content}</div>
        ))}
      </div>
    )
  }

  // Render collapsible section
  return (
    <div className="border-[length:var(--card-border-width)] border-[var(--card-border)] rounded-[var(--card-radius)] bg-[var(--card-bg)] overflow-hidden">
      {/* Section header - collapsible */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2.5 py-2 text-left",
          "bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 transition-colors border-b border-[var(--card-header-border)]"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {displayTitle}
        </span>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-2.5 pb-2 pt-1.5 space-y-2">
          {properties.map((prop) => (
            <div key={prop.name}>{prop.content}</div>
          ))}
        </div>
      )}
    </div>
  )
})
