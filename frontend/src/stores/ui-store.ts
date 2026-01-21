/**
 * UI state store using Zustand.
 * Manages view mode and other UI state for Town View.
 */

import { create } from 'zustand'

export type ViewMode = 'planning' | 'monitoring' | 'audit'

interface UIStore {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'planning',
  setViewMode: (mode) => set({ viewMode: mode }),
}))
