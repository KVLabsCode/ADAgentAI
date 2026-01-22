"use client"

import { useReportWebVitals } from "next/web-vitals"
import { usePostHog } from "posthog-js/react"

/**
 * Web Vitals monitoring component
 * Captures Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP) and sends them to PostHog
 *
 * Include this component once in your app, typically in layout.tsx
 */
export function WebVitals() {
  const posthog = usePostHog()

  useReportWebVitals((metric) => {
    // Only capture if PostHog is available
    if (!posthog) return

    posthog.capture("web_vital", {
      // Core metric data
      metric_name: metric.name,
      metric_value: metric.value,
      metric_id: metric.id,
      metric_rating: metric.rating, // "good", "needs-improvement", or "poor"

      // Additional context
      navigation_type: metric.navigationType,

      // Rounded value for easier analysis
      metric_value_rounded: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value
      ),
    })
  })

  return null
}
