"use client"

import { Plus, Check } from "lucide-react"
import { Button } from "@/atoms/button"
import { NetworkLogo } from "@/components/icons/provider-logos"
import type { NetworkName } from "@/lib/types"

// All supported platforms with their metadata
export const ALL_PLATFORMS = [
  // OAuth-based providers (only)
  {
    id: "admob" as const,
    name: "AdMob",
    connectionType: "oauth" as const,
    platformType: "provider" as const,
    status: "available" as const,
  },
  {
    id: "gam" as const,
    name: "Google Ad Manager",
    connectionType: "oauth" as const,
    platformType: "provider" as const,
    status: "coming_soon" as const,
  },
  // Dual-role: Both providers AND ad sources
  {
    id: "applovin" as NetworkName,
    name: "AppLovin MAX",
    connectionType: "api_key" as const,
    platformType: "both" as const, // Provider + Ad Source
    providerStatus: "coming_soon" as const, // As provider (no OAuth yet)
    status: "available" as const, // As ad source
  },
  {
    id: "unity" as NetworkName,
    name: "Unity LevelPlay",
    connectionType: "api_key" as const,
    platformType: "both" as const, // Provider + Ad Source
    providerStatus: "coming_soon" as const, // As provider (no OAuth yet)
    status: "available" as const, // As ad source
  },
  // API-key based ad sources only
  {
    id: "liftoff" as NetworkName,
    name: "Liftoff Monetize",
    connectionType: "api_key" as const,
    platformType: "ad_source" as const,
    status: "available" as const,
  },
  {
    id: "inmobi" as NetworkName,
    name: "InMobi",
    connectionType: "api_key" as const,
    platformType: "ad_source" as const,
    status: "available" as const,
  },
  {
    id: "mintegral" as NetworkName,
    name: "Mintegral",
    connectionType: "api_key" as const,
    platformType: "ad_source" as const,
    status: "available" as const,
  },
  {
    id: "pangle" as NetworkName,
    name: "Pangle",
    connectionType: "api_key" as const,
    platformType: "ad_source" as const,
    status: "available" as const,
  },
  {
    id: "dtexchange" as NetworkName,
    name: "DT Exchange",
    connectionType: "api_key" as const,
    platformType: "ad_source" as const,
    status: "available" as const,
  },
] as const

export type PlatformId = (typeof ALL_PLATFORMS)[number]["id"]

interface SupportedPlatformsContentProps {
  connectedProviders?: string[] // IDs of connected OAuth providers
  connectedNetworks?: string[] // Names of connected API-key networks
  onConnectOAuth?: (type: "admob" | "gam") => void
  onConnectNetwork?: (networkName: NetworkName) => void
  canManage?: boolean
  showOnlyNetworks?: boolean // Only show API-key networks (for provider detail page)
  showOnlyProviders?: boolean // Only show OAuth providers (for main providers page)
}

// Simple display version (no interactivity)
export function SupportedPlatformsContent() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ALL_PLATFORMS.slice(0, 3).map((platform) => (
        <div
          key={platform.id}
          className="flex items-center gap-[var(--item-gap)] px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)]"
        >
          <NetworkLogo
            network={platform.id}
            size="sm"
            disabled={platform.status === "coming_soon"}
          />
          <div>
            <p className={`text-[length:var(--text-label)] font-medium ${
              platform.status === "coming_soon" ? "text-muted-foreground" : ""
            }`}>
              {platform.name}
            </p>
            <p className="text-[length:var(--text-small)] text-muted-foreground">
              {platform.status === "available" ? "Available" : "Coming soon"}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Interactive version with connection buttons
export function AllPlatformsGrid({
  connectedProviders = [],
  connectedNetworks = [],
  onConnectOAuth,
  onConnectNetwork,
  canManage = false,
  showOnlyNetworks = false,
  showOnlyProviders = false,
}: SupportedPlatformsContentProps) {
  const isConnected = (platform: (typeof ALL_PLATFORMS)[number]): boolean => {
    if (platform.connectionType === "oauth") {
      // For OAuth providers, check by type (admob/gam)
      return connectedProviders.some(p => p === platform.id)
    } else {
      // For API-key networks, check by network name
      return connectedNetworks.includes(platform.id)
    }
  }

  const handleConnect = (platform: (typeof ALL_PLATFORMS)[number]) => {
    if (platform.connectionType === "oauth") {
      onConnectOAuth?.(platform.id as "admob" | "gam")
    } else {
      onConnectNetwork?.(platform.id as NetworkName)
    }
  }

  // Filter platforms based on props
  let platformsToShow: readonly (typeof ALL_PLATFORMS)[number][] = ALL_PLATFORMS
  if (showOnlyNetworks) {
    // Show ad sources + dual-role platforms (as ad sources)
    platformsToShow = ALL_PLATFORMS.filter(p => p.platformType === "ad_source" || p.platformType === "both")
  } else if (showOnlyProviders) {
    // Show providers + dual-role platforms (as providers)
    platformsToShow = ALL_PLATFORMS.filter(p => p.platformType === "provider" || p.platformType === "both")
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {platformsToShow.map((platform) => {
        const connected = isConnected(platform)
        // For dual-role platforms shown as providers, check providerStatus
        const effectiveStatus = showOnlyProviders && 'providerStatus' in platform
          ? platform.providerStatus
          : platform.status
        const isComingSoon = effectiveStatus === "coming_soon"
        const showConnectButton = canManage && !connected && !isComingSoon

        return (
          <div
            key={platform.id}
            className={`flex flex-col gap-3 p-3 rounded-[var(--card-radius)] border bg-[var(--card-bg)] ${
              connected ? "border-[var(--token-success-default)]/40" : "border-border/40"
            }`}
          >
            {/* Logo + Name row */}
            <div className="flex items-center gap-3">
              <NetworkLogo
                network={platform.id}
                size="md"
                disabled={isComingSoon}
              />
              <p className={`text-[14px] font-medium leading-tight ${
                isComingSoon ? "text-muted-foreground" : "text-foreground"
              }`}>
                {platform.name}
              </p>
            </div>

            {/* Button */}
            {connected ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs border-[var(--token-success-default)]/40 text-[var(--token-success-default)]"
                disabled
              >
                <Check className="h-3 w-3 mr-1.5" />
                Connected
              </Button>
            ) : isComingSoon ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                disabled
              >
                Coming soon
              </Button>
            ) : showConnectButton ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleConnect(platform)}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Connect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                disabled
              >
                Connect
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
