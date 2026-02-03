"use client"

import { Badge } from "@/atoms/badge"
import {
  NETWORK_PROVIDERS,
  EXPERIMENT_TYPES,
  AD_FORMATS,
  type AdFormat,
} from "@/lib/experiments"
import type { UseExperimentWizard } from "../hooks"

interface StepReviewProps {
  wizard: UseExperimentWizard
}

function ReviewSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[length:var(--text-description)] text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      <div className="text-[length:var(--text-label)]">{children}</div>
    </div>
  )
}

export function StepReview({ wizard }: StepReviewProps) {
  const { data } = wizard
  const { basicInfo, armSetup, trafficAllocation } = data
  const { parsed } = trafficAllocation

  return (
    <div className="space-y-6">
      <p className="text-[length:var(--text-description)] text-muted-foreground">
        Review your experiment configuration before launching.
      </p>

      <div className="space-y-6 divide-y divide-border/50">
        {/* Basic Info */}
        <ReviewSection title="Experiment">
          <p className="font-[var(--font-weight-medium)]">{basicInfo.name}</p>
          <p className="text-muted-foreground text-[length:var(--text-description)]">
            {EXPERIMENT_TYPES[basicInfo.type]?.displayName}
          </p>
        </ReviewSection>

        {/* Arms */}
        <div className="pt-6 space-y-4">
          <h4 className="text-[length:var(--text-description)] text-muted-foreground uppercase tracking-wide">
            Test Arms
          </h4>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      NETWORK_PROVIDERS[armSetup.armA.networkProvider].color,
                  }}
                />
                <span className="font-[var(--font-weight-medium)]">
                  {armSetup.armA.name || "Control"}
                </span>
              </div>
              <p className="text-[length:var(--text-description)] text-muted-foreground">
                {NETWORK_PROVIDERS[armSetup.armA.networkProvider].displayName}
              </p>
              {parsed && (
                <Badge variant="secondary" className="mt-2">
                  {parsed.armAllocations[0]?.trafficPercentage || 50}% traffic
                </Badge>
              )}
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      NETWORK_PROVIDERS[armSetup.armB.networkProvider].color,
                  }}
                />
                <span className="font-[var(--font-weight-medium)]">
                  {armSetup.armB.name || "Variant"}
                </span>
              </div>
              <p className="text-[length:var(--text-description)] text-muted-foreground">
                {NETWORK_PROVIDERS[armSetup.armB.networkProvider].displayName}
              </p>
              {parsed && (
                <Badge variant="secondary" className="mt-2">
                  {parsed.armAllocations[1]?.trafficPercentage || 50}% traffic
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Targeting */}
        {parsed && (
          <div className="pt-6 space-y-4">
            <h4 className="text-[length:var(--text-description)] text-muted-foreground uppercase tracking-wide">
              Targeting
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              {parsed.targeting.countries.length > 0 && (
                <ReviewSection title="Countries">
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.targeting.countries.map((code) => (
                      <Badge key={code} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </ReviewSection>
              )}

              {parsed.targeting.excludedFormats.length > 0 && (
                <ReviewSection title="Excluded Formats">
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.targeting.excludedFormats.map((format) => (
                      <Badge key={format} variant="outline" className="text-xs">
                        {AD_FORMATS[format as AdFormat]?.displayName || format}
                      </Badge>
                    ))}
                  </div>
                </ReviewSection>
              )}
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="pt-6">
          <ReviewSection title="Duration">
            <p>{parsed?.durationDays || 7} days</p>
          </ReviewSection>
        </div>

        {/* Prompt (if provided) */}
        {trafficAllocation.prompt && (
          <div className="pt-6">
            <ReviewSection title="Original Prompt">
              <p className="text-[length:var(--text-description)] text-muted-foreground italic">
                &ldquo;{trafficAllocation.prompt}&rdquo;
              </p>
            </ReviewSection>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-info/30 bg-info/5 p-4 mt-6">
        <p className="text-[length:var(--text-description)] text-info">
          <strong>Demo Mode:</strong> This experiment will use simulated data.
          No actual traffic will be affected.
        </p>
      </div>
    </div>
  )
}
