"use client"

import * as React from "react"
import { Suspense, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Layers, Settings } from "lucide-react"
import { Button } from "@/atoms/button" // Used for Disconnect button
import {
  PageContainer,
  SettingsSection,
  ConfigFieldGroup,
  EmptyState,
} from "@/organisms/theme"
import {
  AdSourceListItem,
  AdSourceCredentialDialog,
  AllPlatformsGrid,
} from "@/components/providers"
import { ProviderLogo } from "@/components/icons/provider-logos"
import { useProviderDetail } from "@/hooks/useProviderDetail"
import { useAdSourceManagement } from "@/hooks/useAdSourceManagement"
import { useProviderManagement } from "@/hooks/useProviderManagement"
import type { AdSourceName } from "@/lib/types"

// Provider display info
const PROVIDER_INFO = {
  admob: {
    name: "Google AdMob",
    description: "Mobile advertising platform for app monetization",
    identifierLabel: "Publisher ID",
  },
  gam: {
    name: "Google Ad Manager",
    description: "Enterprise ad serving platform",
    identifierLabel: "Network Code",
  },
} as const

type ProviderType = "admob" | "gam"

function ProviderDetailContent({ providerType }: { providerType: ProviderType }) {
  const router = useRouter()

  // Get providers list to find the provider ID by type
  const { providers, isLoading: isLoadingProviders } = useProviderManagement()

  // Find the provider of this type
  const providerEntry = providers.find(p => p.type === providerType)
  const providerId = providerEntry?.id

  // Provider detail hook - only fetch when we have a valid providerId
  const {
    provider,
    canManage,
    isLoading: isLoadingDetail,
    handleDisconnect,
  } = useProviderDetail(providerId)

  // Ad sources management for this provider
  const {
    adSources,
    configs,
    isLoading: isLoadingAdSources,
    connectingAdSource,
    togglingAdSource,
    handleConnect: handleConnectAdSource,
    handleDisconnect: handleDisconnectAdSource,
    handleToggle: handleToggleAdSource,
  } = useAdSourceManagement(providerId)

  // Dialog state for ad source credentials
  const [adSourceDialogOpen, setAdSourceDialogOpen] = React.useState(false)
  const [selectedAdSourceName, setSelectedAdSourceName] = React.useState<AdSourceName | null>(null)

  // Loading states:
  // 1. Still fetching providers list → show loading
  // 2. Have providerId, still fetching details → show loading
  // 3. Have providerId, still fetching ad sources → show loading
  // 4. Providers loaded but no matching provider → show "not connected"
  const isLoading = isLoadingProviders ||
    (providerId !== undefined && isLoadingDetail) ||
    (providerId !== undefined && isLoadingAdSources)
  const providerInfo = PROVIDER_INFO[providerType]

  // Handle clicking connect on an ad source
  const handleAdSourceConnectClick = (adSourceName: AdSourceName) => {
    setSelectedAdSourceName(adSourceName)
    setAdSourceDialogOpen(true)
  }

  // Get the config for the selected ad source
  const selectedAdSourceConfig = selectedAdSourceName && configs
    ? configs[selectedAdSourceName]
    : null

  // Get connected ad source names for the grid
  const connectedAdSourceNames = adSources.map(s => s.adSourceName)

  // Handle disconnect with navigation back to providers list
  const handleDisconnectClick = async () => {
    const success = await handleDisconnect()
    if (success) {
      router.push("/providers")
    }
  }

  if (isLoading) {
    return (
      <>
        <button
          className="fixed top-3 left-[calc(var(--sidebar-width)+12px)] flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-10"
          onClick={() => router.push("/providers")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Providers</span>
        </button>
        <PageContainer>
          <div className="space-y-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </PageContainer>
      </>
    )
  }

  if (!provider) {
    return (
      <>
        <button
          className="fixed top-3 left-[calc(var(--sidebar-width)+12px)] flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-10"
          onClick={() => router.push("/providers")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Providers</span>
        </button>
        <PageContainer>
          <EmptyState
            icon={Settings}
            title={`${providerInfo.name} not connected`}
            description="Connect this provider from the Providers page to get started."
            className="py-8"
          />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      {/* Back link - Linear style (outside container, top left) */}
      <button
        className="fixed top-3 left-[calc(var(--sidebar-width)+12px)] flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-10"
        onClick={() => router.push("/providers")}
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Providers</span>
      </button>

      <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-3 mb-[var(--section-gap)]">
        <ProviderLogo provider={providerType} size="md" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">{providerInfo.name}</h1>
          <span className="text-xs text-muted-foreground font-mono">
            {provider.identifiers.publisherId || provider.identifiers.networkCode}
          </span>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDisconnectClick}
          >
            Disconnect
          </Button>
        )}
      </div>

      {/* Connected Ad Sources */}
      {adSources.length > 0 && (
        <SettingsSection title="Connected Ad Sources">
          <ConfigFieldGroup>
            {adSources.map((adSource) => (
              <AdSourceListItem
                key={adSource.id}
                adSource={adSource}
                canManage={canManage}
                togglingAdSource={togglingAdSource}
                onToggle={handleToggleAdSource}
                onDisconnect={handleDisconnectAdSource}
              />
            ))}
          </ConfigFieldGroup>
        </SettingsSection>
      )}

      {/* Available Ad Sources to Connect */}
      {canManage && (
        <SettingsSection title={adSources.length > 0 ? "Add More Ad Sources" : "Connect Ad Sources"} bare>
          <AllPlatformsGrid
            connectedProviders={[]}
            connectedNetworks={connectedAdSourceNames}
            onConnectOAuth={() => {}}
            onConnectNetwork={handleAdSourceConnectClick}
            canManage={canManage}
            showOnlyNetworks={true}
          />
        </SettingsSection>
      )}

      {/* Empty state for non-admins */}
      {!canManage && adSources.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No ad sources connected"
          description="Contact your admin to connect ad sources."
          className="py-8"
        />
      )}

      {/* Ad Source Credentials Dialog */}
      <AdSourceCredentialDialog
        open={adSourceDialogOpen}
        onOpenChange={setAdSourceDialogOpen}
        adSourceName={selectedAdSourceName}
        config={selectedAdSourceConfig}
        onConnect={handleConnectAdSource}
        isConnecting={connectingAdSource !== null}
      />
    </PageContainer>
    </>
  )
}

function ProviderDetailLoadingSkeleton() {
  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </PageContainer>
  )
}

export default function ProviderDetailPage({ params }: { params: Promise<{ type: string }> }) {
  // Unwrap params using React.use()
  const resolvedParams = use(params)
  const providerType = resolvedParams.type as ProviderType

  // Validate provider type
  if (providerType !== "admob" && providerType !== "gam") {
    return (
      <PageContainer>
        <EmptyState
          icon={Settings}
          title="Provider not found"
          description="The requested provider type does not exist."
          className="py-8"
        />
      </PageContainer>
    )
  }

  return (
    <Suspense fallback={<ProviderDetailLoadingSkeleton />}>
      <ProviderDetailContent providerType={providerType} />
    </Suspense>
  )
}
