"use client"

import { AdMobLogo, ProviderLogoBadge, AppLovinLogo } from "@/components/icons/provider-logos"

// Separate card boxes for each platform
export function SupportedPlatformsContent() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* AdMob - Available */}
      <div className="flex items-center gap-[var(--item-gap)] px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)]">
        <AdMobLogo size="sm" />
        <div>
          <p className="text-[length:var(--text-label)] font-medium">AdMob</p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">Available</p>
        </div>
      </div>
      {/* Google Ad Manager - Coming soon */}
      <div className="flex items-center gap-[var(--item-gap)] px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)]">
        <ProviderLogoBadge type="gam" size="sm" disabled />
        <div>
          <p className="text-[length:var(--text-label)] font-medium text-muted-foreground">Google Ad Manager</p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">Coming soon</p>
        </div>
      </div>
      {/* AppLovin MAX - Coming soon */}
      <div className="flex items-center gap-[var(--item-gap)] px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)]">
        <AppLovinLogo size="sm" disabled />
        <div>
          <p className="text-[length:var(--text-label)] font-medium text-muted-foreground">AppLovin MAX</p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
