import { useEffect, useRef, useCallback, useState } from 'react'

interface WSMessage {
  type: 'rig_update' | 'issue_update' | 'agent_update' | 'ping'
  rigId?: string
  data?: unknown
  timestamp: string
}

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectInterval?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    // Construct WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
        onConnect?.()
      }

      ws.onclose = () => {
        setConnected(false)
        onDisconnect?.()
        wsRef.current = null

        // Attempt reconnect
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, reconnectInterval)
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          onMessage?.(msg)
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err)
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err)
      // Retry connection
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, reconnectInterval)
    }
  }, [onConnect, onDisconnect, onMessage, reconnectInterval])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return { connected }
}
