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
  ProviderListItem,
  AllPlatformsGrid,
  AccountSelectionModal,
  NetworkCredentialDialog,
  NetworkListItem,
} from "@/components/providers"
import { useProviderManagement } from "@/hooks/useProviderManagement"
import { useNetworkManagement } from "@/hooks/useNetworkManagement"
import type { NetworkName } from "@/lib/types"

function ProvidersContent() {
  // OAuth provider management (AdMob, GAM)
  const {
    providers,
    canManage,
    pendingAccounts,
    isLoading: isLoadingProviders,
    connectingType: _connectingType,
    statusMessage: providerStatusMessage,
    accountSelectionOpen,
    togglingProvider,
    handleConnect: handleConnectOAuth,
    handleDisconnect: handleDisconnectProvider,
    handleToggleEnabled: handleToggleProvider,
    handleAccountSelected,
    handleAccountSelectionCancel,
    setAccountSelectionOpen,
  } = useProviderManagement()

  // API-key network management
  const {
    networks,
    configs,
    isLoading: isLoadingNetworks,
    connectingNetwork,
    statusMessage: networkStatusMessage,
    togglingNetwork,
    handleConnect: handleConnectNetwork,
    handleDisconnect: handleDisconnectNetwork,
    handleToggle: handleToggleNetwork,
  } = useNetworkManagement()

  // Dialog state for network credentials
  const [networkDialogOpen, setNetworkDialogOpen] = React.useState(false)
  const [selectedNetworkName, setSelectedNetworkName] = React.useState<NetworkName | null>(null)

  const isLoading = isLoadingProviders || isLoadingNetworks
  const statusMessage = providerStatusMessage || networkStatusMessage

  // Handle clicking connect on a network
  const handleNetworkConnectClick = (networkName: NetworkName) => {
    setSelectedNetworkName(networkName)
    setNetworkDialogOpen(true)
  }

  // Get the config for the selected network
  const selectedNetworkConfig = selectedNetworkName && configs
    ? configs[selectedNetworkName]
    : null

  // Calculate connected provider types and network names for the grid
  const connectedProviderTypes = providers.map(p => p.type)
  const connectedNetworkNames = networks.map(n => n.networkName)

  // Combined count of all connections
  const totalConnections = providers.length + networks.length

  return (
    <PageContainer>
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      <PageHeader
        title="Connected Providers"
        description="Manage your ad platform connections."
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
      ) : totalConnections === 0 ? (
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
        <>
          {/* OAuth Providers Section */}
          {providers.length > 0 && (
            <SettingsSection title="Google Platforms">
              <ConfigFieldGroup>
                {providers.map((provider) => (
                  <ProviderListItem
                    key={provider.id}
                    provider={provider}
                    canManage={canManage ?? false}
                    togglingProvider={togglingProvider}
                    onToggleEnabled={handleToggleProvider}
                    onDisconnect={handleDisconnectProvider}
                  />
                ))}
              </ConfigFieldGroup>
            </SettingsSection>
          )}

          {/* API-Key Networks Section */}
          {networks.length > 0 && (
            <SettingsSection title="Ad Networks">
              <ConfigFieldGroup>
                {networks.map((network) => (
                  <NetworkListItem
                    key={network.id}
                    network={network}
                    canManage={canManage ?? false}
                    togglingNetwork={togglingNetwork}
                    onToggle={handleToggleNetwork}
                    onDisconnect={handleDisconnectNetwork}
                  />
                ))}
              </ConfigFieldGroup>
            </SettingsSection>
          )}
        </>
      )}

      {/* All Platforms Grid */}
      <SettingsSection title="All Platforms" bare>
        <AllPlatformsGrid
          connectedProviders={connectedProviderTypes}
          connectedNetworks={connectedNetworkNames}
          onConnectOAuth={handleConnectOAuth}
          onConnectNetwork={handleNetworkConnectClick}
          canManage={canManage ?? false}
        />
      </SettingsSection>

      {/* Network Credentials Dialog */}
      <NetworkCredentialDialog
        open={networkDialogOpen}
        onOpenChange={setNetworkDialogOpen}
        networkName={selectedNetworkName}
        config={selectedNetworkConfig}
        onConnect={handleConnectNetwork}
        isConnecting={connectingNetwork !== null}
      />

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
