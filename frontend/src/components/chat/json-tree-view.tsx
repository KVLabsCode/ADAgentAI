"use client"

import * as React from "react"
import JsonView from "@uiw/react-json-view"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/molecules/scroll-area"

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

// Light theme to match the app's light mode
const zincLightTheme = {
  "--w-rjv-font-family": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "--w-rjv-color": "#3f3f46", // zinc-700
  "--w-rjv-key-string": "#7c3aed", // violet-600
  "--w-rjv-background-color": "transparent",
  "--w-rjv-line-color": "#e4e4e7", // zinc-200
  "--w-rjv-arrow-color": "#71717a", // zinc-500
  "--w-rjv-edit-color": "#d97706", // amber-600
  "--w-rjv-info-color": "#a1a1aa", // zinc-400
  "--w-rjv-update-color": "#16a34a", // green-600
  "--w-rjv-copied-color": "#16a34a", // green-600
  "--w-rjv-copied-success-color": "#16a34a", // green-600
  "--w-rjv-curlybraces-color": "transparent", // Hide curly braces
  "--w-rjv-colon-color": "#a1a1aa", // zinc-400 (subtle)
  "--w-rjv-brackets-color": "transparent", // Hide brackets
  "--w-rjv-ellipsis-color": "#71717a", // zinc-500
  "--w-rjv-quotes-color": "transparent", // Hide quotes
  "--w-rjv-quotes-string-color": "transparent", // Hide string quotes
  "--w-rjv-type-string-color": "#52525b", // zinc-600
  "--w-rjv-type-int-color": "#2563eb", // blue-600
  "--w-rjv-type-float-color": "#2563eb", // blue-600
  "--w-rjv-type-bigint-color": "#2563eb", // blue-600
  "--w-rjv-type-boolean-color": "#ea580c", // orange-600
  "--w-rjv-type-date-color": "#db2777", // pink-600
  "--w-rjv-type-url-color": "#0891b2", // cyan-600
  "--w-rjv-type-null-color": "#dc2626", // red-600
  "--w-rjv-type-nan-color": "#dc2626", // red-600
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
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const theme = mounted && resolvedTheme === "light" ? zincLightTheme : zincDarkTheme

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
        "rounded-xl overflow-hidden border bg-card/50",
        "border-zinc-200 dark:border-zinc-700/50",
        className
      )}
    >
      <ScrollArea type="hover" className="w-full" style={{ maxHeight }}>
        <div className="p-3">
          <JsonView
            value={data as object}
            style={theme}
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

/**
 * Compact inline JSON tree view for use in tight spaces (e.g., step details).
 * No border, smaller padding, and smaller max height.
 */
export function JsonTreeViewCompact({
  data,
  collapsed = 2,
  className,
  maxHeight = "180px",
}: Pick<JsonTreeViewProps, "data" | "collapsed" | "className" | "maxHeight">) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const theme = mounted && resolvedTheme === "light" ? zincLightTheme : zincDarkTheme

  // Handle primitive types (strings, numbers, booleans) - display as text, not JSON tree
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return (
      <ScrollArea type="hover" className={cn("w-full", className)} style={{ maxHeight }}>
        <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap py-1">
          {String(data)}
        </pre>
      </ScrollArea>
    )
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return (
      <ScrollArea type="hover" className={cn("w-full", className)} style={{ maxHeight }}>
        <span className="font-mono text-xs text-muted-foreground py-1">
          {data === null ? "null" : "undefined"}
        </span>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea type="hover" className={cn("w-full", className)} style={{ maxHeight }}>
      <div className="py-1">
        <JsonView
          value={data as object}
          style={theme}
          collapsed={collapsed}
          enableClipboard={false}
          displayDataTypes={false}
          displayObjectSize={false}
        />
      </div>
    </ScrollArea>
  )
}

// Re-export for convenience
export { zincDarkTheme, zincLightTheme }
