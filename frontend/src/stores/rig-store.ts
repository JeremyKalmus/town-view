import { create } from 'zustand'
import type { Rig, IssueFilters } from '@/types'
import type { TreeFilters } from '@/components/features/FilterBar'
import { DEFAULT_FILTERS } from '@/components/features/FilterBar'

interface RigStore {
  // Selected rig
  selectedRig: Rig | null
  setSelectedRig: (rig: Rig | null) => void

  // Legacy filters (for dashboard)
  filters: IssueFilters
  setFilters: (filters: IssueFilters) => void
  resetFilters: () => void

  // Tree view filters
  treeFilters: TreeFilters
  setTreeFilters: (filters: TreeFilters) => void
  resetTreeFilters: () => void
}

const defaultFilters: IssueFilters = {
  status: 'all',
}

export const useRigStore = create<RigStore>((set) => ({
  selectedRig: null,
  setSelectedRig: (rig) => set({ selectedRig: rig }),

  filters: defaultFilters,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),

  treeFilters: DEFAULT_FILTERS,
  setTreeFilters: (treeFilters) => set({ treeFilters }),
  resetTreeFilters: () => set({ treeFilters: DEFAULT_FILTERS }),
}))
