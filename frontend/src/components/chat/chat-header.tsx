"use client"

import * as React from "react"
import { Lock, Globe, Shield, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChatHeaderProps {
  hasProviders: boolean
  isPrivate?: boolean
  onPrivacyChange?: (isPrivate: boolean) => void
}

export function ChatHeader({
  isPrivate = true,
  onPrivacyChange,
}: ChatHeaderProps) {
  const [privacy, setPrivacy] = React.useState(isPrivate)
  const [open, setOpen] = React.useState(false)

  const setPrivacyMode = (isPrivate: boolean) => {
    setPrivacy(isPrivate)
    onPrivacyChange?.(isPrivate)
    setOpen(false)
  }

  return (
    <div className="flex items-center justify-end px-4 sm:px-6 py-2">
      {/* Privacy selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              "border",
              privacy
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
            )}
          >
            {privacy ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Private</span>
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Public</span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-56 p-0 bg-zinc-900 border-zinc-700/50"
        >
          <div className="px-2.5 py-2 border-b border-zinc-700/50">
            <h4 className="text-xs font-medium text-zinc-100">Visibility</h4>
          </div>
          <div className="p-1.5 space-y-0.5">
            {/* Private option */}
            <button
              onClick={() => setPrivacyMode(true)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
                privacy
                  ? "bg-emerald-500/15"
                  : "hover:bg-zinc-800/80"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                privacy ? "bg-emerald-500/40" : "bg-zinc-700/50"
              )}>
                <Shield className={cn("h-3 w-3", privacy ? "text-emerald-400" : "text-zinc-400")} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("text-xs font-medium", privacy ? "text-emerald-300" : "text-zinc-200")}>
                  Private
                </span>
                <p className="text-[10px] text-zinc-500">Only you</p>
              </div>
              {privacy && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>

            {/* Public option */}
            <button
              onClick={() => setPrivacyMode(false)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
                !privacy
                  ? "bg-amber-500/15"
                  : "hover:bg-zinc-800/80"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                !privacy ? "bg-amber-500/40" : "bg-zinc-700/50"
              )}>
                <Link2 className={cn("h-3 w-3", !privacy ? "text-amber-400" : "text-zinc-400")} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("text-xs font-medium", !privacy ? "text-amber-300" : "text-zinc-200")}>
                  Public
                </span>
                <p className="text-[10px] text-zinc-500">Anyone with link</p>
              </div>
              {!privacy && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
