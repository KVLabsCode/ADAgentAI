/**
 * Simulated prompt parser for traffic allocation
 * Parses natural language prompts into structured configuration
 */

import type {
  ParsedPromptAllocation,
  NetworkProvider,
  AdFormat,
  CountryTier,
} from "./types"
import { COUNTRY_TIERS, COUNTRIES } from "./constants"

// Pattern for extracting percentages with optional network context
const PERCENTAGE_PATTERN = /(\d+)%?\s*(?:to|for|of)?\s*(admob|max|ironsource|unity)?/gi

// Pattern for extracting network names
const NETWORK_PATTERN = /\b(admob|max|applovin\s*max|ironsource|unity)\b/gi

// Pattern for countries (2-letter codes)
const COUNTRY_PATTERN = /\b(US|CA|GB|AU|DE|FR|JP|KR|NL|SE|NO|DK|CH|IT|ES|BR|MX|AR|PL|CZ|HU|RO|TW|SG|HK|IN|ID|PH|VN|TH|MY|EG|NG|ZA|PK|BD)\b/gi

// Pattern for tier references
const TIER_PATTERN = /tier[- ]?(\d)/gi

// Pattern for ad formats
const FORMAT_PATTERN = /\b(banner|interstitial|rewarded(?:\s+video)?|native|app[- ]?open)\b/gi

// Pattern for duration
const DURATION_PATTERN = /(\d+)\s*days?/i

// Pattern for exclusions
const EXCLUDE_PATTERN = /exclude[sd]?\s+([^.]+)/i

// Normalize network name to our enum
function normalizeNetwork(input: string): NetworkProvider | null {
  const lower = input.toLowerCase().replace(/\s+/g, "")
  if (lower === "admob") return "admob"
  if (lower === "max" || lower === "applovinmax") return "max"
  if (lower === "ironsource") return "ironsource"
  if (lower === "unity") return "unity"
  return null
}

// Normalize ad format
function normalizeFormat(input: string): AdFormat | null {
  const lower = input.toLowerCase().replace(/\s+/g, "")
  if (lower === "banner") return "banner"
  if (lower === "interstitial") return "interstitial"
  if (lower === "rewardedvideo" || lower === "rewarded") return "rewarded"
  if (lower === "native") return "native"
  if (lower === "appopen" || lower === "app-open") return "app_open"
  return null
}

// Get countries from tier
function getCountriesFromTier(tier: CountryTier): string[] {
  return COUNTRY_TIERS[tier].countries
}

/**
 * Parse a natural language prompt into structured traffic allocation
 */
