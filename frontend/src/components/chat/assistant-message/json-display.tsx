"use client"

import * as React from "react"
import { memo, useState, useMemo } from "react"
import { Braces, ListTree } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/molecules/tooltip"
import { JsonTreeView } from "../json-tree-view"
import { ScrollArea } from "@/molecules/scroll-area"
import { highlightJSON, parseJsonContent, unwrapForTreeView } from "./utils"

interface JsonDisplayProps {
  title: string
  content: unknown
  maxHeight?: string
  collapsed?: number
  defaultMode?: "tree" | "json"
}

/**
 * JsonDisplay - Displays JSON data with toggle between tree and raw JSON views
 */
export const JsonDisplay = memo(function JsonDisplay({
  title,
  content,
  maxHeight = "280px",
  collapsed = 2,
  defaultMode = "tree",
}: JsonDisplayProps) {
  const [viewMode, setViewMode] = useState<"tree" | "json">(defaultMode)

  // Parse content if it's a JSON string
  const parsedContent = useMemo(() => parseJsonContent(content), [content])

  // For tree view, unwrap common wrappers like "params" and parse JSON from text arrays
  const treeContent = useMemo(() => unwrapForTreeView(parsedContent), [parsedContent])

  // Can show tree view if either parsed or unwrapped content is an object/array
  const canShowTree = (parsedContent !== null && typeof parsedContent === "object") ||
                      (treeContent !== null && typeof treeContent === "object")

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        {canShowTree && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => setViewMode(viewMode === "tree" ? "json" : "tree")}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  />
                }
              >
                {viewMode === "tree" ? (
                  <Braces className="h-3 w-3" />
                ) : (
                  <ListTree className="h-3 w-3" />
                )}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {viewMode === "tree" ? "View as JSON" : "View as Tree"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {viewMode === "tree" && canShowTree ? (
        <JsonTreeView
          data={typeof treeContent === "object" ? treeContent : parsedContent}
          maxHeight={maxHeight}
          collapsed={collapsed}
          displayObjectSize={false}
          enableClipboard={true}
        />
      ) : (
        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700/50">
          <ScrollArea className="w-full bg-zinc-50 dark:bg-zinc-900/80" style={{ maxHeight }}>
            <pre
              className="p-3 text-[11px] leading-relaxed font-mono text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap break-all"
              dangerouslySetInnerHTML={{ __html: highlightJSON(typeof treeContent === "object" ? treeContent : parsedContent) }}
            />
          </ScrollArea>
        </div>
      )}
    </div>
  )
})
