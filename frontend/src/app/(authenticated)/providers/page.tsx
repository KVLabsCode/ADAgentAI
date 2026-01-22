"use client"

import * as React from "react"
import { Suspense } from "react"
import { Plug } from "lucide-react"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ConfigFieldGroup,
  EmptyState,
  StatusMessage,
} from "@/organisms/theme"
import {
  ConnectProviderDropdown,
  ProviderListItem,
  SupportedPlatformsContent,
  AccountSelectionModal,
} from "@/components/providers"
import { useProviderManagement } from "@/hooks/useProviderManagement"

function ProvidersContent() {
  const {
    providers,
    canManage,
    pendingAccounts,
    isLoading,
    connectingType,
    statusMessage,
    accountSelectionOpen,
    togglingProvider,
    handleConnect,
    handleDisconnect,
    handleToggleEnabled,
    handleAccountSelected,
    handleAccountSelectionCancel,
    setAccountSelectionOpen,
  } = useProviderManagement()

  return (
    <PageContainer>
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      <PageHeader
        title="Connected Providers"
        description="Manage your ad platform connections."
      >
        {canManage && (
          <ConnectProviderDropdown
            connectingType={connectingType}
            onConnect={handleConnect}
          />
        )}
      </PageHeader>

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
              : "Connect your AdMob account to start."}
            className="py-8"
          >
            {canManage && (
              <ConnectProviderDropdown
                connectingType={connectingType}
                onConnect={handleConnect}
                variant="empty"
              />
            )}
          </EmptyState>
        </SettingsSection>
      ) : (
        <SettingsSection title="Connected Accounts">
          <ConfigFieldGroup>
            {providers.map((provider) => (
              <ProviderListItem
                key={provider.id}
                provider={provider}
                canManage={canManage ?? false}
                togglingProvider={togglingProvider}
                onToggleEnabled={handleToggleEnabled}
                onDisconnect={handleDisconnect}
              />
            ))}
          </ConfigFieldGroup>
        </SettingsSection>
      )}

      <SettingsSection title="Supported Platforms" bare>
        <SupportedPlatformsContent />
      </SettingsSection>

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
