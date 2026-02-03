"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/molecules/tooltip"

interface ActionButtonProps {
  icon: LucideIcon
  activeIcon?: LucideIcon
  tooltip: string
  activeTooltip?: string
  isActive?: boolean
  onClick: () => void
  className?: string
  /** Custom class applied when isActive is true (defaults to emerald color) */
  activeClassName?: string
}

/**
 * ActionButton - A reusable icon button with tooltip and active state.
 * Used for actions like copy, like, dislike, share.
 *
 * @example
 * <ActionButton
 *   icon={Copy}
 *   activeIcon={Check}
 *   tooltip="Copy"
 *   activeTooltip="Copied!"
 *   isActive={copied}
 *   onClick={handleCopy}
 * />
 *
 * // With custom active color (e.g., red for dislike)
 * <ActionButton
 *   icon={ThumbsDown}
 *   tooltip="Dislike"
 *   isActive={disliked}
 *   onClick={toggleDislike}
 *   activeClassName="text-red-500 dark:text-red-400"
 * />
 */
export const ActionButton = React.memo(function ActionButton({
  icon: Icon,
  activeIcon,
  tooltip,
  activeTooltip,
  isActive = false,
  onClick,
  className,
  activeClassName = "text-emerald-500 dark:text-emerald-400",
}: ActionButtonProps) {
  const DisplayIcon = isActive && activeIcon ? activeIcon : Icon
  const displayTooltip = isActive && activeTooltip ? activeTooltip : tooltip

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={onClick}
            className={cn(
              "p-2 rounded-lg transition-colors duration-200",
              isActive
                ? cn(activeClassName, "opacity-100")
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100",
              className
            )}
          />
        }
      >
        <DisplayIcon className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {displayTooltip}
      </TooltipContent>
    </Tooltip>
  )
})
