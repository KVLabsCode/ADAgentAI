"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { storage } from "@/lib/storage"
import type { Experiment } from "@/lib/experiments/types"

const DEMO_EXPERIMENTS_STORAGE_KEY = "demo_experiments"

interface DemoExperimentsContextValue {
  /** Chat-created experiments from this context */
  experiments: Experiment[]
  /** Add a new experiment created via chat */
  addExperiment: (experiment: Experiment) => void
  /** Update an existing experiment (e.g., status change, execute/rollback) */
  updateExperiment: (id: string, updates: Partial<Experiment>) => void
  /** Remove an experiment by ID */
  removeExperiment: (id: string) => void
  /** Clear all chat-created experiments */
  clearExperiments: () => void
}

const DemoExperimentsContext = createContext<DemoExperimentsContextValue | null>(null)

/**
 * Load experiments from localStorage
 */
function loadStoredExperiments(): Experiment[] {
  if (typeof window === "undefined") return []
  return storage.get<Experiment[]>(DEMO_EXPERIMENTS_STORAGE_KEY, [])
}

/**
 * Save experiments to localStorage
 */
function saveExperiments(experiments: Experiment[]): void {
  if (typeof window === "undefined") return
  storage.set(DEMO_EXPERIMENTS_STORAGE_KEY, experiments)
}

export function DemoExperimentsProvider({ children }: { children: React.ReactNode }) {
  // Initialize with lazy state from localStorage
  const [experiments, setExperiments] = useState<Experiment[]>(() => {
    if (typeof window === "undefined") return []
    return loadStoredExperiments()
  })

  // Track if we've done initial load (to avoid saving on mount)
  const isInitialMount = React.useRef(true)

  // Persist to localStorage when experiments change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveExperiments(experiments)
  }, [experiments])

  const addExperiment = useCallback((experiment: Experiment) => {
    setExperiments(prev => {
      // Prevent duplicates
      if (prev.some(e => e.id === experiment.id)) {
        return prev
      }
      return [...prev, experiment]
    })
  }, [])

  const updateExperiment = useCallback((id: string, updates: Partial<Experiment>) => {
    setExperiments(prev =>
      prev.map(exp =>
        exp.id === id
          ? { ...exp, ...updates, updatedAt: new Date().toISOString() }
          : exp
      )
    )
  }, [])

  const removeExperiment = useCallback((id: string) => {
    setExperiments(prev => prev.filter(exp => exp.id !== id))
  }, [])

  const clearExperiments = useCallback(() => {
    setExperiments([])
  }, [])

  const value: DemoExperimentsContextValue = {
    experiments,
    addExperiment,
    updateExperiment,
    removeExperiment,
    clearExperiments,
  }

  return (
    <DemoExperimentsContext.Provider value={value}>
      {children}
    </DemoExperimentsContext.Provider>
  )
}

export function useDemoExperiments(): DemoExperimentsContextValue {
  const context = useContext(DemoExperimentsContext)
  if (!context) {
    throw new Error("useDemoExperiments must be used within a DemoExperimentsProvider")
  }
  return context
}

/**
 * Utility hook that returns both static and chat-created experiments merged
 */
export function useAllDemoExperiments(staticExperiments: Experiment[]): Experiment[] {
  const { experiments: chatExperiments } = useDemoExperiments()

  // Merge: static first, then chat-created (avoiding duplicates by ID)
  const staticIds = new Set(staticExperiments.map(e => e.id))
  const uniqueChatExperiments = chatExperiments.filter(e => !staticIds.has(e.id))

  return [...staticExperiments, ...uniqueChatExperiments]
}
