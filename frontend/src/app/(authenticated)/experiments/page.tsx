"use client"

import * as React from "react"
import { useState } from "react"
import { Plus, FlaskConical, AlertCircle } from "lucide-react"
import { useDemo } from "@/contexts/demo-mode-context"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  EmptyState,
} from "@/organisms/theme"
import { Button } from "@/atoms/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/molecules/tabs"
import { ExperimentCard } from "@/components/experiments/ExperimentCard"
import { ExperimentWizard } from "@/components/experiments/wizard/ExperimentWizard"
import {
  useExperimentData,
  filterExperimentsByStatus,
} from "@/components/experiments/hooks"

function DemoModeRequired() {
  return (
    <PageContainer>
      <PageHeader
        title="Experiments"
        description="Cross-platform A/B testing for ad mediation"
      />
      <div className="rounded-[var(--card-radius)] border-[0.8px] border-warning/30 bg-warning/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] text-warning mb-1">
              Demo Mode Required
            </h3>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">
              The Experiments feature is currently only available in demo mode.
              Enable demo mode in Settings to explore cross-platform A/B testing
              capabilities.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/settings")}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default function ExperimentsPage() {
  const { isDemoMode } = useDemo()
  const { experiments } = useExperimentData()
  const [showWizard, setShowWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "running" | "completed">("all")

  // Gate: require demo mode
  if (!isDemoMode) {
    return <DemoModeRequired />
  }

  const filteredExperiments = filterExperimentsByStatus(experiments, activeTab)

  if (showWizard) {
    return (
      <ExperimentWizard
        onClose={() => setShowWizard(false)}
        onComplete={(experimentId) => {
          setShowWizard(false)
          window.location.href = `/experiments/${experimentId}`
        }}
      />
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Experiments"
        description="Cross-platform A/B testing for ad mediation"
      >
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Experiment
        </Button>
      </PageHeader>

      <SettingsSection title="Your Experiments" bare>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All ({experiments.length})
            </TabsTrigger>
            <TabsTrigger value="running">
              Running ({experiments.filter((e) => e.status === "running").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({experiments.filter((e) => e.status === "completed").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredExperiments.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title={
                  activeTab === "all"
                    ? "No experiments yet"
                    : `No ${activeTab} experiments`
                }
                description={
                  activeTab === "all"
                    ? "Create your first A/B test to compare ad mediation platforms."
                    : `You don't have any ${activeTab} experiments.`
                }
              >
                {activeTab === "all" && (
                  <Button onClick={() => setShowWizard(true)} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Experiment
                  </Button>
                )}
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {filteredExperiments.map((experiment) => (
                  <ExperimentCard key={experiment.id} experiment={experiment} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </PageContainer>
  )
}
