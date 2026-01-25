/**
 * UI state store using Zustand.
 * Manages view mode and other UI state for Town View.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'planning' | 'monitoring' | 'audit'
export type DashboardVersion = 'v1' | 'v2'

interface UIStore {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  dashboardVersion: DashboardVersion
  setDashboardVersion: (version: DashboardVersion) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      viewMode: 'planning',
      setViewMode: (mode) => set({ viewMode: mode }),
      dashboardVersion: 'v2',
      setDashboardVersion: (version) => set({ dashboardVersion: version }),
    }),
    {
      name: 'townview-ui-store',
      partialize: (state) => ({ dashboardVersion: state.dashboardVersion }),
    }
  )
)
