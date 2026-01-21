/**
 * Hook for fetching agent terminal output (peek).
 * Used to show live terminal output when clicking on an agent.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PeekOutput } from '@/types'
import { useMonitoringStore } from '@/stores/monitoring-store'

export interface UseAgentPeekResult {
  /** Current peek output */
  output: PeekOutput | null
  /** Whether output is currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Currently selected agent ID */
  agentId: string | null
  /** Select an agent to peek */
  selectAgent: (agentId: string | null) => void
  /** Refetch output */
  refetch: () => void
}

const DEFAULT_LINES = 50

/**
 * Fetch terminal output for an agent.
 *
 * @param rigId - The rig containing the agent
 * @param lines - Number of lines to fetch (default 50)
 * @param pollInterval - Polling interval in ms (default 2000, 0 to disable)
 * @returns Peek output with loading and error states
 *
 * @example
 * ```tsx
 * const { output, loading, selectAgent } = useAgentPeek(rigId)
 *
 * // When user clicks an agent
 * selectAgent(agent.id)
 *
 * // Render output
 * {output?.lines.map((line, i) => <pre key={i}>{line}</pre>)}
 * ```
 */
export function useAgentPeek(
  rigId: string | undefined,
  lines: number = DEFAULT_LINES,
  pollInterval: number = 2000
): UseAgentPeekResult {
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const peekState = useMonitoringStore((state) => state.peekState)
  const setPeekAgentId = useMonitoringStore((state) => state.setPeekAgentId)
  const setPeekOutput = useMonitoringStore((state) => state.setPeekOutput)
  const setPeekLoading = useMonitoringStore((state) => state.setPeekLoading)
  const setPeekError = useMonitoringStore((state) => state.setPeekError)

  const fetchPeek = useCallback(async () => {
    const agentId = peekState.agentId
    if (!rigId || !agentId) {
      return
    }

    setLocalLoading(true)
    setPeekLoading(true)
    setLocalError(null)

    try {
      const response = await fetch(`/api/rigs/${rigId}/agents/${agentId}/peek?lines=${lines}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch peek output: ${response.statusText}`)
      }

      const data: PeekOutput = await response.json()
      setPeekOutput(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch peek output'
      setLocalError(message)
      setPeekError(message)
    } finally {
      setLocalLoading(false)
      setPeekLoading(false)
    }
  }, [rigId, peekState.agentId, lines, setPeekOutput, setPeekLoading, setPeekError])

  // Fetch on agent selection and start polling
  useEffect(() => {
    if (!peekState.agentId) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    // Initial fetch
    fetchPeek()

    // Set up polling if interval is positive
    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchPeek, pollInterval)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [peekState.agentId, fetchPeek, pollInterval])

  const selectAgent = useCallback(
    (agentId: string | null) => {
      setPeekAgentId(agentId)
    },
    [setPeekAgentId]
  )

  return {
    output: peekState.output,
    loading: localLoading || peekState.isLoading,
    error: localError || peekState.error,
    agentId: peekState.agentId,
    selectAgent,
    refetch: fetchPeek,
  }
}
