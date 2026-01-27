/**
 * WebSocket hook for real-time data updates.
 * Connects to the Town View WebSocket endpoint and updates the data store.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useDataStore, type Snapshot } from '@/stores/data-store'
import type { Rig, Agent, Issue, Mail, ActivityEvent, CacheStats } from '@/types'

/** Raw snapshot from WebSocket (may have flat arrays or keyed maps) */
interface RawSnapshot {
  type: string
  rigs: Rig[]
  agents: Agent[] | Record<string, Agent[]>
  issues: Issue[] | Record<string, Issue[]>
  mail: Mail[]
  activity: ActivityEvent[]
  cache_stats?: CacheStats
}

/** Configuration for the WebSocket connection */
interface WebSocketConfig {
  /** Reconnection delay in milliseconds (default: 3000) */
  reconnectDelay?: number
  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number
  /** Enable logging (default: false) */
  debug?: boolean
}

/**
 * Hook to manage WebSocket connection for real-time data updates.
 * Automatically connects, handles reconnection, and updates the data store.
 */
export function useWebSocket(config: WebSocketConfig = {}) {
  const {
    reconnectDelay = 3000,
    maxReconnectAttempts = Infinity,
    debug = false,
  } = config

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setSnapshot = useDataStore((state) => state.setSnapshot)
  const setConnected = useDataStore((state) => state.setConnected)

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[WebSocket]', ...args)
      }
    },
    [debug]
  )

  /**
   * Transform flat agent/issue arrays to maps keyed by rigId.
   * The backend may send flat arrays; we need to group them by rig.
   */
  const transformSnapshot = useCallback((raw: RawSnapshot): Snapshot => {
    let agents: Record<string, Agent[]>
    let issues: Record<string, Issue[]>

    // Check if agents is already a keyed map
    if (Array.isArray(raw.agents)) {
      // Group agents by rig field
      agents = {}
      for (const agent of raw.agents) {
        const rigId = agent.rig || 'unknown'
        if (!agents[rigId]) {
          agents[rigId] = []
        }
        agents[rigId].push(agent)
      }
    } else {
      agents = raw.agents
    }

    // Check if issues is already a keyed map
    if (Array.isArray(raw.issues)) {
      // Group issues by rig_id field
      // Note: Issues should come as keyed maps from aggregator, flat array fallback
      issues = {}
      for (const issue of raw.issues as Array<Issue & { rig_id?: string }>) {
        const rigId = issue.rig_id || 'unknown'
        if (!issues[rigId]) {
          issues[rigId] = []
        }
        issues[rigId].push(issue)
      }
    } else {
      issues = raw.issues
    }

    return {
      rigs: raw.rigs,
      agents,
      issues,
      mail: raw.mail,
      activity: raw.activity,
      cache_stats: raw.cache_stats ?? null,
    }
  }, [])

  const connect = useCallback(() => {
    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    log('Connecting to', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        log('Connected')
        setConnected(true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RawSnapshot
          if (data.type === 'snapshot') {
            log('Received snapshot')
            const snapshot = transformSnapshot(data)
            setSnapshot(snapshot)
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event)
      }

      ws.onclose = (event) => {
        log('Disconnected', event.code, event.reason)
        setConnected(false)
        wsRef.current = null

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          log(
            `Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttemptsRef.current})`
          )
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay)
        }
      }
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err)
    }
  }, [
    setSnapshot,
    setConnected,
    transformSnapshot,
    reconnectDelay,
    maxReconnectAttempts,
    log,
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [setConnected])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    connect,
    disconnect,
  }
}
