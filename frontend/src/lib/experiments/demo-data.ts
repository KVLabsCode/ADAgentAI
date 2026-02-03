/**
 * Demo data generation for Kovio Experiments
 * Uses seeded random for reproducibility
 */

import type {
  Experiment,
  ExperimentMetrics,
  ArmMetrics,
  NetworkBreakdownItem,
  TimeSeriesPoint,
  Recommendation,
} from "./types"
import { METRIC_RANGES, NETWORK_PROVIDERS } from "./constants"

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// Generate a random number in range using seeded random
function randomInRange(
  random: () => number,
  min: number,
  max: number
): number {
  return min + random() * (max - min)
}

// Format date to ISO string
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Generate dates relative to today
function getRelativeDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return formatDate(date)
}

/**
 * Get demo experiments - returns 2-3 sample experiments
 */
export function getDemoExperiments(): Experiment[] {
  return [
    {
      id: "exp-001",
      name: "US iOS Traffic Split Test",
      type: "cross_platform_ab",
      status: "completed",
      arms: [
        {
          id: "arm-001-a",
          name: "Control (AdMob)",
          networkProvider: "admob",
          trafficPercentage: 50,
          targeting: {
            countries: ["US"],
            tiers: ["tier1"],
            platforms: ["ios"],
            excludedFormats: [],
          },
        },
        {
          id: "arm-001-b",
          name: "Variant (MAX)",
          networkProvider: "max",
          trafficPercentage: 50,
          targeting: {
            countries: ["US"],
            tiers: ["tier1"],
            platforms: ["ios"],
            excludedFormats: [],
          },
        },
      ],
      startDate: getRelativeDate(14),
      endDate: getRelativeDate(7),
      durationDays: 7,
      prompt:
        "Split traffic 50/50 between AdMob and MAX for US iOS users. Run for 7 days.",
      createdAt: getRelativeDate(15),
      updatedAt: getRelativeDate(7),
    },
    {
      id: "exp-002",
      name: "Global Tier-1 Mediation Test",
      type: "cross_platform_ab",
      status: "running",
      arms: [
        {
          id: "arm-002-a",
          name: "AdMob Baseline",
          networkProvider: "admob",
          trafficPercentage: 60,
          targeting: {
            countries: ["US", "CA", "GB", "AU", "DE"],
            tiers: ["tier1"],
            platforms: ["ios", "android"],
            excludedFormats: ["banner"],
          },
        },
        {
          id: "arm-002-b",
          name: "MAX Challenger",
          networkProvider: "max",
          trafficPercentage: 40,
          targeting: {
            countries: ["US", "CA", "GB", "AU", "DE"],
            tiers: ["tier1"],
            platforms: ["ios", "android"],
            excludedFormats: ["banner"],
          },
        },
      ],
      startDate: getRelativeDate(5),
      endDate: null,
      durationDays: 14,
      prompt:
        "Send 60% to AdMob and 40% to MAX for Tier-1 countries. Exclude banners. Run for 14 days.",
      createdAt: getRelativeDate(6),
      updatedAt: getRelativeDate(0),
    },
    {
      id: "exp-003",
      name: "Rewarded Video Optimization",
      type: "cross_platform_ab",
      status: "completed",
      arms: [
        {
          id: "arm-003-a",
          name: "AdMob RV",
          networkProvider: "admob",
          trafficPercentage: 50,
          targeting: {
            countries: ["US", "JP", "KR"],
            tiers: ["tier1"],
            platforms: ["ios", "android"],
            excludedFormats: ["banner", "interstitial", "native"],
          },
        },
        {
          id: "arm-003-b",
          name: "MAX RV",
          networkProvider: "max",
          trafficPercentage: 50,
          targeting: {
            countries: ["US", "JP", "KR"],
            tiers: ["tier1"],
            platforms: ["ios", "android"],
            excludedFormats: ["banner", "interstitial", "native"],
          },
        },
      ],
      startDate: getRelativeDate(28),
      endDate: getRelativeDate(14),
      durationDays: 14,
      prompt:
        "Compare rewarded video performance between AdMob and MAX for US, JP, and KR. Run for 14 days.",
      createdAt: getRelativeDate(30),
      updatedAt: getRelativeDate(14),
    },
  ]
}

/**
 * Get a single experiment by ID
 */
export function getDemoExperiment(id: string): Experiment | undefined {
  return getDemoExperiments().find((exp) => exp.id === id)
}

