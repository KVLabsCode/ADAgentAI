"use client"

import { useState } from "react"
import { Check, Zap } from "lucide-react"
import { Button } from "@/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/molecules/dialog"
import type { Recommendation, ExecutionScope } from "@/lib/experiments"
import { ScopeSelector } from "./ScopeSelector"

interface ExecutionModalProps {
  recommendation: Recommendation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (recommendation: Recommendation, scope: ExecutionScope) => void
}

type ExecutionState = "configure" | "executing" | "success"

export function ExecutionModal({
  recommendation,
  open,
  onOpenChange,
  onExecute,
}: ExecutionModalProps) {
  const [state, setState] = useState<ExecutionState>("configure")
  const [scope, setScope] = useState<ExecutionScope>({
    apps: "all",
    formats: recommendation?.scope.formats || ["banner", "interstitial", "rewarded"],
    countries: recommendation?.scope.countries || ["US"],
  })

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && recommendation) {
      setState("configure")
      setScope({
        apps: "all",
        formats: recommendation.scope.formats || ["banner", "interstitial", "rewarded"],
        countries: recommendation.scope.countries || ["US"],
      })
    }
    onOpenChange(newOpen)
  }

  const handleExecute = async () => {
    if (!recommendation) return

    setState("executing")

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setState("success")
    onExecute(recommendation, scope)
  }

  const handleDone = () => {
    onOpenChange(false)
  }

  if (!recommendation) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state === "success" ? (
          <>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-success" />
              </div>
              <DialogTitle className="text-center mb-2">
                Changes applied via Kovio
              </DialogTitle>
              <DialogDescription className="text-center">
                Traffic shift executed successfully.
                <br />
                No mediation UI configuration required.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Zap className="h-4 w-4" />
                </div>
                <DialogTitle>Execute Recommendation</DialogTitle>
              </div>
              <DialogDescription>{recommendation.title}</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <h4 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-4">
                Select Scope
              </h4>
              <ScopeSelector scope={scope} onChange={setScope} />
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={state === "executing"}
              >
                Cancel
              </Button>
              <Button onClick={handleExecute} disabled={state === "executing"}>
                {state === "executing" ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Executing...
                  </>
                ) : (
                  "Execute"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
