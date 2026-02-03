"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { Plug, ChevronRight } from "lucide-react"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ConfigFieldGroup,
  EmptyState,
} from "@/organisms/theme"
import {
  AllPlatformsGrid,
  AccountSelectionModal,
} from "@/components/providers"
import { Switch } from "@/atoms/switch"
import { Spinner } from "@/atoms/spinner"
import { ProviderLogo } from "@/components/icons/provider-logos"
import { useProviderManagement } from "@/hooks/useProviderManagement"
import type { Provider } from "@/lib/types"

// Clickable provider card component with inline toggle
interface ProviderCardProps {
  provider: Provider & { isEnabled: boolean }
  onClick: () => void
  onToggle: (enabled: boolean) => void
  isToggling: boolean
}

function ProviderCard({ provider, onClick, onToggle, isToggling }: ProviderCardProps) {
  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation when clicking toggle
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full px-[var(--item-padding-x)] py-[var(--item-padding-y)] border-b border-border/40 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer text-left"
    >
      <div className="flex items-center gap-[var(--item-gap)]">
        <ProviderLogo provider={provider.type} size="sm" />
        <div>
          <p className="text-[length:var(--text-label)] font-medium">
            {provider.displayName}
          </p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">
            {provider.type === "admob"
              ? `Publisher ID: ${provider.identifiers.publisherId || "—"}`
              : `Network Code: ${provider.identifiers.networkCode || "—"}`
            }
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Inline toggle with label */}
        <div onClick={handleToggleClick} className="flex items-center gap-2">
          <span className={`text-[length:var(--text-small)] ${
            provider.isEnabled ? "text-[var(--token-success-default)]" : "text-muted-foreground"
          }`}>
            {provider.isEnabled ? "Enabled" : "Disabled"}
          </span>
          {isToggling && <Spinner size="sm" className="text-muted-foreground" />}
          <Switch
            checked={provider.isEnabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
            aria-label={provider.isEnabled ? "Disable provider" : "Enable provider"}
          />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  )
}

function ProvidersContent() {
  const router = useRouter()

  // OAuth provider management (AdMob, GAM)
  const {
    providers,
    canManage,
    pendingAccounts,
    isLoading,
    accountSelectionOpen,
    togglingProvider,
    handleConnect: handleConnectOAuth,
    handleToggleEnabled,
    handleAccountSelected,
    handleAccountSelectionCancel,
    setAccountSelectionOpen,
  } = useProviderManagement()

  // Navigate to provider detail page
  const handleProviderClick = (provider: Provider) => {
    router.push(`/providers/${provider.type}`)
  }

  // Calculate connected provider types for the grid
  const connectedProviderTypes = providers.map(p => p.type)

  return (
    <PageContainer>
      <PageHeader
        title="Connected Providers"
        description="Manage your ad platform connections. Click a provider to configure ad sources."
      />

      {isLoading ? (
        <SettingsSection title="Connected Accounts">
          <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)] space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-[var(--item-gap)] animate-pulse">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>
      ) : providers.length === 0 ? (
        <SettingsSection title="Connected Accounts">
          <EmptyState
            icon={Plug}
            title="No providers connected"
            description={canManage === false
              ? "Contact your admin to connect providers."
              : "Connect your ad platforms below to get started."}
            className="py-8"
          />
        </SettingsSection>
      ) : (
        <SettingsSection title="Connected Accounts">
          <ConfigFieldGroup>
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onClick={() => handleProviderClick(provider)}
                onToggle={(enabled) => handleToggleEnabled(provider.id, enabled)}
                isToggling={togglingProvider === provider.id}
              />
            ))}
          </ConfigFieldGroup>
        </SettingsSection>
      )}

      {/* Connect Provider Section - only show OAuth providers (AdMob, GAM) */}
      {canManage && (
        <SettingsSection title="Connect a Provider" bare>
          <AllPlatformsGrid
            connectedProviders={connectedProviderTypes}
            connectedNetworks={[]}
            onConnectOAuth={handleConnectOAuth}
            onConnectNetwork={() => {}}
            canManage={canManage ?? false}
            showOnlyProviders={true}
          />
          <p className="text-[length:var(--text-small)] text-muted-foreground mt-3 px-1">
            Connect a provider, then configure ad sources from the provider detail page.
          </p>
        </SettingsSection>
      )}

      {/* GAM Account Selection Modal */}
      <AccountSelectionModal
        open={accountSelectionOpen}
        onOpenChange={setAccountSelectionOpen}
        accounts={pendingAccounts}
        providerType="gam"
        onConfirm={handleAccountSelected}
        onCancel={handleAccountSelectionCancel}
      />
    </PageContainer>
  )
}

function ProvidersLoadingSkeleton() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </div>
      <SettingsSection title="Connected Accounts">
        <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)] space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-[var(--item-gap)] animate-pulse">
              <div className="h-8 w-8 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-2.5 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </PageContainer>
  )
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<ProvidersLoadingSkeleton />}>
      <ProvidersContent />
    </Suspense>
  )
}
