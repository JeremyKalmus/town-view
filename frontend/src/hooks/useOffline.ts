/**
 * Hook to detect offline state and manage connectivity.
 * Monitors both browser online/offline events and HTTP reachability.
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

  const {
    status,
    setOnline,
    setOffline,
    setReconnecting,
    incrementFailure,
    resetFailures,
    failureCount,
  } = useConnectivityStore()

  const pingIntervalRef = useRef<number | null>(null)
  const wasOfflineRef = useRef(false)

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

  // Handle connectivity check result
  const handleConnectivityResult = useCallback(
    (isConnected: boolean) => {
      if (isConnected) {
        resetFailures()
        if (status !== 'online') {
          setOnline()
          if (wasOfflineRef.current) {
            wasOfflineRef.current = false
            onReconnect?.()
          }
        }
      } else {
        incrementFailure()
        if (failureCount + 1 >= failureThreshold) {
          if (status !== 'offline') {
            wasOfflineRef.current = true
            setOffline()
            onDisconnect?.()
          }
        } else if (status === 'online') {
          setReconnecting()
        }
      }
    },
    [
      status,
      failureCount,
      failureThreshold,
      setOnline,
      setOffline,
      setReconnecting,
      incrementFailure,
      resetFailures,
      onReconnect,
      onDisconnect,
    ]
  )

  // Periodic connectivity check
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    pingIntervalRef.current = window.setInterval(async () => {
      const isConnected = await checkConnectivity()
      handleConnectivityResult(isConnected)
    }, pingInterval)
  }, [pingInterval, checkConnectivity, handleConnectivityResult])

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setReconnecting()
      const isConnected = await checkConnectivity()
      handleConnectivityResult(isConnected)
      startPingInterval()
    }

    const handleOffline = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      wasOfflineRef.current = true
      setOffline()
      onDisconnect?.()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    if (navigator.onLine) {
      checkConnectivity().then(handleConnectivityResult)
      startPingInterval()
    } else {
      setOffline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [
    checkConnectivity,
    handleConnectivityResult,
    startPingInterval,
    setOffline,
    setReconnecting,
    onDisconnect,
  ])

  // Manual reconnect attempt
  const tryReconnect = useCallback(async () => {
    setReconnecting()
    const isConnected = await checkConnectivity()
    handleConnectivityResult(isConnected)
    return isConnected
  }, [checkConnectivity, handleConnectivityResult, setReconnecting])

  return {
    isOffline: status === 'offline',
    isReconnecting: status === 'reconnecting',
    isOnline: status === 'online',
    status,
    tryReconnect,
  }
}
