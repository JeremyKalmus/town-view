import { create } from 'zustand'
import type { Rig, IssueFilters } from '@/types'

interface RigStore {
  // Selected rig
  selectedRig: Rig | null
  setSelectedRig: (rig: Rig | null) => void

  // Filters
  filters: IssueFilters
  setFilters: (filters: IssueFilters) => void
  resetFilters: () => void
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
}))
