/**
 * Central data store using Zustand.
 * Receives WebSocket snapshot data and makes it available to all views.
 */

import { create } from 'zustand'
import type { Rig, Agent, Issue, Mail, ActivityEvent, CacheStats } from '@/types'

/**
 * Snapshot payload from WebSocket connection.
 */
export interface Snapshot {
  rigs: Rig[]
  agents: Record<string, Agent[]>
  issues: Record<string, Issue[]>
  mail: Mail[]
  activity: ActivityEvent[]
  cache_stats: CacheStats | null
}

interface DataState {
  // Data
  rigs: Rig[]
  agents: Record<string, Agent[]>  // keyed by rigId
  issues: Record<string, Issue[]>  // keyed by rigId
  mail: Mail[]
  activity: ActivityEvent[]
  cacheStats: CacheStats | null

  // Metadata
  lastUpdated: number | null
  connected: boolean

  // Actions
  setSnapshot: (snapshot: Snapshot) => void
  setConnected: (connected: boolean) => void
}

export const useDataStore = create<DataState>((set) => ({
  // Initial state
  rigs: [],
  agents: {},
  issues: {},
  mail: [],
  activity: [],
  cacheStats: null,
  lastUpdated: null,
  connected: false,

  // Atomic snapshot update
  setSnapshot: (snapshot) =>
    set({
      rigs: snapshot.rigs,
      agents: snapshot.agents,
      issues: snapshot.issues,
      mail: snapshot.mail,
      activity: snapshot.activity,
      cacheStats: snapshot.cache_stats,
      lastUpdated: Date.now(),
    }),

  // Connection status
  setConnected: (connected) =>
    set({ connected }),
}))

// Selectors for efficient re-renders

/**
 * Select all rigs.
 */
export const selectRigs = (state: DataState) => state.rigs

/**
 * Select agents for a specific rig.
 */
export const selectAgentsByRig = (rigId: string) => (state: DataState) =>
  state.agents[rigId] ?? []

/**
 * Select issues for a specific rig.
 */
export const selectIssuesByRig = (rigId: string) => (state: DataState) =>
  state.issues[rigId] ?? []

/**
 * Select all mail.
 */
export const selectMail = (state: DataState) => state.mail

/**
 * Select activity events.
 */
export const selectActivity = (state: DataState) => state.activity

/**
 * Select cache statistics.
 */
export const selectCacheStats = (state: DataState) => state.cacheStats

/**
 * Select connection status.
 */
export const selectConnected = (state: DataState) => state.connected

/**
 * Select last updated timestamp.
 */
export const selectLastUpdated = (state: DataState) => state.lastUpdated

/**
 * Select cache statistics.
 */
export const selectCacheStats = (state: DataState) => state.cacheStats
