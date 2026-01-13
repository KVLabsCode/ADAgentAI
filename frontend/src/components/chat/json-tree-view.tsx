"use client"

import * as React from "react"
import JsonView from "@uiw/react-json-view"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// Custom zinc dark theme to match the app's UI
const zincDarkTheme = {
  "--w-rjv-font-family": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "--w-rjv-color": "#d4d4d8", // zinc-300
  "--w-rjv-key-string": "#a78bfa", // violet-400
  "--w-rjv-background-color": "transparent",
  "--w-rjv-line-color": "#3f3f46", // zinc-700
  "--w-rjv-arrow-color": "#71717a", // zinc-500
  "--w-rjv-edit-color": "#fbbf24", // amber-400
  "--w-rjv-info-color": "#71717a", // zinc-500
  "--w-rjv-update-color": "#4ade80", // green-400
  "--w-rjv-copied-color": "#4ade80", // green-400
  "--w-rjv-copied-success-color": "#4ade80", // green-400
  "--w-rjv-curlybraces-color": "transparent", // Hide curly braces
  "--w-rjv-colon-color": "#52525b", // zinc-600 (subtle)
  "--w-rjv-brackets-color": "transparent", // Hide brackets
  "--w-rjv-ellipsis-color": "#71717a", // zinc-500
  "--w-rjv-quotes-color": "transparent", // Hide quotes
  "--w-rjv-quotes-string-color": "transparent", // Hide string quotes
  "--w-rjv-type-string-color": "#a1a1aa", // zinc-400 (cleaner)
  "--w-rjv-type-int-color": "#60a5fa", // blue-400
  "--w-rjv-type-float-color": "#60a5fa", // blue-400
  "--w-rjv-type-bigint-color": "#60a5fa", // blue-400
  "--w-rjv-type-boolean-color": "#fb923c", // orange-400
  "--w-rjv-type-date-color": "#f472b6", // pink-400
  "--w-rjv-type-url-color": "#22d3ee", // cyan-400
  "--w-rjv-type-null-color": "#ef4444", // red-400
  "--w-rjv-type-nan-color": "#ef4444", // red-400
  "--w-rjv-type-undefined-color": "#71717a", // zinc-500
} as React.CSSProperties

interface JsonTreeViewProps {
  /** JSON data to display */
  data: unknown
  /** Number of levels to expand by default (0 = all collapsed, undefined = all expanded) */
  collapsed?: number | boolean
  /** Enable inline editing */
  editable?: boolean
  /** Callback when a value is edited */
  onEdit?: (opts: {
    value: unknown
    oldValue: unknown
    keyName: string | number
    parentPath: (string | number)[]
  }) => void
  /** Callback when a key/value is added */
  onAdd?: (opts: {
    value: unknown
    keyName: string | number
    parentPath: (string | number)[]
  }) => void
  /** Callback when a key/value is deleted */
  onDelete?: (opts: {
    value: unknown
    keyName: string | number
    parentPath: (string | number)[]
  }) => void
  /** Additional CSS classes */
  className?: string
  /** Max height with scroll */
  maxHeight?: string
  /** Show copy button */
  enableClipboard?: boolean
  /** Display data counts for objects/arrays */
  displayDataTypes?: boolean
  /** Display object size */
  displayObjectSize?: boolean
}

/**
 * JSON Tree View component using @uiw/react-json-view.
 * Provides a collapsible tree view with optional inline editing.
 * Styled to match the app's zinc dark theme.
 */
export function JsonTreeView({
  data,
  collapsed = 2,
  editable = false,
  onEdit,
  onAdd,
  onDelete,
  className,
  maxHeight = "280px",
  enableClipboard = true,
  displayDataTypes = false,
  displayObjectSize = true,
}: JsonTreeViewProps) {
  // Handle edit events
  const handleEdit = React.useCallback(
    (opts: Parameters<NonNullable<typeof onEdit>>[0]) => {
      if (onEdit) {
        onEdit(opts)
      }
    },
    [onEdit]
  )

  // Handle add events
  const handleAdd = React.useCallback(
    (opts: Parameters<NonNullable<typeof onAdd>>[0]) => {
      if (onAdd) {
        onAdd(opts)
      }
    },
    [onAdd]
  )

  // Handle delete events
  const handleDelete = React.useCallback(
    (opts: Parameters<NonNullable<typeof onDelete>>[0]) => {
      if (onDelete) {
        onDelete(opts)
      }
    },
    [onDelete]
  )

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-900/80",
        className
      )}
    >
      <ScrollArea type="hover" className="w-full" style={{ maxHeight }}>
        <div className="p-3">
          <JsonView
            value={data as object}
            style={zincDarkTheme}
            collapsed={collapsed}
            enableClipboard={enableClipboard}
            displayDataTypes={displayDataTypes}
            displayObjectSize={displayObjectSize}
            // Editing props
            {...(editable && {
              editable: true,
              onEdit: handleEdit,
              onAdd: handleAdd,
              onDelete: handleDelete,
            })}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

// Re-export for convenience
export { zincDarkTheme }
