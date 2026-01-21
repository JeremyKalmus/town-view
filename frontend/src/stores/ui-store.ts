import { create } from 'zustand'

export type ViewMode = 'planning' | 'monitoring' | 'audit'

interface UIStore {
  // Active view mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'planning',
  setViewMode: (viewMode) => set({ viewMode }),
}))
