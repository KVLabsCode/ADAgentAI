"use client"

import * as React from "react"
import { Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ChatHeaderProps {
  hasProviders: boolean
  isPrivate?: boolean
  onPrivacyChange?: (isPrivate: boolean) => void
}

export function ChatHeader({
  hasProviders,
  isPrivate = true,
  onPrivacyChange
}: ChatHeaderProps) {
  const [privacy, setPrivacy] = React.useState(isPrivate)

  const togglePrivacy = () => {
    const newState = !privacy
    setPrivacy(newState)
    onPrivacyChange?.(newState)
  }

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-2">
      {/* Left side - Chat title */}
      <div className="flex items-center gap-2">
        <h1 className="text-[13px] font-medium tracking-tight text-foreground/90">Chat</h1>
      </div>

      {/* Right side - Privacy toggle */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={togglePrivacy}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                privacy
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70"
              )}
            >
              {privacy ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Private</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Public</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-xs">
            {privacy
              ? "Private: Only you can access this chat"
              : "Public: Anyone with the link can access this chat"
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
