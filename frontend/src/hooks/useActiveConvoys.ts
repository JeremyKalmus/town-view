/**
 * Hook for fetching and polling active convoy data.
 * Used to display convoy progress in the monitoring view.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Issue, ConvoyProgress } from '@/types'

/**
 * Convoy with required progress information.
 * Extends Issue but guarantees convoy data is present.
 */
export interface ConvoyWithProgress extends Omit<Issue, 'convoy'> {
  convoy: {
    id: string
    title: string
    progress: ConvoyProgress
  }
}

export interface UseActiveConvoysOptions {
  /** Polling interval in milliseconds (default: 30000) */
  pollInterval?: number
  /** Pause polling when false (default: true) */
  enabled?: boolean
}

export interface UseActiveConvoysResult {
  /** List of active convoys with progress data */
  convoys: ConvoyWithProgress[]
  /** Whether data is currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refresh */
  refresh: () => void
}

/**
 * Fetch and poll active convoy data for a rig.
 *
 * @param rigId - The rig ID to fetch convoys for
 * @param options - Optional configuration for polling
 * @returns Convoys, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { convoys, loading, error, refresh } = useActiveConvoys(rigId, {
 *   pollInterval: 15000,  // Poll every 15 seconds
 *   enabled: isTabVisible // Pause when tab is hidden
 * })
 *
 * // Display convoy progress
 * convoys.map(c => (
 *   <div key={c.id}>
 *     {c.title}: {c.convoy.progress.completed}/{c.convoy.progress.total}
 *   </div>
 * ))
 * ```
 */
export function useActiveConvoys(
  rigId: string | undefined,
  options: UseActiveConvoysOptions = {}
): UseActiveConvoysResult {
  const { pollInterval = 30000, enabled = true } = options

  const [convoys, setConvoys] = useState<ConvoyWithProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchConvoys = useCallback(async () => {
    if (!rigId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `/api/rigs/${rigId}/issues?types=convoy&status=open,in_progress&include=convoy`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch convoys: ${response.statusText}`)
      }

      const issues: Issue[] = await response.json()

      if (mountedRef.current) {
        // Filter to only issues with convoy data (they should all have it due to include=convoy)
        const convoysWithProgress: ConvoyWithProgress[] = issues
          .filter((issue): issue is Issue & { convoy: NonNullable<Issue['convoy']> } =>
            issue.convoy !== undefined && issue.convoy !== null
          )
          .map(issue => ({
            ...issue,
            convoy: issue.convoy
          }))

        setConvoys(convoysWithProgress)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch convoys'
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [rigId])

  // Initial fetch and polling setup
  useEffect(() => {
    if (!enabled || !rigId) {
      // Clear interval if disabled
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial fetch
    fetchConvoys()

    // Set up polling
    intervalRef.current = window.setInterval(fetchConvoys, pollInterval)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, rigId, pollInterval, fetchConvoys])

  // Reset state when rigId changes
  useEffect(() => {
    if (!rigId) {
      setConvoys([])
      setError(null)
    }
  }, [rigId])

  return {
    convoys,
    loading,
    error,
    refresh: fetchConvoys,
  }
}
