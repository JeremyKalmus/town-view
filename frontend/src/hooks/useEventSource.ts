import { useEffect, useRef, useState } from 'react'
import type { WSMessage } from '@/types'

interface UseEventSourceOptions {
  onMessage?: (msg: WSMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

/**
 * SSE hook using browser's native EventSource API.
 * Browser handles reconnection automatically with exponential backoff.
 */
export function useEventSource(options: UseEventSourceOptions = {}) {
  const { onMessage, onConnect, onDisconnect } = options

  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WSMessage | null>(null)
  const callbacksRef = useRef({ onMessage, onConnect, onDisconnect })
  callbacksRef.current = { onMessage, onConnect, onDisconnect }

  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    eventSource.onopen = () => {
      setConnected(true)
      callbacksRef.current.onConnect?.()
    }

    eventSource.onerror = () => {
      setConnected(false)
      callbacksRef.current.onDisconnect?.()
      // Browser handles reconnection automatically
    }

    eventSource.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        setLastEvent(msg)
        callbacksRef.current.onMessage?.(msg)
      } catch (err) {
        console.error('[EventSource] Failed to parse message:', err)
      }
    }

    return () => {
      eventSource.close()
      setConnected(false)
    }
  }, [])

  return { connected, lastEvent }
}
