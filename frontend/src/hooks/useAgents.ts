/**
 * Hook for fetching agents for a rig.
 * Used to display rig health indicators in the sidebar.
 */

import { useCallback } from 'react'
import type { Agent, AgentRoleType, AgentState } from '@/types'
import { useFetch } from './useFetch'

// Stable empty array reference to prevent infinite re-renders
const EMPTY_AGENTS: Agent[] = []

export interface UseAgentsResult {
  /** List of agents for the rig */
  agents: Agent[]
  /** Whether agents are currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refetch agents */
  refetch: () => void
  /** Get agent by role type */
  getAgentByRole: (role: AgentRoleType) => Agent | undefined
  /** Get health state for a role (returns undefined if agent doesn't exist) */
  getRoleHealth: (role: AgentRoleType) => AgentState | undefined
}

/**
 * Fetch agents for a specific rig.
 * Returns agent data for displaying health indicators.
 *
 * @example
 * ```tsx
 * const { agents, loading, getRoleHealth } = useAgents(rigId)
 *
 * // Get health state for each role
 * const witnessHealth = getRoleHealth('witness')
 * const refineryHealth = getRoleHealth('refinery')
 * const crewHealth = getRoleHealth('crew')
 * ```
 */
export function useAgents(rigId: string | undefined): UseAgentsResult {
  const { data, loading, error, refetch } = useFetch<Agent[]>(
    rigId ? `/api/rigs/${rigId}/agents` : null,
    {
      initialData: EMPTY_AGENTS, // Use stable reference to prevent infinite re-renders
      errorPrefix: 'Failed to fetch agents',
      clearOnError: true,
    }
  )

  const agents = data ?? []

  const getAgentByRole = useCallback(
    (role: AgentRoleType): Agent | undefined => {
      return agents.find((agent) => agent.role_type === role)
    },
    [agents]
  )

  const getRoleHealth = useCallback(
    (role: AgentRoleType): AgentState | undefined => {
      const agent = getAgentByRole(role)
      return agent?.state
    },
    [getAgentByRole]
  )

  return {
    agents,
    loading,
    error,
    refetch,
    getAgentByRole,
    getRoleHealth,
  }
}

/**
 * Map of role types to display labels.
 */
export const roleLabels: Record<AgentRoleType, string> = {
  witness: 'Witness',
  refinery: 'Refinery',
  crew: 'Crew',
  polecat: 'Polecat',
  deacon: 'Deacon',
  mayor: 'Mayor',
}

/**
 * The three primary roles shown in sidebar health indicators.
 */
export const healthIndicatorRoles: AgentRoleType[] = ['witness', 'refinery', 'crew']
