"use client"

import { memo } from "react"
import { AlertTriangle, ArrowRight, KeyRound, Mail, Plug, RefreshCw, Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import { IconBox } from "./icon-box"
import type { ActionRequiredType } from "@/lib/types"

interface ActionRequiredBlockProps {
  actionType: ActionRequiredType
  message: string
  deepLink?: string
  blocking: boolean
  metadata?: Record<string, unknown>
}

type IconColor = "violet" | "amber" | "emerald" | "red" | "zinc"

interface ActionConfig {
  icon: typeof AlertTriangle
  iconColor: IconColor
  buttonText: string
  buttonVariant: "default" | "outline" | "ghost"
}

function getActionConfig(type: ActionRequiredType, metadata?: Record<string, unknown>): ActionConfig {
  switch (type) {
    case "connect_provider":
      return {
        icon: Plug,
        iconColor: "violet",
        buttonText: metadata?.suggested_provider
          ? `Connect ${String(metadata.suggested_provider).charAt(0).toUpperCase() + String(metadata.suggested_provider).slice(1)}`
          : "Connect Provider",
        buttonVariant: "default",
      }
    case "reauthenticate":
      return {
        icon: RefreshCw,
        iconColor: "amber",
        buttonText: "Reconnect",
        buttonVariant: "default",
      }
    case "grant_permissions":
      return {
        icon: KeyRound,
        iconColor: "amber",
        buttonText: "Grant Permissions",
        buttonVariant: "default",
      }
    case "verify_email":
      return {
        icon: Mail,
        iconColor: "emerald",
        buttonText: "Verify Email",
        buttonVariant: "default",
      }
    case "upgrade_plan":
      return {
        icon: Sparkles,
        iconColor: "violet",
        buttonText: "View Plans",
        buttonVariant: "default",
      }
    default:
      return {
        icon: AlertTriangle,
        iconColor: "amber",
        buttonText: "Take Action",
        buttonVariant: "default",
      }
  }
}

const iconColorClasses: Record<IconColor, string> = {
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  zinc: "text-zinc-600 dark:text-zinc-400",
}

/**
 * ActionRequiredBlock - Prompts user to take action (connect provider, reauthenticate, etc.)
 */
export const ActionRequiredBlock = memo(function ActionRequiredBlock({
  actionType,
  message,
  deepLink,
  blocking,
  metadata,
}: ActionRequiredBlockProps) {
  const config = getActionConfig(actionType, metadata)
  const ActionIcon = config.icon

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border",
      blocking
        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700/50"
    )}>
      <div className="px-4 py-3 flex items-start gap-3">
        <IconBox color={config.iconColor}>
          <ActionIcon className={cn("h-3.5 w-3.5", iconColorClasses[config.iconColor])} />
        </IconBox>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
            {message}
          </p>
          {deepLink && (
            <Link href={deepLink}>
              <Button
                size="sm"
                variant={config.buttonVariant}
                className="h-8 px-3 text-xs gap-1.5"
              >
                {config.buttonText}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
        {blocking && (
          <Badge className="h-5 text-[9px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            Required
          </Badge>
        )}
      </div>
    </div>
  )
})
