import type { Agent, AgentRoleType } from '@/types'
import { AgentCard } from './AgentCard'
import { getAgentRoleIcon } from '@/lib/utils'

interface InfrastructureHealthProps {
  agents: Agent[]
  onAgentClick?: (agent: Agent) => void
}

// Infrastructure agent types we display
const INFRASTRUCTURE_ROLES: AgentRoleType[] = ['mayor', 'deacon', 'refinery']

/**
 * Placeholder card shown when an infrastructure agent is not running.
 */
function NotRunningCard({ roleType }: { roleType: AgentRoleType }) {
  const roleLabels: Record<AgentRoleType, string> = {
    mayor: 'Mayor',
    deacon: 'Deacon',
    refinery: 'Refinery',
    witness: 'Witness',
    crew: 'Crew',
    polecat: 'Polecat',
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-bg-secondary border border-border border-dashed opacity-60">
      {/* Role icon */}
      <span className="text-lg flex-shrink-0 text-text-muted" title={roleType}>
        {getAgentRoleIcon(roleType)}
      </span>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-text-muted">{roleLabels[roleType]}</div>
        <div className="text-xs text-text-muted italic">Not Running</div>
      </div>

      {/* State indicator */}
      <div className="flex items-center gap-1 text-sm text-text-muted">
        <span>○</span>
      </div>
    </div>
  )
}

/**
 * InfrastructureHealth displays the status of town-level infrastructure agents:
 * Mayor, Deacon, and Refinery. Uses AgentCard compact variant for minimal display.
 */
export function InfrastructureHealth({ agents, onAgentClick }: InfrastructureHealthProps) {
  // Map agents by role type for quick lookup
  const agentsByRole = new Map<AgentRoleType, Agent>()
  agents.forEach(agent => {
    if (INFRASTRUCTURE_ROLES.includes(agent.role_type)) {
      agentsByRole.set(agent.role_type, agent)
    }
  })

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
        Infrastructure
      </h3>
      <div className="space-y-2">
        {INFRASTRUCTURE_ROLES.map(roleType => {
          const agent = agentsByRole.get(roleType)

          if (agent) {
            return (
              <AgentCard
                key={roleType}
                agent={agent}
                variant="compact"
                onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
              />
            )
          }

          return <NotRunningCard key={roleType} roleType={roleType} />
        })}
      </div>
    </div>
  )
}
