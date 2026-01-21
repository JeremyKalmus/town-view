/**
 * Hook to detect offline state and manage connectivity.
 * Monitors both browser online/offline events and HTTP reachability.
 *
 * IMPORTANT: This hook uses refs for callbacks to avoid infinite loops.
 * Store actions and external callbacks are stored in refs so their identity
 * doesn't change between renders, preventing useEffect from re-firing.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useConnectivityStore } from '@/stores/connectivity-store'

interface UseOfflineOptions {
  /** Interval to check HTTP connectivity when browser reports online (ms) */
  pingInterval?: number
  /** Number of failures before considering offline */
  failureThreshold?: number
  /** Callback when connection is restored */
  onReconnect?: () => void
  /** Callback when connection is lost */
  onDisconnect?: () => void
}

const DEFAULT_PING_INTERVAL = 30000 // 30 seconds
const DEFAULT_FAILURE_THRESHOLD = 2

export function useOffline(options: UseOfflineOptions = {}) {
  const {
    pingInterval = DEFAULT_PING_INTERVAL,
    failureThreshold = DEFAULT_FAILURE_THRESHOLD,
    onReconnect,
    onDisconnect,
  } = options

  const { status } = useConnectivityStore()

  const pingIntervalRef = useRef<number | null>(null)
  const wasOfflineRef = useRef(false)
  const mountedRef = useRef(true)

  // Store external callbacks in refs to avoid dependency changes
  const callbacksRef = useRef({ onReconnect, onDisconnect })
  callbacksRef.current = { onReconnect, onDisconnect }

  // Store options in ref
  const optionsRef = useRef({ failureThreshold, pingInterval })
  optionsRef.current = { failureThreshold, pingInterval }

  // Check HTTP connectivity by pinging the API
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Use a simple HEAD request to check if API is reachable
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/rigs', {
        method: 'HEAD',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }, [])

  // Handle connectivity check result - reads current state directly from store
  const handleConnectivityResult = useCallback((isConnected: boolean) => {
    if (!mountedRef.current) return

    // Get current state directly from store to avoid stale closures
    const store = useConnectivityStore.getState()
    const { failureThreshold: threshold } = optionsRef.current

    if (isConnected) {
      store.resetFailures()
      if (store.status !== 'online') {
        store.setOnline()
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false
          callbacksRef.current.onReconnect?.()
        }
      }
    } else {
      store.incrementFailure()
      // Re-read failure count after increment
      const newFailureCount = useConnectivityStore.getState().failureCount
      if (newFailureCount >= threshold) {
        if (store.status !== 'offline') {
          wasOfflineRef.current = true
          store.setOffline()
          callbacksRef.current.onDisconnect?.()
        }
      } else if (store.status === 'online') {
        store.setReconnecting()
      }
    }
  }, []) // No dependencies - uses refs and direct store access

  // Start periodic connectivity check
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    pingIntervalRef.current = window.setInterval(async () => {
      if (!mountedRef.current) return
      const isConnected = await checkConnectivity()
      handleConnectivityResult(isConnected)
    }, optionsRef.current.pingInterval)
  }, [checkConnectivity, handleConnectivityResult])

  // Handle browser online/offline events - runs once on mount
  useEffect(() => {
    mountedRef.current = true

    const handleOnline = async () => {
      if (!mountedRef.current) return
      useConnectivityStore.getState().setReconnecting()
      const isConnected = await checkConnectivity()
      handleConnectivityResult(isConnected)
      startPingInterval()
    }

    const handleOffline = () => {
      if (!mountedRef.current) return
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      wasOfflineRef.current = true
      useConnectivityStore.getState().setOffline()
      callbacksRef.current.onDisconnect?.()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check - only runs once on mount
    if (navigator.onLine) {
      checkConnectivity().then((isConnected) => {
        if (mountedRef.current) {
          handleConnectivityResult(isConnected)
          startPingInterval()
        }
      })
    } else {
      useConnectivityStore.getState().setOffline()
    }

    return () => {
      mountedRef.current = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }
  }, [checkConnectivity, handleConnectivityResult, startPingInterval])

  // Manual reconnect attempt
  const tryReconnect = useCallback(async () => {
    useConnectivityStore.getState().setReconnecting()
    const isConnected = await checkConnectivity()
    handleConnectivityResult(isConnected)
    return isConnected
  }, [checkConnectivity, handleConnectivityResult])

  return {
    isOffline: status === 'offline',
    isReconnecting: status === 'reconnecting',
    isOnline: status === 'online',
    status,
    tryReconnect,
  }
}
