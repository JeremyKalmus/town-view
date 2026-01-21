import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSMessage } from '@/types'

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  /** Initial reconnection delay in ms (default: 1000) */
  initialReconnectDelay?: number
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Maximum number of reconnection attempts (default: 10, 0 = unlimited) */
  maxReconnectAttempts?: number
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected'

/**
 * WebSocket hook with exponential backoff reconnection.
 *
 * Features:
 * - Exponential backoff: starts at initialReconnectDelay, doubles each attempt
 * - Maximum reconnect attempts to prevent infinite loops
 * - Connection state tracking to prevent duplicate connections
 * - Clean cleanup on unmount
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    initialReconnectDelay = 1000,
    maxReconnectDelay = 30000,
    maxReconnectAttempts = 10,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const connectionStateRef = useRef<ConnectionState>('disconnected')
  const mountedRef = useRef(true)

  const [connected, setConnected] = useState(false)

  // Store callbacks in refs to avoid recreating connect on every render
  const callbacksRef = useRef({ onMessage, onConnect, onDisconnect })
  callbacksRef.current = { onMessage, onConnect, onDisconnect }

  /**
   * Calculate reconnect delay with exponential backoff.
   * Delay = min(initialDelay * 2^attempts, maxDelay)
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    )
    return delay
  }, [initialReconnectDelay, maxReconnectDelay])

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  const scheduleReconnect = useCallback(() => {
    // Don't reconnect if unmounted
    if (!mountedRef.current) return

    // Check if we've exceeded max attempts
    if (maxReconnectAttempts > 0 && reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`[WebSocket] Max reconnection attempts (${maxReconnectAttempts}) reached. Giving up.`)
      return
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    const delay = getReconnectDelay()
    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts || '∞'})`)

    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttemptsRef.current++
        connect()
      }
    }, delay)
  }, [getReconnectDelay, maxReconnectAttempts])

  /**
   * Establish WebSocket connection.
   */
  const connect = useCallback(() => {
    // Prevent duplicate connection attempts
    if (connectionStateRef.current === 'connecting' || connectionStateRef.current === 'connected') {
      console.log('[WebSocket] Connection already in progress or established, skipping')
      return
    }

    // Don't connect if unmounted
    if (!mountedRef.current) return

    connectionStateRef.current = 'connecting'

    // Construct WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }

        connectionStateRef.current = 'connected'
        reconnectAttemptsRef.current = 0 // Reset attempts on successful connection
        setConnected(true)
        callbacksRef.current.onConnect?.()
        console.log('[WebSocket] Connected successfully')
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return

        connectionStateRef.current = 'disconnected'
        wsRef.current = null
        setConnected(false)
        callbacksRef.current.onDisconnect?.()

        // Only attempt reconnect if this wasn't a clean close
        if (event.code !== 1000) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        // Note: onerror is always followed by onclose, so reconnect happens there
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          callbacksRef.current.onMessage?.(msg)
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err)
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err)
      connectionStateRef.current = 'disconnected'
      scheduleReconnect()
    }
  }, [scheduleReconnect])

  /**
   * Manually trigger a reconnection (resets attempt counter).
   */
  const reconnect = useCallback(() => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect')
      wsRef.current = null
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Reset state and connect
    connectionStateRef.current = 'disconnected'
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Initial connection and cleanup
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Close WebSocket connection cleanly
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting')
        wsRef.current = null
      }

      connectionStateRef.current = 'disconnected'
    }
  }, []) // Empty deps - connect is stable due to refs

  return { connected, reconnect }
}
