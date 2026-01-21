/**
 * Hook for fetching agents for a rig.
 * Used to display rig health indicators in the sidebar.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Agent, AgentRoleType, AgentState } from '@/types'

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
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    if (!rigId) {
      setAgents([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/rigs/${rigId}/agents`)

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`)
      }

      const data = await response.json()
      setAgents(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents'
      setError(message)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [rigId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

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
    refetch: fetchAgents,
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
