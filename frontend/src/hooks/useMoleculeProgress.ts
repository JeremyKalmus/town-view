/**
 * Hook for fetching and caching molecule progress.
 * Used to display "Step X/Y" progress in the monitoring view.
 */

import { useState, useEffect, useCallback } from 'react'
import type { MoleculeProgress } from '@/types'
import { useMonitoringStore } from '@/stores/monitoring-store'

export interface UseMoleculeProgressResult {
  /** Current progress data */
  progress: MoleculeProgress | null
  /** Whether progress is currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refetch progress */
  refetch: () => void
}

/**
 * Fetch and cache progress for a molecule issue.
 *
 * @param rigId - The rig containing the issue
 * @param issueId - The molecule issue ID to track progress for
 * @returns Progress data with loading and error states
 *
 * @example
 * ```tsx
 * const { progress, loading, error } = useMoleculeProgress(rigId, issueId)
 *
 * if (progress) {
 *   return <span>Step {progress.current_step}/{progress.total_steps}</span>
 * }
 * ```
 */
export function useMoleculeProgress(
  rigId: string | undefined,
  issueId: string | undefined
): UseMoleculeProgressResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const progressCache = useMonitoringStore((state) => state.progressCache)
  const setProgress = useMonitoringStore((state) => state.setProgress)

  // Get cached progress if available
  const cachedProgress = issueId ? progressCache.get(issueId) ?? null : null

  const fetchProgress = useCallback(async () => {
    if (!rigId || !issueId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/rigs/${rigId}/issues/${issueId}/progress`)

      if (!response.ok) {
        if (response.status === 404) {
          // No progress available for this issue - not an error
          return
        }
        throw new Error(`Failed to fetch progress: ${response.statusText}`)
      }

      const data: MoleculeProgress = await response.json()
      setProgress(issueId, data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch progress'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [rigId, issueId, setProgress])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress: cachedProgress,
    loading,
    error,
    refetch: fetchProgress,
  }
}

/**
 * Format progress as a string (e.g., "Step 3/5 - Running tests")
 */
export function formatProgress(progress: MoleculeProgress | null): string {
  if (!progress) {
    return ''
  }

  const stepInfo = `Step ${progress.current_step}/${progress.total_steps}`
  if (progress.step_name) {
    return `${stepInfo} - ${progress.step_name}`
  }
  return stepInfo
}

/**
 * Calculate progress percentage (0-100)
 */
export function getProgressPercentage(progress: MoleculeProgress | null): number {
  if (!progress || progress.total_steps === 0) {
    return 0
  }
  return Math.round((progress.current_step / progress.total_steps) * 100)
}
