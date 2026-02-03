/**
 * Constants for the Kovio Experiments feature
 */

import type { NetworkProvider, AdFormat, CountryTier } from "./types"

// Network provider display names and metadata
export const NETWORK_PROVIDERS: Record<
  NetworkProvider,
  { displayName: string; color: string; ecpmModifier: number }
> = {
  admob: {
    displayName: "AdMob",
    color: "#4285F4",
    ecpmModifier: 1.0, // Baseline
  },
  max: {
    displayName: "AppLovin MAX",
    color: "#FF6B35",
    ecpmModifier: 1.05, // Slightly higher due to bidding
  },
  ironsource: {
    displayName: "ironSource",
    color: "#00D4FF",
    ecpmModifier: 0.98,
  },
  unity: {
    displayName: "Unity Ads",
    color: "#222C37",
    ecpmModifier: 0.95,
  },
}

// Ad format display names
export const AD_FORMATS: Record<AdFormat, { displayName: string; shortName: string }> = {
  banner: { displayName: "Banner", shortName: "Ban" },
  interstitial: { displayName: "Interstitial", shortName: "Int" },
  rewarded: { displayName: "Rewarded Video", shortName: "RV" },
  native: { displayName: "Native", shortName: "Nat" },
  app_open: { displayName: "App Open", shortName: "AO" },
}

// Country tier definitions
export const COUNTRY_TIERS: Record<
  CountryTier,
  { displayName: string; countries: string[]; ecpmMultiplier: number }
> = {
  tier1: {
    displayName: "Tier 1",
    countries: ["US", "CA", "GB", "AU", "DE", "FR", "JP", "KR", "NL", "SE", "NO", "DK", "CH"],
    ecpmMultiplier: 1.0,
  },
  tier2: {
    displayName: "Tier 2",
    countries: ["IT", "ES", "BR", "MX", "AR", "PL", "CZ", "HU", "RO", "TW", "SG", "HK"],
    ecpmMultiplier: 0.6,
  },
  tier3: {
    displayName: "Tier 3",
    countries: ["IN", "ID", "PH", "VN", "TH", "MY", "EG", "NG", "ZA", "PK", "BD"],
    ecpmMultiplier: 0.25,
  },
}

// All countries with their names
export const COUNTRIES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  KR: "South Korea",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  CH: "Switzerland",
  IT: "Italy",
  ES: "Spain",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  RO: "Romania",
  TW: "Taiwan",
  SG: "Singapore",
  HK: "Hong Kong",
  IN: "India",
  ID: "Indonesia",
  PH: "Philippines",
  VN: "Vietnam",
  TH: "Thailand",
  MY: "Malaysia",
  EG: "Egypt",
  NG: "Nigeria",
  ZA: "South Africa",
  PK: "Pakistan",
  BD: "Bangladesh",
}

// Metric ranges for demo data generation
export const METRIC_RANGES = {
  arpdau: { min: 0.08, max: 0.25 },
  ecpm: { min: 3.5, max: 12.0 },
  fillRate: { min: 75, max: 98 },
  imdau: { min: 3.0, max: 8.0 },
  dau: { min: 50000, max: 200000 },
}

// Experiment type display names
export const EXPERIMENT_TYPES = {
  cross_platform_ab: {
    displayName: "Cross-Platform A/B Test",
    description: "Compare performance across different ad mediation platforms",
  },
  waterfall_ab: {
    displayName: "Waterfall A/B Test",
    description: "Test different waterfall configurations",
  },
  bidding_ab: {
    displayName: "Bidding A/B Test",
    description: "Compare bidding vs waterfall setups",
  },
}

// Default experiment duration options
export const DURATION_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 21, label: "21 days" },
  { value: 30, label: "30 days" },
]

// Sample prompt placeholders
export const PROMPT_PLACEHOLDER = `Example: "Send 60% of US Tier-1 users to AdMob and 40% to MAX. Exclude rewarded video. Run for 7 days."`

export const PROMPT_EXAMPLES = [
  "Split traffic 50/50 between AdMob and MAX for US and CA users. Run for 14 days.",
  "Send 70% to AdMob, 30% to MAX. Target Tier-1 countries only. Exclude banner ads.",
  "Test MAX with 40% of traffic against AdMob baseline for iOS users in the US.",
]
