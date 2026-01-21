/**
 * Toast notification store using Zustand.
 * Provides global toast state management.
 */

import { create } from 'zustand'
import type { ToastVariant } from '@/components/ui/Toast'

export interface ToastState {
  title: string
  description?: string
  variant: ToastVariant
  open: boolean
}

interface ToastStore {
  toast: ToastState
  showToast: (title: string, description?: string, variant?: ToastVariant) => void
  hideToast: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toast: {
    title: '',
    description: undefined,
    variant: 'info',
    open: false,
  },
  showToast: (title, description, variant = 'info') =>
    set({
      toast: {
        title,
        description,
        variant,
        open: true,
      },
    }),
  hideToast: () =>
    set((state) => ({
      toast: { ...state.toast, open: false },
    })),
}))

/**
 * Show a success toast notification.
 */
export function showSuccessToast(title: string, description?: string) {
  useToastStore.getState().showToast(title, description, 'success')
}

/**
 * Show an error toast notification.
 */
export function showErrorToast(title: string, description?: string) {
  useToastStore.getState().showToast(title, description, 'error')
}

/**
 * Show an info toast notification.
 */
export function showInfoToast(title: string, description?: string) {
  useToastStore.getState().showToast(title, description, 'info')
}
