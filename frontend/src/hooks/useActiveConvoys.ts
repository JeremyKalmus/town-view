/**
 * Hook for accessing active convoy data from the central data store.
 * Convoy data is pushed via WebSocket and stored in the data store.
 */

import { useMemo } from 'react'
import { useDataStore, selectIssuesByRig } from '@/stores/data-store'
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
  /** Whether to include the hook (default: true) */
  enabled?: boolean
}

export interface UseActiveConvoysResult {
  /** List of active convoys with progress data */
  convoys: ConvoyWithProgress[]
  /** Whether data is being loaded (false once WebSocket connects) */
  loading: boolean
  /** Error message (always null with WebSocket) */
  error: string | null
  /** Whether WebSocket is connected (data is live) */
  connected: boolean
  /** Refresh is a no-op since data comes from WebSocket */
  refresh: () => void
}

/**
 * Access active convoy data for a rig from the WebSocket-powered data store.
 *
 * @param rigId - The rig ID to get convoys for
 * @param options - Optional configuration
 * @returns Convoys with connection status
 *
 * @example
 * ```tsx
 * const { convoys, connected } = useActiveConvoys(rigId)
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
  const { enabled = true } = options

  // Get issues for this rig from data store
  const allIssues = useDataStore(rigId ? selectIssuesByRig(rigId) : () => [])
  const connected = useDataStore((state) => state.connected)

  // Filter to active convoys with progress data
  const convoys = useMemo(() => {
    if (!enabled || !rigId) {
      return []
    }

    return allIssues
      .filter((issue): issue is Issue & { convoy: NonNullable<Issue['convoy']> } =>
        // Must be a convoy type
        issue.issue_type === 'convoy' &&
        // Must be active (open or in_progress)
        (issue.status === 'open' || issue.status === 'in_progress') &&
        // Must have convoy data with progress
        issue.convoy !== undefined &&
        issue.convoy !== null &&
        issue.convoy.progress !== undefined
      )
      .map((issue) => ({
        ...issue,
        convoy: issue.convoy,
      }))
  }, [allIssues, enabled, rigId])

  // Refresh is a no-op - data comes from WebSocket automatically
  const refresh = () => {
    // Data is pushed via WebSocket, no manual refresh needed
  }

  // Loading state: true until first snapshot received
  const lastUpdated = useDataStore((state) => state.lastUpdated)
  const loading = lastUpdated === null

  return {
    convoys,
    loading,
    error: null, // No error state with WebSocket - it reconnects automatically
    connected,
    refresh,
  }
}