/**
 * Generate experiment metrics with realistic variance
 */
export function generateExperimentMetrics(
  experiment: Experiment,
  seed: number = 42
): ExperimentMetrics {
  const random = seededRandom(seed + experiment.id.charCodeAt(4))

  // Generate arm metrics
  const byArm: ArmMetrics[] = experiment.arms.map((arm) => {
    const networkMod = NETWORK_PROVIDERS[arm.networkProvider].ecpmModifier
    const baseArpdau = randomInRange(
      random,
      METRIC_RANGES.arpdau.min,
      METRIC_RANGES.arpdau.max
    )
    const baseEcpm = randomInRange(
      random,
      METRIC_RANGES.ecpm.min,
      METRIC_RANGES.ecpm.max
    )
    const baseFillRate = randomInRange(
      random,
      METRIC_RANGES.fillRate.min,
      METRIC_RANGES.fillRate.max
    )
    const baseImdau = randomInRange(
      random,
      METRIC_RANGES.imdau.min,
      METRIC_RANGES.imdau.max
    )
    const baseDau = Math.floor(
      randomInRange(random, METRIC_RANGES.dau.min, METRIC_RANGES.dau.max)
    )

    // Apply network modifier with some variance
    const variance = 0.9 + random() * 0.2 // 0.9 to 1.1
    const arpdau = baseArpdau * networkMod * variance
    const ecpm = baseEcpm * networkMod * variance
    const fillRate = Math.min(baseFillRate * (0.95 + random() * 0.1), 100)
    const imdau = baseImdau * (0.9 + random() * 0.2)
    const dau = Math.floor(baseDau * (arm.trafficPercentage / 50)) // Scale by traffic

    const impressions = Math.floor(dau * imdau * experiment.durationDays)
    const requests = Math.floor(impressions / (fillRate / 100))
    const revenue = (impressions / 1000) * ecpm

    return {
      armId: arm.id,
      arpdau: Number(arpdau.toFixed(3)),
      imdau: Number(imdau.toFixed(1)),
      ecpm: Number(ecpm.toFixed(2)),
      revenue: Math.floor(revenue),
      fillRate: Number(fillRate.toFixed(1)),
      impressions,
      requests,
      dau,
      revenueDelta: 0,
      isWinner: false,
    }
  })

  // Calculate revenue delta and determine winner
  if (byArm.length >= 2) {
    const baselineRevenue = byArm[0].revenue
    byArm.forEach((arm, index) => {
      if (index > 0) {
        arm.revenueDelta = Number(
          (((arm.revenue - baselineRevenue) / baselineRevenue) * 100).toFixed(1)
        )
      }
    })

    // Determine winner by ARPDAU
    const maxArpdau = Math.max(...byArm.map((a) => a.arpdau))
    byArm.forEach((arm) => {
      arm.isWinner = arm.arpdau === maxArpdau
    })
  }

  // Generate network breakdown (for cross-platform, each arm has one network)
  const networkBreakdown: NetworkBreakdownItem[] = byArm.map((armMetrics) => {
    const arm = experiment.arms.find((a) => a.id === armMetrics.armId)!
    return {
      network: NETWORK_PROVIDERS[arm.networkProvider].displayName,
      armId: armMetrics.armId,
      ecpm: armMetrics.ecpm,
      revenue: armMetrics.revenue,
      revenueShare: 100, // In cross-platform test, each arm is 100% one network
      impressions: armMetrics.impressions,
      fillRate: armMetrics.fillRate,
    }
  })

  // Generate time series data
  const timeSeries: TimeSeriesPoint[] = []
  for (let day = 0; day < experiment.durationDays; day++) {
    const date = new Date(experiment.startDate)
    date.setDate(date.getDate() + day)
    const dateStr = formatDate(date)

    byArm.forEach((armMetrics) => {
      // Add daily variance
      const dailyVariance = 0.85 + random() * 0.3
      timeSeries.push({
        date: dateStr,
        armId: armMetrics.armId,
        arpdau: Number((armMetrics.arpdau * dailyVariance).toFixed(3)),
        ecpm: Number((armMetrics.ecpm * dailyVariance).toFixed(2)),
        revenue: Math.floor((armMetrics.revenue / experiment.durationDays) * dailyVariance),
      })
    })
  }

  // Calculate overall metrics
  const totalRevenue = byArm.reduce((sum, arm) => sum + arm.revenue, 0)
  const totalImpressions = byArm.reduce((sum, arm) => sum + arm.impressions, 0)
  const avgArpdau = byArm.reduce((sum, arm) => sum + arm.arpdau, 0) / byArm.length
  const avgEcpm = byArm.reduce((sum, arm) => sum + arm.ecpm, 0) / byArm.length

  return {
    experimentId: experiment.id,
    overall: {
      totalRevenue: Math.floor(totalRevenue),
      totalImpressions,
      avgArpdau: Number(avgArpdau.toFixed(3)),
      avgEcpm: Number(avgEcpm.toFixed(2)),
    },
    byArm,
    networkBreakdown,
    timeSeries,
  }
}

