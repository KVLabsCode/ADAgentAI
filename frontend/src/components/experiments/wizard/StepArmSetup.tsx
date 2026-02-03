"use client"

import { Input } from "@/atoms/input"
import { Label } from "@/atoms/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import { NETWORK_PROVIDERS, type NetworkProvider } from "@/lib/experiments"
import type { UseExperimentWizard } from "../hooks"

interface StepArmSetupProps {
  wizard: UseExperimentWizard
}

function ArmCard({
  label,
  armKey,
  value,
  onChange,
  disabledNetwork,
}: {
  label: string
  armKey: "armA" | "armB"
  value: { name: string; networkProvider: NetworkProvider }
  onChange: (updates: Partial<typeof value>) => void
  disabledNetwork?: NetworkProvider
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4 flex-1">
      <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-4">
        {label}
      </h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${armKey}-name`}>Arm Name</Label>
          <Input
            id={`${armKey}-name`}
            placeholder={armKey === "armA" ? "Control" : "Variant"}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${armKey}-network`}>Network</Label>
          <Select
            value={value.networkProvider}
            onValueChange={(v) =>
              onChange({ networkProvider: v as NetworkProvider })
            }
          >
            <SelectTrigger id={`${armKey}-network`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NETWORK_PROVIDERS).map(([key, config]) => (
                <SelectItem
                  key={key}
                  value={key}
                  disabled={key === disabledNetwork}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.displayName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export function StepArmSetup({ wizard }: StepArmSetupProps) {
  const { data, updateArmSetup } = wizard

  return (
    <div className="space-y-6">
      <p className="text-[length:var(--text-description)] text-muted-foreground">
        Configure the two arms of your A/B test. Each arm will use a different
        ad mediation network.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <ArmCard
          label="Arm A (Control)"
          armKey="armA"
          value={data.armSetup.armA}
          onChange={(updates) =>
            updateArmSetup({ armA: { ...data.armSetup.armA, ...updates } })
          }
          disabledNetwork={data.armSetup.armB.networkProvider}
        />

        <div className="flex items-center justify-center">
          <span className="text-muted-foreground font-medium">vs</span>
        </div>

        <ArmCard
          label="Arm B (Variant)"
          armKey="armB"
          value={data.armSetup.armB}
          onChange={(updates) =>
            updateArmSetup({ armB: { ...data.armSetup.armB, ...updates } })
          }
          disabledNetwork={data.armSetup.armA.networkProvider}
        />
      </div>

      {data.armSetup.armA.networkProvider ===
        data.armSetup.armB.networkProvider && (
        <p className="text-[length:var(--text-description)] text-destructive">
          Please select different networks for each arm
        </p>
      )}
    </div>
  )
}
