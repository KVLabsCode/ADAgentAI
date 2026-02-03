/**
 * Types for the Kovio Experiments feature (Cross-Platform A/B Testing)
 */

// Experiment status
export type ExperimentStatus = "draft" | "running" | "completed" | "paused"

// Network providers for A/B testing
export type NetworkProvider = "admob" | "max" | "ironsource" | "unity"

// Ad formats
export type AdFormat = "banner" | "interstitial" | "rewarded" | "native" | "app_open"

// Country tiers
export type CountryTier = "tier1" | "tier2" | "tier3"

// Targeting configuration for an arm
export interface ArmTargeting {
  countries: string[]
  tiers: CountryTier[]
  platforms: ("ios" | "android")[]
  excludedFormats: AdFormat[]
}

// A single arm (variant) in an experiment
export interface ExperimentArm {
  id: string
  name: string
  networkProvider: NetworkProvider
  trafficPercentage: number
  targeting: ArmTargeting
}

// Full experiment definition
export interface Experiment {
  id: string
  name: string
  type: "cross_platform_ab" | "waterfall_ab" | "bidding_ab"
  status: ExperimentStatus
  arms: ExperimentArm[]
  startDate: string
  endDate: string | null
  durationDays: number
  prompt?: string // The natural language prompt used to configure the experiment
  createdAt: string
  updatedAt: string
}

// Metrics for a single arm
export interface ArmMetrics {
  armId: string
  arpdau: number // Average Revenue Per Daily Active User
  imdau: number // Impressions per DAU
  ecpm: number // Effective Cost Per Mille
  revenue: number // Total revenue
  fillRate: number // Fill rate percentage (0-100)
  impressions: number
  requests: number
  dau: number // Daily active users
  revenueDelta?: number // Percentage change vs baseline (first arm)
  isWinner: boolean
}

// Network-level breakdown within an arm
export interface NetworkBreakdownItem {
  network: string
  armId: string
  ecpm: number
  revenue: number
  revenueShare: number // Percentage of total revenue for this arm
  impressions: number
  fillRate: number
}

// Time series data point
export interface TimeSeriesPoint {
  date: string
  armId: string
  arpdau: number
  ecpm: number
  revenue: number
}

// Complete metrics for an experiment
export interface ExperimentMetrics {
  experimentId: string
  overall: {
    totalRevenue: number
    totalImpressions: number
    avgArpdau: number
    avgEcpm: number
  }
  byArm: ArmMetrics[]
  networkBreakdown: NetworkBreakdownItem[]
  timeSeries: TimeSeriesPoint[]
}

// Recommendation types
export type RecommendationType =
  | "shift_traffic"
  | "pause_arm"
  | "extend_experiment"
  | "apply_winner"

// Recommendation status
export type RecommendationStatus = "pending" | "executed" | "dismissed"

// Impact preview for a recommendation
export interface ImpactPreview {
  revenueChange: number // Absolute change in revenue
  revenueChangePercent: number // Percentage change
  confidence: "high" | "medium" | "low"
  timeframe: string // e.g., "monthly", "weekly"
}

// Scope for applying a recommendation
export interface ExecutionScope {
  apps: string[] | "all"
  formats: AdFormat[]
  countries: string[]
}

// A recommendation based on experiment results
export interface Recommendation {
  id: string
  experimentId: string
  type: RecommendationType
  title: string
  rationale: string
  impactPreview: ImpactPreview
  scope: ExecutionScope
  status: RecommendationStatus
  sourceArmId?: string // The arm this recommendation is based on
  targetArmId?: string // The arm to shift traffic to (for shift_traffic)
  trafficShiftPercent?: number // How much traffic to shift
}

// Parsed prompt allocation (output from prompt parser)
export interface ParsedPromptAllocation {
  armAllocations: {
    networkProvider: NetworkProvider
    trafficPercentage: number
  }[]
  targeting: {
    countries: string[]
    tiers: CountryTier[]
    excludedFormats: AdFormat[]
  }
  durationDays: number
}

// Wizard step data
export interface WizardBasicInfo {
  name: string
  type: Experiment["type"]
}

export interface WizardArmSetup {
  armA: {
    name: string
    networkProvider: NetworkProvider
  }
  armB: {
    name: string
    networkProvider: NetworkProvider
  }
}

export interface WizardTrafficAllocation {
  prompt: string
  parsed: ParsedPromptAllocation | null
}

// Complete wizard data
export interface ExperimentWizardData {
  basicInfo: WizardBasicInfo
  armSetup: WizardArmSetup
  trafficAllocation: WizardTrafficAllocation
}
