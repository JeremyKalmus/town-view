import { create } from 'zustand'
import type { MoleculeProgress, PeekOutput, ActivityEvent } from '@/types'

// Health thresholds in milliseconds
export const HEALTH_THRESHOLDS = {
  concerning: 2 * 60 * 1000, // 2 minutes
  stuck: 10 * 60 * 1000,     // 10 minutes
} as const

interface MonitoringStore {
  // Progress cache for molecules (keyed by issue_id)
  progressCache: Map<string, MoleculeProgress>
  setProgress: (issueId: string, progress: MoleculeProgress) => void
  clearProgress: (issueId: string) => void

  // Activity events (recent state changes)
  activityEvents: ActivityEvent[]
  setActivityEvents: (events: ActivityEvent[]) => void
  addActivityEvent: (event: ActivityEvent) => void
  clearActivityEvents: () => void

  // Peek state for agent terminal output
  peekState: {
    agentId: string | null
    output: PeekOutput | null
    isLoading: boolean
    error: string | null
  }
  setPeekAgentId: (agentId: string | null) => void
  setPeekOutput: (output: PeekOutput | null) => void
  setPeekLoading: (isLoading: boolean) => void
  setPeekError: (error: string | null) => void
  clearPeek: () => void
}

export const useMonitoringStore = create<MonitoringStore>((set) => ({
  // Progress cache
  progressCache: new Map(),
  setProgress: (issueId, progress) =>
    set((state) => {
      const newCache = new Map(state.progressCache)
      newCache.set(issueId, progress)
      return { progressCache: newCache }
    }),
  clearProgress: (issueId) =>
    set((state) => {
      const newCache = new Map(state.progressCache)
      newCache.delete(issueId)
      return { progressCache: newCache }
    }),

  // Activity events
  activityEvents: [],
  setActivityEvents: (events) => set({ activityEvents: events }),
  addActivityEvent: (event) =>
    set((state) => ({
      activityEvents: [event, ...state.activityEvents].slice(0, 50), // Keep last 50 events
    })),
  clearActivityEvents: () => set({ activityEvents: [] }),

  // Peek state
  peekState: {
    agentId: null,
    output: null,
    isLoading: false,
    error: null,
  },
  setPeekAgentId: (agentId) =>
    set((state) => ({
      peekState: { ...state.peekState, agentId, output: null, error: null },
    })),
  setPeekOutput: (output) =>
    set((state) => ({
      peekState: { ...state.peekState, output, error: null },
    })),
  setPeekLoading: (isLoading) =>
    set((state) => ({
      peekState: { ...state.peekState, isLoading },
    })),
  setPeekError: (error) =>
    set((state) => ({
      peekState: { ...state.peekState, error, isLoading: false },
    })),
  clearPeek: () =>
    set({
      peekState: {
        agentId: null,
        output: null,
        isLoading: false,
        error: null,
      },
    }),
}))
