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
import { EXPERIMENT_TYPES } from "@/lib/experiments"
import type { UseExperimentWizard } from "../hooks"

interface StepBasicInfoProps {
  wizard: UseExperimentWizard
}

export function StepBasicInfo({ wizard }: StepBasicInfoProps) {
  const { data, updateBasicInfo } = wizard

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="experiment-name">Experiment Name</Label>
        <Input
          id="experiment-name"
          placeholder="e.g., US iOS Traffic Split Test"
          value={data.basicInfo.name}
          onChange={(e) => updateBasicInfo({ name: e.target.value })}
          autoFocus
        />
        <p className="text-[length:var(--text-description)] text-muted-foreground">
          Choose a descriptive name to identify this experiment
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="experiment-type">Experiment Type</Label>
        <Select
          value={data.basicInfo.type}
          onValueChange={(value) =>
            updateBasicInfo({
              type: value as typeof data.basicInfo.type,
            })
          }
        >
          <SelectTrigger id="experiment-type" className="w-full">
            <SelectValue placeholder="Select experiment type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EXPERIMENT_TYPES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div>
                  <span>{config.displayName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[length:var(--text-description)] text-muted-foreground">
          {EXPERIMENT_TYPES[data.basicInfo.type]?.description}
        </p>
      </div>
    </div>
  )
}
