"use client"

import { Plug } from "lucide-react"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"
import { AdMobLogo, ProviderLogoBadge } from "@/components/icons/provider-logos"

export function SupportedPlatformsCard() {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={Plug}
        title="Supported Platforms"
        description="ADAgentAI currently supports these ad platforms."
      />
      <SectionCardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded border border-border/50 bg-card">
            <AdMobLogo size="sm" />
            <div>
              <p className="text-sm font-medium">AdMob</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded border border-border/50 bg-card">
            <ProviderLogoBadge type="gam" size="sm" disabled />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Google Ad Manager</p>
              <p className="text-[10px] text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}
