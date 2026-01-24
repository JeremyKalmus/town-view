import { useEffect, useRef, useCallback } from 'react'
import { useDataStore, type Snapshot } from '@/stores/data-store'

const WS_URL = 'ws://localhost:8080/ws'
const INITIAL_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30000

interface UseWebSocketOptions {
  onSnapshot?: (data: Snapshot) => void
  onError?: (error: string) => void
}

interface UseWebSocketResult {
  connected: boolean
  requestRefresh: () => void
}

/**
 * WebSocket hook for real-time data updates.
 * Connects to the backend WebSocket hub and dispatches snapshots to the data store.
 * Handles reconnection with exponential backoff.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketResult {
  const { onSnapshot, onError } = options

  const setSnapshot = useDataStore((state) => state.setSnapshot)
  const setConnected = useDataStore((state) => state.setConnected)
  const connected = useDataStore((state) => state.connected)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)
  const callbacksRef = useRef({ onSnapshot, onError })
  callbacksRef.current = { onSnapshot, onError }

  const connect = useCallback(() => {
    // Clean up any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.onclose = null // Prevent onclose from scheduling reconnect
      wsRef.current.close()
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptRef.current = 0
      setConnected(true)
    }

    ws.onclose = () => {
      setConnected(false)
      if (!unmountedRef.current) {
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      callbacksRef.current.onError?.('WebSocket connection error')
    }

    ws.onmessage = (event) => {
      try {
        const data: Snapshot = JSON.parse(event.data)
        setSnapshot(data)
        callbacksRef.current.onSnapshot?.(data)
      } catch (err) {
        console.error('[useWebSocket] Failed to parse message:', err)
        callbacksRef.current.onError?.('Failed to parse WebSocket message')
      }
    }
  }, [setSnapshot, setConnected])

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttemptRef.current),
      MAX_RETRY_DELAY
    )
    reconnectAttemptRef.current++

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  const requestRefresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh' }))
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  return { connected, requestRefresh }
}
