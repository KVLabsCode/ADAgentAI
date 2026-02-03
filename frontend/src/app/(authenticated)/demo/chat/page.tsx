"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { useDemo } from "@/contexts/demo-mode-context"
import { PageContainer, PageHeader } from "@/organisms/theme"
import { Button } from "@/atoms/button"
import { DemoChatContainer } from "@/components/demo-chat"

function DemoModeRequired() {
  return (
    <PageContainer>
      <PageHeader
        title="Demo Chat"
        description="AI-powered experiment management"
      />
      <div className="rounded-[var(--card-radius)] border-[0.8px] border-warning/30 bg-warning/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] text-warning mb-1">
              Demo Mode Required
            </h3>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">
              The Demo Chat feature is currently only available in demo mode.
              Enable demo mode in Settings to explore AI-powered experiment
              management capabilities.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/settings")}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default function DemoChatPage() {
  const { isDemoMode } = useDemo()
  const searchParams = useSearchParams()
  const newChatParam = searchParams.get('new')

  // Gate: require demo mode
  if (!isDemoMode) {
    return <DemoModeRequired />
  }

  // Key forces remount when ?new= param changes (for starting fresh chat)
  return <DemoChatContainer key={newChatParam || 'demo-chat'} />
}