/**
 * Generate recommendations based on experiment results
 */
export function generateRecommendations(
  experiment: Experiment,
  metrics: ExperimentMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const winner = metrics.byArm.find((arm) => arm.isWinner)
  const loser = metrics.byArm.find((arm) => !arm.isWinner)

  if (!winner || !loser || experiment.status !== "completed") {
    return recommendations
  }

  const winnerArm = experiment.arms.find((a) => a.id === winner.armId)!
  const _loserArm = experiment.arms.find((a) => a.id === loser.armId)!

  // Calculate potential impact
  const revenueDiff = winner.revenue - loser.revenue
  const percentDiff = ((revenueDiff / loser.revenue) * 100).toFixed(1)
  const monthlyImpact = Math.floor(revenueDiff * 4) // Roughly 4 weeks

  // Primary recommendation: Shift traffic to winner
  recommendations.push({
    id: `rec-${experiment.id}-001`,
    experimentId: experiment.id,
    type: "shift_traffic",
    title: `Shift +${_loserArm.trafficPercentage}% traffic to ${NETWORK_PROVIDERS[winnerArm.networkProvider].displayName}`,
    rationale: `${NETWORK_PROVIDERS[winnerArm.networkProvider].displayName} showed ${percentDiff}% higher ARPDAU ($${winner.arpdau.toFixed(3)} vs $${loser.arpdau.toFixed(3)}). Increasing allocation could yield additional revenue.`,
    impactPreview: {
      revenueChange: monthlyImpact,
      revenueChangePercent: Number(percentDiff),
      confidence: Number(percentDiff) > 10 ? "high" : Number(percentDiff) > 5 ? "medium" : "low",
      timeframe: "monthly",
    },
    scope: {
      apps: "all",
      formats: winnerArm.targeting.excludedFormats.length > 0
        ? (["banner", "interstitial", "rewarded", "native", "app_open"] as const).filter(
            (f) => !winnerArm.targeting.excludedFormats.includes(f)
          )
        : ["banner", "interstitial", "rewarded", "native", "app_open"],
      countries: winnerArm.targeting.countries,
    },
    status: "pending",
    sourceArmId: loser.armId,
    targetArmId: winner.armId,
    trafficShiftPercent: _loserArm.trafficPercentage,
  })

  // Secondary recommendation if significant difference
  if (Number(percentDiff) > 15) {
    recommendations.push({
      id: `rec-${experiment.id}-002`,
      experimentId: experiment.id,
      type: "apply_winner",
      title: `Apply ${NETWORK_PROVIDERS[winnerArm.networkProvider].displayName} as primary network globally`,
      rationale: `With ${percentDiff}% improvement, consider applying this configuration to all traffic segments for maximum impact.`,
      impactPreview: {
        revenueChange: monthlyImpact * 2,
        revenueChangePercent: Number(percentDiff) * 1.5,
        confidence: "medium",
        timeframe: "monthly",
      },
      scope: {
        apps: "all",
        formats: ["banner", "interstitial", "rewarded", "native", "app_open"],
        countries: [...NETWORK_PROVIDERS[winnerArm.networkProvider].displayName === "MAX"
          ? ["US", "CA", "GB", "AU", "DE", "FR", "JP"]
          : winnerArm.targeting.countries],
      },
      status: "pending",
      targetArmId: winner.armId,
    })
  }

  return recommendations
}

/**
 * Get demo experiment with metrics and recommendations
 */
export function getDemoExperimentWithData(id: string): {
  experiment: Experiment
  metrics: ExperimentMetrics
  recommendations: Recommendation[]
} | null {
  const experiment = getDemoExperiment(id)
  if (!experiment) return null

  const metrics = generateExperimentMetrics(experiment)
  const recommendations = generateRecommendations(experiment, metrics)

  return { experiment, metrics, recommendations }
}
