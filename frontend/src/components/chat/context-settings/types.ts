import type { Provider, ProviderApp } from "@/lib/types"

export interface ContextSettingsProps {
  providers: Provider[]
}

export type AppState = "all" | "some" | "none"

export interface ProviderRowProps {
  provider: Provider
  index: number
  total: number
  isExpanded: boolean
  isLoading: boolean
  allApps: ProviderApp[]
  filteredApps: ProviderApp[]
  appState: AppState
  isEnabled: boolean
  searchQuery: string
  enabledAppIds: string[]
  onToggleExpanded: (providerId: string, providerType: string) => void
  onToggleProvider: (providerId: string) => void
  onToggleAllApps: (providerId: string) => void
  onToggleApp: (providerId: string, appId: string) => void
  isAppEnabled: (providerId: string, appId: string) => boolean
}

export interface ProviderSectionProps {
  id: string
  title: string
  icon: React.ReactNode
  providerList: Provider[]
  filteredList: Provider[]
  isExpanded: boolean
  onToggleSection: (section: string) => void
  isProviderEnabled: (id: string) => boolean
  renderProvider: (provider: Provider, index: number, total: number) => React.ReactNode
}

export interface FooterControlsProps {
  responseStyle: "concise" | "detailed"
  displayMode: "detailed" | "compact"
  contextMode: "soft" | "strict"
  safeMode: boolean
  autoIncludeContext: boolean
  enabledProviderCount: number
  totalProviderCount: number
  onResponseStyleChange: (style: "concise" | "detailed") => void
  onDisplayModeChange: (mode: "detailed" | "compact") => void
  onContextModeChange: (mode: "soft" | "strict") => void
  onSafeModeChange: (enabled: boolean) => void
  onAutoIncludeContextChange: (enabled: boolean) => void
  onClose: () => void
}
