import type { Provider, ProviderApp } from "@/lib/types"
import type { AppState } from "./types"

/**
 * Check if a provider is enabled based on enabledProviderIds
 */
export function isProviderEnabled(
  providerId: string,
  enabledProviderIds: string[]
): boolean {
  if (enabledProviderIds.length === 0) return true
  return enabledProviderIds.includes(providerId)
}

/**
 * Check if an app is enabled based on enabledAppIds
 */
export function isAppEnabled(
  providerId: string,
  appId: string,
  enabledAppIds: Record<string, string[]>
): boolean {
  const providerAppIds = enabledAppIds[providerId]
  if (!providerAppIds || providerAppIds.length === 0) return true
  return providerAppIds.includes(appId)
}

/**
 * Get the app selection state for a provider: "all", "some", or "none"
 */
export function getProviderAppState(
  providerId: string,
  providerApps: Record<string, ProviderApp[]>,
  enabledAppIds: Record<string, string[]>
): AppState {
  const apps = providerApps[providerId] || []
  if (apps.length === 0) return "all"
  const providerAppIds = enabledAppIds[providerId]
  if (!providerAppIds || providerAppIds.length === 0) return "all"
  const enabledCount = apps.filter((app) => providerAppIds.includes(app.id)).length
  if (enabledCount === 0) return "none"
  if (enabledCount === apps.length) return "all"
  return "some"
}

/**
 * Check if text matches the search query (for highlighting)
 */
export function matchesSearch(text: string, searchQuery: string): boolean {
  if (!searchQuery.trim()) return false
  return text.toLowerCase().includes(searchQuery.toLowerCase())
}

/**
 * Filter providers based on search query
 * Shows providers that match OR have matching apps
 */
export function filterProviders(
  providerList: Provider[],
  searchQuery: string,
  providerApps: Record<string, ProviderApp[]>
): Provider[] {
  if (!searchQuery.trim()) return providerList
  const query = searchQuery.toLowerCase()
  return providerList.filter((provider) => {
    const providerMatches =
      provider.displayName.toLowerCase().includes(query) ||
      provider.identifiers.publisherId?.toLowerCase().includes(query) ||
      provider.identifiers.networkCode?.toLowerCase().includes(query)
    const apps = providerApps[provider.id] || []
    const hasMatchingApps = apps.some(app => app.name.toLowerCase().includes(query))
    return providerMatches || hasMatchingApps
  })
}

/**
 * Filter apps based on search query
 */
export function filterApps(apps: ProviderApp[], searchQuery: string): ProviderApp[] {
  if (!searchQuery.trim()) return apps
  const query = searchQuery.toLowerCase()
  return apps.filter(app => app.name.toLowerCase().includes(query))
}

/**
 * Get providers with matching apps for auto-expansion during search
 */
export function getProvidersWithMatchingApps(
  searchQuery: string,
  providerApps: Record<string, ProviderApp[]>
): string[] {
  if (!searchQuery.trim()) return []
  const query = searchQuery.toLowerCase()
  return Object.entries(providerApps)
    .filter(([, apps]) => apps.some(app => app.name.toLowerCase().includes(query)))
    .map(([providerId]) => providerId)
}
