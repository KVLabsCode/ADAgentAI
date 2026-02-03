"use client"

import { useEffect } from "react"
import { Textarea } from "@/atoms/textarea"
import { Label } from "@/atoms/label"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import {
  NETWORK_PROVIDERS,
  COUNTRIES,
  AD_FORMATS,
  DURATION_OPTIONS,
  PROMPT_PLACEHOLDER,
  type NetworkProvider,
  type AdFormat,
} from "@/lib/experiments"
import type { UseExperimentWizard } from "../hooks"

interface StepTrafficAllocationProps {
  wizard: UseExperimentWizard
}

function TrafficSlider({
  armANetwork,
  armBNetwork,
  armAPercent,
  onChange,
}: {
  armANetwork: NetworkProvider
  armBNetwork: NetworkProvider
  armAPercent: number
  onChange: (armAPercent: number) => void
}) {
  const armBPercent = 100 - armAPercent

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[length:var(--text-description)]">
        <span className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: NETWORK_PROVIDERS[armANetwork].color }}
          />
          {NETWORK_PROVIDERS[armANetwork].displayName}
          <span className="font-medium text-foreground">{armAPercent}%</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{armBPercent}%</span>
          {NETWORK_PROVIDERS[armBNetwork].displayName}
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: NETWORK_PROVIDERS[armBNetwork].color }}
          />
        </span>
      </div>

      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${armAPercent}%`,
            backgroundColor: NETWORK_PROVIDERS[armANetwork].color,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 transition-all"
          style={{
            width: `${armBPercent}%`,
            backgroundColor: NETWORK_PROVIDERS[armBNetwork].color,
          }}
        />
      </div>

      <input
        type="range"
        min="10"
        max="90"
        step="5"
        value={armAPercent}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

function ChipGroup({
  label,
  items,
  getLabel,
}: {
  label: string
  items: string[]
  getLabel: (item: string) => string
}) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="text-xs">
            {getLabel(item)}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function StepTrafficAllocation({ wizard }: StepTrafficAllocationProps) {
  const { data, updatePrompt, updateParsedAllocation } = wizard
  const { prompt, parsed } = data.trafficAllocation

  // Default parsed allocation if none exists
  useEffect(() => {
    if (!parsed) {
      updatePrompt("")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSliderChange = (armAPercent: number) => {
    if (!parsed) return

    const newParsed = {
      ...parsed,
      armAllocations: [
        { ...parsed.armAllocations[0], trafficPercentage: armAPercent },
        { ...parsed.armAllocations[1], trafficPercentage: 100 - armAPercent },
      ],
    }
    updateParsedAllocation(newParsed)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="traffic-prompt">Describe your traffic split</Label>
        <Textarea
          id="traffic-prompt"
          placeholder={PROMPT_PLACEHOLDER}
          value={prompt}
          onChange={(e) => updatePrompt(e.target.value)}
          className="min-h-[100px]"
        />
        <p className="text-[length:var(--text-description)] text-muted-foreground">
          Use natural language to describe your traffic allocation. We&apos;ll
          parse it automatically.
        </p>
      </div>

      {parsed && (
        <div className="space-y-6 pt-4 border-t border-border/50">
          <h4 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
            Parsed Configuration
          </h4>

          {/* Traffic Split */}
          {parsed.armAllocations.length >= 2 && (
            <div className="space-y-2">
              <Label>Traffic Split</Label>
              <TrafficSlider
                armANetwork={
                  parsed.armAllocations[0].networkProvider ||
                  data.armSetup.armA.networkProvider
                }
                armBNetwork={
                  parsed.armAllocations[1].networkProvider ||
                  data.armSetup.armB.networkProvider
                }
                armAPercent={parsed.armAllocations[0].trafficPercentage}
                onChange={handleSliderChange}
              />
            </div>
          )}

          {/* Countries */}
          <ChipGroup
            label="Target Countries"
            items={parsed.targeting.countries}
            getLabel={(code) => `${code} - ${COUNTRIES[code] || code}`}
          />

          {/* Excluded Formats */}
          <ChipGroup
            label="Excluded Ad Formats"
            items={parsed.targeting.excludedFormats}
            getLabel={(format) =>
              AD_FORMATS[format as AdFormat]?.displayName || format
            }
          />

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateParsedAllocation({
                      ...parsed,
                      durationDays: option.value,
                    })
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors",
                    parsed.durationDays === option.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!parsed && prompt.trim() === "" && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-[length:var(--text-description)]">
            Enter a prompt above to configure your experiment, or use the
            sliders to manually set traffic allocation.
          </p>
        </div>
      )}
    </div>
  )
}
