"use client"

import { useState, useCallback } from "react"
import type {
  ExperimentWizardData,
  WizardBasicInfo,
  WizardArmSetup,
  ParsedPromptAllocation,
} from "@/lib/experiments"
import { parseTrafficPrompt } from "@/lib/experiments"

export type WizardStep = 0 | 1 | 2 | 3

const INITIAL_WIZARD_DATA: ExperimentWizardData = {
  basicInfo: {
    name: "",
    type: "cross_platform_ab",
  },
  armSetup: {
    armA: {
      name: "Control",
      networkProvider: "admob",
    },
    armB: {
      name: "Variant",
      networkProvider: "max",
    },
  },
  trafficAllocation: {
    prompt: "",
    parsed: null,
  },
}

export function useExperimentWizard() {
  const [step, setStep] = useState<WizardStep>(0)
  const [data, setData] = useState<ExperimentWizardData>(INITIAL_WIZARD_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step navigation
  const nextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 3) as WizardStep)
  }, [])

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0) as WizardStep)
  }, [])

  const goToStep = useCallback((newStep: WizardStep) => {
    setStep(newStep)
  }, [])

  // Update basic info
  const updateBasicInfo = useCallback((info: Partial<WizardBasicInfo>) => {
    setData((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, ...info },
    }))
  }, [])

  // Update arm setup
  const updateArmSetup = useCallback((setup: Partial<WizardArmSetup>) => {
    setData((prev) => ({
      ...prev,
      armSetup: {
        armA: { ...prev.armSetup.armA, ...setup.armA },
        armB: { ...prev.armSetup.armB, ...setup.armB },
      },
    }))
  }, [])

  // Parse prompt and update traffic allocation
  const updatePrompt = useCallback((prompt: string) => {
    const parsed = prompt.trim() ? parseTrafficPrompt(prompt) : null

    // Update arm names based on parsed networks
    if (parsed && parsed.armAllocations.length >= 2) {
      setData((prev) => ({
        ...prev,
        armSetup: {
          armA: {
            ...prev.armSetup.armA,
            networkProvider: parsed.armAllocations[0].networkProvider,
          },
          armB: {
            ...prev.armSetup.armB,
            networkProvider: parsed.armAllocations[1].networkProvider,
          },
        },
        trafficAllocation: { prompt, parsed },
      }))
    } else {
      setData((prev) => ({
        ...prev,
        trafficAllocation: { prompt, parsed },
      }))
    }
  }, [])

  // Update parsed allocation directly (from sliders)
  const updateParsedAllocation = useCallback((parsed: ParsedPromptAllocation) => {
    setData((prev) => ({
      ...prev,
      trafficAllocation: { ...prev.trafficAllocation, parsed },
    }))
  }, [])

  // Validation for each step
  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: // Basic Info
        return data.basicInfo.name.trim().length >= 3
      case 1: // Arm Setup
        return (
          data.armSetup.armA.networkProvider !== data.armSetup.armB.networkProvider
        )
      case 2: // Traffic Allocation
        return (
          data.trafficAllocation.parsed !== null &&
          data.trafficAllocation.parsed.armAllocations.length >= 2
        )
      case 3: // Review
        return true
      default:
        return false
    }
  }, [step, data])

  // Reset wizard
  const reset = useCallback(() => {
    setStep(0)
    setData(INITIAL_WIZARD_DATA)
    setIsSubmitting(false)
  }, [])

  // Create experiment (demo mode just returns a mock ID)
  const createExperiment = useCallback(async (): Promise<string> => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSubmitting(false)
    // Return a new experiment ID
    return `exp-${Date.now()}`
  }, [])

  return {
    step,
    data,
    isSubmitting,
    nextStep,
    prevStep,
    goToStep,
    updateBasicInfo,
    updateArmSetup,
    updatePrompt,
    updateParsedAllocation,
    canProceed,
    reset,
    createExperiment,
  }
}

export type UseExperimentWizard = ReturnType<typeof useExperimentWizard>
