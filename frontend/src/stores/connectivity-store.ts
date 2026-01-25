/**
 * Connectivity store using Zustand.
 * Tracks online/offline state and manages connection recovery.
 */

import { create } from 'zustand'

export type ConnectivityStatus = 'online' | 'offline' | 'reconnecting'

interface ConnectivityStore {
  // Current status
  status: ConnectivityStatus
  // Last successful connection time
  lastOnline: number | null
  // Number of consecutive failures
  failureCount: number

  // Actions
  setOnline: () => void
  setOffline: () => void
  setReconnecting: () => void
  incrementFailure: () => void
  resetFailures: () => void
}

export const useConnectivityStore = create<ConnectivityStore>((set) => ({
  status: 'online',
  lastOnline: Date.now(),
  failureCount: 0,

  setOnline: () =>
    set({
      status: 'online',
      lastOnline: Date.now(),
      failureCount: 0,
    }),

  setOffline: () =>
    set({
      status: 'offline',
    }),

  setReconnecting: () =>
    set({
      status: 'reconnecting',
    }),

  incrementFailure: () =>
    set((state) => ({
      failureCount: state.failureCount + 1,
    })),

  resetFailures: () =>
    set({
      failureCount: 0,
    }),
}))

/**
 * Check if the app is currently offline.
 */
export function isOffline(): boolean {
  return useConnectivityStore.getState().status === 'offline'
}

/**
 * Check if we're attempting to reconnect.
 */
export function isReconnecting(): boolean {
  return useConnectivityStore.getState().status === 'reconnecting'
}
