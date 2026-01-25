/**
 * Hook for fetching token usage summary from the telemetry API.
 * Returns aggregated token statistics with breakdown by model and agent.
 */

import { useMemo } from 'react'
import { useFetch } from './useFetch'
import type { TokenSummary } from '@/types'

// Stable empty object reference to prevent infinite re-renders
const EMPTY_SUMMARY: TokenSummary = {
  total_input: 0,
  total_output: 0,
  by_model: {},
  by_agent: {},
}

export interface UseTokenSummaryOptions {
  /** Enable fetching */
  enabled?: boolean
}

export interface UseTokenSummaryResult {
  /** Token usage summary */
  summary: TokenSummary
  /** Whether fetch is in progress */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing token usage summary.
 */
export function useTokenSummary(
  options: UseTokenSummaryOptions = {}
): UseTokenSummaryResult {
  const { enabled = true } = options

  const { data, loading, error, refetch } = useFetch<TokenSummary>(
    '/api/telemetry/tokens/summary',
    {
      enabled,
      initialData: EMPTY_SUMMARY,
      errorPrefix: 'Failed to fetch token summary',
    }
  )

  const summary = useMemo(() => data ?? EMPTY_SUMMARY, [data])

  return {
    summary,
    loading,
    error,
    refetch,
  }
}
