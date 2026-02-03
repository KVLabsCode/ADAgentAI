"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react"
import { PageContainer, PageHeader } from "@/organisms/theme"
import { Button } from "@/atoms/button"
import { cn } from "@/lib/utils"
import { useExperimentWizard, type WizardStep } from "../hooks"
import { StepBasicInfo } from "./StepBasicInfo"
import { StepArmSetup } from "./StepArmSetup"
import { StepTrafficAllocation } from "./StepTrafficAllocation"
import { StepReview } from "./StepReview"

interface ExperimentWizardProps {
  onClose: () => void
  onComplete: (experimentId: string) => void
}

const STEPS = [
  { label: "Basic Info", description: "Name your experiment" },
  { label: "Arm Setup", description: "Choose networks to compare" },
  { label: "Traffic Allocation", description: "Configure targeting" },
  { label: "Review", description: "Confirm and launch" },
]

function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isCompleted &&
                    "bg-success text-success-foreground",
                  isCurrent &&
                    "bg-accent text-accent-foreground border-2 border-accent",
                  isUpcoming &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1.5 hidden sm:block",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 transition-colors",
                  index < currentStep ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function ExperimentWizard({ onClose, onComplete }: ExperimentWizardProps) {
  const wizard = useExperimentWizard()
  const { step, canProceed, nextStep, prevStep, isSubmitting, createExperiment } = wizard

  const handleSubmit = async () => {
    const experimentId = await createExperiment()
    onComplete(experimentId)
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepBasicInfo wizard={wizard} />
      case 1:
        return <StepArmSetup wizard={wizard} />
      case 2:
        return <StepTrafficAllocation wizard={wizard} />
      case 3:
        return <StepReview wizard={wizard} />
      default:
        return null
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="New Experiment"
        description={STEPS[step].description}
      >
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>
      </PageHeader>

      <WizardProgress currentStep={step} />

      <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-6">
        {renderStep()}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={step === 0 ? onClose : prevStep}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < 3 ? (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Launching...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Launch Experiment
              </>
            )}
          </Button>
        )}
      </div>
    </PageContainer>
  )
}
