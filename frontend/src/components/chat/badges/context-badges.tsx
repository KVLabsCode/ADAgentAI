"use client"

import * as React from "react"
import { Plus, Smartphone, Plug } from "lucide-react"
import { RemovableBadge } from "@/atoms/badge"
import { Button } from "@/atoms/button"
import { cn } from "@/lib/utils"
import type { SelectedContextItem } from "../command-palette/use-command-palette"

interface ContextBadgesProps {
  items: SelectedContextItem[]
  onRemove: (item: SelectedContextItem) => void
  onAddClick: () => void
  className?: string
}

function getContextIcon(item: SelectedContextItem) {
  if (item.type === "provider") {
    return <Plug className="size-3" />
  }
  if (item.type === "app") {
    return <Smartphone className="size-3" />
  }
  return null
}

function getContextVariant(item: SelectedContextItem) {
  if (item.type === "provider") return "context-provider" as const
  if (item.type === "app") return "context-app" as const
  return "context" as const
}

export function ContextBadges({
  items,
  onRemove,
  onAddClick,
  className,
}: ContextBadgesProps) {
  // Only show if there are items or always show add button
  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item) => (
        <RemovableBadge
          key={`${item.type}-${item.id}`}
          variant={getContextVariant(item)}
          icon={getContextIcon(item)}
          onRemove={() => onRemove(item)}
        >
          {item.name}
        </RemovableBadge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddClick}
        className="h-6 w-6 p-0 rounded-md hover:bg-muted/60"
      >
        <Plus className="size-3.5 text-muted-foreground" />
        <span className="sr-only">Add context</span>
      </Button>
    </div>
  )
}
