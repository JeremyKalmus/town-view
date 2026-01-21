import { useEffect, useState, useCallback } from 'react'
import type { Agent, AgentRoleType } from '@/types'
import { AgentCard } from './AgentCard'
import { cn, getAgentRoleIcon } from '@/lib/utils'
import { cachedFetch } from '@/services/cache'

interface InfrastructureHealthProps {
  /** Rig ID for fetching agents (defaults to 'hq' for town-level agents) */
  rigId?: string
  /** Optional refresh key to trigger data refetch */
  refreshKey?: number
  /** Optional className for styling */
  className?: string
  /** Optional click handler for agent cards */
  onAgentClick?: (agent: Agent) => void
}

/** Infrastructure agent role types we care about */
const INFRASTRUCTURE_ROLES: AgentRoleType[] = ['mayor', 'deacon', 'refinery']

/** Labels for infrastructure roles */
const ROLE_LABELS: Record<AgentRoleType, string> = {
  mayor: 'Mayor',
  deacon: 'Deacon',
  refinery: 'Refinery',
  witness: 'Witness',
  crew: 'Crew',
  polecat: 'Polecat',
}

interface PlaceholderCardProps {
  roleType: AgentRoleType
}

/**
 * Placeholder card for missing infrastructure agents.
 * Shows "Not Running" state with muted styling.
 */
function PlaceholderCard({ roleType }: PlaceholderCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary',
        'opacity-60'
      )}
    >
      {/* State indicator dot - none/muted */}
      <div className="health-dot health-dot-none flex-shrink-0">
        ○
      </div>

      {/* Role icon + Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base text-text-muted" title={roleType}>
          {getAgentRoleIcon(roleType)}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-sm truncate capitalize text-text-muted">
            {ROLE_LABELS[roleType]}
          </span>
          <span className="text-xs text-text-muted italic">
            Not running
          </span>
        </div>
      </div>

      {/* State label */}
      <span className="text-xs font-medium text-text-muted">
        Offline
      </span>
    </div>
  )
}

/**
 * InfrastructureHealth displays the status of town-level infrastructure agents:
 * Mayor, Deacon, and Refinery. Shows their current state and what they're working on.
 * Gracefully handles missing agents with "Not Running" placeholders.
 */
export function InfrastructureHealth({
  rigId = 'hq',
  refreshKey = 0,
  className,
  onAgentClick,
}: InfrastructureHealthProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch infrastructure agents
  useEffect(() => {
    setLoading(true)
    setError(null)

    const fetchAgents = async () => {
      const url = `/api/rigs/${rigId}/agents`
      const result = await cachedFetch<Agent[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        // Filter to only infrastructure roles
        const infraAgents = result.data.filter(agent =>
          INFRASTRUCTURE_ROLES.includes(agent.role_type)
        )
        setAgents(infraAgents)
      } else {
        console.error('Failed to fetch infrastructure agents:', result.error)
        setError(result.error || 'Failed to load infrastructure status')
        setAgents([])
      }
      setLoading(false)
    }

    fetchAgents()
  }, [rigId, refreshKey])

  // Create a map of role -> agent for easy lookup
  const agentsByRole = useCallback(() => {
    const map = new Map<AgentRoleType, Agent>()
    agents.forEach(agent => {
      map.set(agent.role_type, agent)
    })
    return map
  }, [agents])

  const roleAgentMap = agentsByRole()

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="section-header flex items-center gap-2">
          <span>⚙</span>
          INFRASTRUCTURE
        </h3>
        <div className="grid gap-3">
          {INFRASTRUCTURE_ROLES.map((role) => (
            <div
              key={role}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary animate-pulse"
            >
              <div className="w-6 h-6 rounded-full bg-bg-tertiary" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-20 bg-bg-tertiary rounded" />
                <div className="h-3 w-32 bg-bg-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="section-header flex items-center gap-2">
          <span>⚙</span>
          INFRASTRUCTURE
        </h3>
        <div className="p-4 rounded-lg border border-status-blocked/30 bg-status-blocked/10 text-status-blocked text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="section-header flex items-center gap-2">
        <span>⚙</span>
        INFRASTRUCTURE
      </h3>
      <div className="grid gap-3">
        {INFRASTRUCTURE_ROLES.map((role) => {
          const agent = roleAgentMap.get(role)
          if (agent) {
            return (
              <AgentCard
                key={role}
                agent={agent}
                variant="compact"
                onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
              />
            )
          }
          return <PlaceholderCard key={role} roleType={role} />
        })}
      </div>
    </div>
  )
}
