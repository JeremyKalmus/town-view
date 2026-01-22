import type { Agent, AgentRoleType } from '@/types'
import { AgentCard } from '../AgentCard'
import { getAgentRoleIcon } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'

interface InfrastructureHealthProps {
  agents: Agent[]
  onAgentClick?: (agent: Agent) => void
  className?: string
}

type InfrastructureRole = 'mayor' | 'deacon' | 'refinery'

const INFRASTRUCTURE_ROLES: { role: InfrastructureRole; label: string }[] = [
  { role: 'mayor', label: 'Mayor' },
  { role: 'deacon', label: 'Deacon' },
  { role: 'refinery', label: 'Refinery' },
]

/**
 * Placeholder card shown when an infrastructure agent is not running.
 */
function NotRunningCard({ role, label }: { role: InfrastructureRole; label: string }) {
  return (
    <div className="card p-3 border-dashed border-border/50 bg-bg-secondary/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0 opacity-40" title={role}>
            {getAgentRoleIcon(role)}
          </span>
          <span className="font-medium text-sm text-text-muted">{label}</span>
        </div>
        <div className="badge text-xs bg-bg-tertiary text-text-muted">
          <span>○</span>
          <span>Not Running</span>
        </div>
      </div>
    </div>
  )
}

/**
 * InfrastructureHealth - Displays status of town-level infrastructure agents
 * Shows Mayor, Deacon, and Refinery status using compact AgentCard variants.
 * Gracefully handles missing agents with "Not Running" placeholder.
 */
export function InfrastructureHealth({ agents, onAgentClick, className }: InfrastructureHealthProps) {
  // Create a map of role type to agent for quick lookup
  const agentsByRole = new Map<AgentRoleType, Agent>()
  agents.forEach(agent => {
    // Only track infrastructure roles
    if (agent.role_type === 'mayor' || agent.role_type === 'deacon' || agent.role_type === 'refinery') {
      agentsByRole.set(agent.role_type, agent)
    }
  })

  return (
    <div className={cn('space-y-3', className)}>
      {INFRASTRUCTURE_ROLES.map(({ role, label }) => {
        const agent = agentsByRole.get(role)

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

        return <NotRunningCard key={role} role={role} label={label} />
      })}
    </div>
  )
}
