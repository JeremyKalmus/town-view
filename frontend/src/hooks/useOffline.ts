/**
 * Hook to detect offline state using WebSocket connection status.
 * Monitors both browser online/offline events and WebSocket connectivity.
 *
 * Simplified from HTTP polling to use WebSocket state as the source of truth.
 * The WebSocket connection handles its own reconnection with exponential backoff.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useDataStore } from '@/stores/data-store'
import { useConnectivityStore } from '@/stores/connectivity-store'

interface UseOfflineOptions {
  /** Callback when connection is restored */
  onReconnect?: () => void
  /** Callback when connection is lost */
  onDisconnect?: () => void
}

export function useOffline(options: UseOfflineOptions = {}) {
  const { onReconnect, onDisconnect } = options

  // Get WebSocket connection status from data store
  const wsConnected = useDataStore((state) => state.connected)
  const { status } = useConnectivityStore()

  const wasOfflineRef = useRef(false)
  const callbacksRef = useRef({ onReconnect, onDisconnect })
  callbacksRef.current = { onReconnect, onDisconnect }

  // Sync WebSocket state to connectivity store
  useEffect(() => {
    const store = useConnectivityStore.getState()

    if (wsConnected) {
      // WebSocket connected - we're online
      if (store.status !== 'online') {
        store.setOnline()
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false
          callbacksRef.current.onReconnect?.()
        }
      }
    } else {
      // WebSocket disconnected - we're offline or reconnecting
      // The WebSocket hook handles reconnection automatically
      if (store.status === 'online') {
        wasOfflineRef.current = true
        store.setReconnecting()
        callbacksRef.current.onDisconnect?.()
      }
    }
  }, [wsConnected])

  // Listen to browser online/offline events for quick state updates
  useEffect(() => {
    const handleOffline = () => {
      const store = useConnectivityStore.getState()
      if (store.status !== 'offline') {
        wasOfflineRef.current = true
        store.setOffline()
        callbacksRef.current.onDisconnect?.()
      }
    }

    const handleOnline = () => {
      // Browser says we're online, but wait for WebSocket to confirm
      const store = useConnectivityStore.getState()
      if (store.status === 'offline') {
        store.setReconnecting()
      }
      // WebSocket reconnection will set us to 'online' when it connects
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Manual reconnect triggers a WebSocket refresh request
  const tryReconnect = useCallback(() => {
    // The WebSocket hook handles reconnection automatically
    // This is a no-op since we can't force WebSocket reconnection from here
    // The user can refresh the page if needed
    useConnectivityStore.getState().setReconnecting()
    return Promise.resolve(wsConnected)
  }, [wsConnected])

  return {
    isOffline: status === 'offline',
    isReconnecting: status === 'reconnecting',
    isOnline: status === 'online',
    status,
    tryReconnect,
  }
}