export function parseTrafficPrompt(prompt: string): ParsedPromptAllocation {
  const result: ParsedPromptAllocation = {
    armAllocations: [],
    targeting: {
      countries: [],
      tiers: [],
      excludedFormats: [],
    },
    durationDays: 7, // Default
  }

  // Extract networks mentioned
  const networks: NetworkProvider[] = []

  const networkMatches = prompt.matchAll(NETWORK_PATTERN)
  for (const m of networkMatches) {
    const network = normalizeNetwork(m[1])
    if (network && !networks.includes(network)) {
      networks.push(network)
    }
  }

  // Extract percentages and associate with networks
  const percentageMatches = [...prompt.matchAll(PERCENTAGE_PATTERN)]
  const percentages: { value: number; network?: NetworkProvider }[] = []

  for (const m of percentageMatches) {
    const value = parseInt(m[1], 10)
    if (value > 0 && value <= 100) {
      const network = m[2] ? normalizeNetwork(m[2]) : undefined
      percentages.push({ value, network: network || undefined })
    }
  }

  // Build arm allocations
  if (percentages.length >= 2) {
    // Use explicit percentages
    percentages.forEach((p, index) => {
      const network = p.network || networks[index] || (index === 0 ? "admob" : "max")
      result.armAllocations.push({
        networkProvider: network,
        trafficPercentage: p.value,
      })
    })
  } else if (networks.length >= 2) {
    // Default to 50/50 if networks mentioned but no percentages
    result.armAllocations = [
      { networkProvider: networks[0], trafficPercentage: 50 },
      { networkProvider: networks[1], trafficPercentage: 50 },
    ]
  } else if (percentages.length === 1 && networks.length >= 1) {
    // One percentage mentioned, calculate the other
    const first = percentages[0]
    const remaining = 100 - first.value
    result.armAllocations = [
      {
        networkProvider: first.network || networks[0] || "admob",
        trafficPercentage: first.value,
      },
      {
        networkProvider: networks.find(n => n !== first.network) || "max",
        trafficPercentage: remaining,
      },
    ]
  } else {
    // Default allocation
    result.armAllocations = [
      { networkProvider: "admob", trafficPercentage: 50 },
      { networkProvider: "max", trafficPercentage: 50 },
    ]
  }

  // Normalize percentages to sum to 100
  const totalPercent = result.armAllocations.reduce((sum, a) => sum + a.trafficPercentage, 0)
  if (totalPercent !== 100) {
    const factor = 100 / totalPercent
    result.armAllocations = result.armAllocations.map(a => ({
      ...a,
      trafficPercentage: Math.round(a.trafficPercentage * factor),
    }))
    // Fix rounding errors
    const newTotal = result.armAllocations.reduce((sum, a) => sum + a.trafficPercentage, 0)
    if (newTotal !== 100 && result.armAllocations.length > 0) {
      result.armAllocations[0].trafficPercentage += 100 - newTotal
    }
  }

  // Extract countries
  const countryMatches = prompt.matchAll(COUNTRY_PATTERN)
  for (const m of countryMatches) {
    const country = m[1].toUpperCase()
    if (COUNTRIES[country] && !result.targeting.countries.includes(country)) {
      result.targeting.countries.push(country)
    }
  }

  // Extract tiers
  const tierMatches = prompt.matchAll(TIER_PATTERN)
  for (const m of tierMatches) {
    const tierNum = parseInt(m[1], 10)
    const tier = `tier${tierNum}` as CountryTier
    if (COUNTRY_TIERS[tier] && !result.targeting.tiers.includes(tier)) {
      result.targeting.tiers.push(tier)
      // Add tier countries if no specific countries mentioned
      if (result.targeting.countries.length === 0) {
        const tierCountries = getCountriesFromTier(tier)
        result.targeting.countries.push(
          ...tierCountries.filter(c => !result.targeting.countries.includes(c))
        )
      }
    }
  }

  // Default to US if no targeting specified
  if (result.targeting.countries.length === 0 && result.targeting.tiers.length === 0) {
    result.targeting.countries = ["US"]
    result.targeting.tiers = ["tier1"]
  }

  // Extract excluded formats
  const excludeMatch = EXCLUDE_PATTERN.exec(prompt)
  if (excludeMatch) {
    const excludeText = excludeMatch[1]
    const formatMatches = excludeText.matchAll(FORMAT_PATTERN)
    for (const m of formatMatches) {
      const format = normalizeFormat(m[1])
      if (format && !result.targeting.excludedFormats.includes(format)) {
        result.targeting.excludedFormats.push(format)
      }
    }
  }

  // Also check for "no X" or "without X" patterns
  const noFormatPattern = /(?:no|without)\s+(banner|interstitial|rewarded(?:\s+video)?|native|app[- ]?open)/gi
  const noFormatMatches = prompt.matchAll(noFormatPattern)
  for (const m of noFormatMatches) {
    const format = normalizeFormat(m[1])
    if (format && !result.targeting.excludedFormats.includes(format)) {
      result.targeting.excludedFormats.push(format)
    }
  }

  // Extract duration
  const durationMatch = DURATION_PATTERN.exec(prompt)
  if (durationMatch) {
    const days = parseInt(durationMatch[1], 10)
    if (days >= 1 && days <= 90) {
      result.durationDays = days
    }
  }

  return result
}

/**
 * Generate a summary of the parsed allocation
 */
export function summarizeParsedAllocation(parsed: ParsedPromptAllocation): string {
  const allocations = parsed.armAllocations
    .map(a => `${a.trafficPercentage}% to ${a.networkProvider.toUpperCase()}`)
    .join(", ")

  const targeting = parsed.targeting.countries.length > 0
    ? `Targeting: ${parsed.targeting.countries.join(", ")}`
    : "Targeting: All countries"

  const exclusions = parsed.targeting.excludedFormats.length > 0
    ? `Excluding: ${parsed.targeting.excludedFormats.join(", ")}`
    : ""

  const duration = `Duration: ${parsed.durationDays} days`

  return [allocations, targeting, exclusions, duration].filter(Boolean).join(" | ")
}
