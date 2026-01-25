/**
 * Hook for fetching test regressions from the telemetry API.
 * Returns tests that were passing but are now failing.
 */

import { useMemo } from 'react'
import { useFetch } from './useFetch'
import type { TestRegression } from '@/types'

// Stable empty array reference to prevent infinite re-renders
const EMPTY_REGRESSIONS: TestRegression[] = []

export interface UseRegressionsOptions {
  /** Enable fetching */
  enabled?: boolean
  /** Filter regressions since this timestamp (ISO string) */
  since?: string
}

export interface UseRegressionsResult {
  /** List of test regressions */
  regressions: TestRegression[]
  /** Whether fetch is in progress */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching test regressions.
 *
 * @param options - Configuration options
 * @returns Regressions data with loading/error state
 *
 * @example
 * ```tsx
 * const { regressions, loading } = useRegressions()
 *
 * // Display regression list
 * regressions.map(r => (
 *   <div key={r.test_name}>
 *     {r.test_name}: failed since {r.first_failed_at}
 *   </div>
 * ))
 * ```
 */
export function useRegressions(
  options: UseRegressionsOptions = {}
): UseRegressionsResult {
  const { enabled = true, since } = options

  // Build URL with optional since param
  const url = useMemo(() => {
    if (since) {
      return `/api/telemetry/regressions?since=${encodeURIComponent(since)}`
    }
    return '/api/telemetry/regressions'
  }, [since])

  const { data, loading, error, refetch } = useFetch<TestRegression[]>(
    url,
    {
      enabled,
      initialData: EMPTY_REGRESSIONS,
      errorPrefix: 'Failed to fetch regressions',
    }
  )

  const regressions = useMemo(() => data ?? [], [data])

  return {
    regressions,
    loading,
    error,
    refetch,
  }
}
