"use client"

interface ChatHeaderProps {
  hasProviders: boolean
}

export function ChatHeader({ hasProviders }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/20">
      <div className="flex items-center gap-2">
        <h1 className="text-[13px] font-medium tracking-tight text-foreground/90">Chat</h1>
      </div>
    </div>
  )
}
