/**
 * Hook for fetching telemetry data for a specific agent.
 * Returns token usage, git commits, test runs, and summary statistics.
 */

import { useFetch } from './useFetch'
import type { AgentTelemetry } from '@/types'

export interface UseAgentTelemetryOptions {
  /** Enable fetching */
  enabled?: boolean
}

export interface UseAgentTelemetryResult {
  /** Agent telemetry data */
  telemetry: AgentTelemetry | null
  /** Whether fetch is in progress */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing agent telemetry.
 *
 * @param agentId - The ID of the agent to fetch telemetry for
 * @param options - Optional configuration
 * @returns Telemetry data with loading/error states
 *
 * @example
 * ```tsx
 * const { telemetry, loading, error } = useAgentTelemetry('townview/polecats/ruby')
 *
 * if (loading) return <Spinner />
 * if (error) return <ErrorState message={error} />
 *
 * return (
 *   <div>
 *     <h2>Tokens: {telemetry?.token_summary.total_input + telemetry?.token_summary.total_output}</h2>
 *     <h2>Commits: {telemetry?.git_summary.total_commits}</h2>
 *   </div>
 * )
 * ```
 */
export function useAgentTelemetry(
  agentId: string | null | undefined,
  options: UseAgentTelemetryOptions = {}
): UseAgentTelemetryResult {
  const { enabled = true } = options

  const url = agentId ? `/api/telemetry/agents/${encodeURIComponent(agentId)}` : null

  const { data, loading, error, refetch } = useFetch<AgentTelemetry>(
    enabled ? url : null,
    {
      errorPrefix: 'Failed to fetch agent telemetry',
    }
  )

  return {
    telemetry: data,
    loading,
    error,
    refetch,
  }
}
