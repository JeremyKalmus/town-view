import type { Agent, AgentState } from '@/types'
import { getAgentRoleIcon, getAgentStateBgClass, getAgentStateBorderClass, getAgentStateClass, getAgentStateIcon } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  variant?: 'default' | 'compact'
  /** Other agents in the same rig, used for contextual status */
  rigAgents?: Agent[]
}

// Singleton roles don't work on beads - they have specific jobs
const SINGLETON_ROLES = new Set(['witness', 'refinery', 'mayor', 'deacon'])

// Role descriptions for display
const ROLE_DESCRIPTIONS: Record<string, string> = {
  witness: 'Monitors polecat health',
  refinery: 'Processes merge queue',
  mayor: 'Town coordinator',
  deacon: 'Session lifecycle',
  crew: 'Human-managed worker',
  polecat: 'Transient worker',
}

/**
 * Get contextual status message for singleton roles when stopped.
 * Shows whether Deacon will restart them or if manual intervention is needed.
 */
function getStoppedContextMessage(agent: Agent, rigAgents?: Agent[]): string | null {
  // Only applies to stopped singleton roles
  if (agent.state !== 'stopped' || !SINGLETON_ROLES.has(agent.role_type)) {
    return null
  }

  // Deacon doesn't need restart info - it IS the lifecycle manager
  if (agent.role_type === 'deacon') {
    return 'Needs manual start'
  }

  // Check if Deacon is running in this rig
  const deacon = rigAgents?.find(a => a.role_type === 'deacon')
  const deaconRunning = deacon && (deacon.state === 'running' || deacon.state === 'working' || deacon.session_id)

  if (deaconRunning) {
    return 'Deacon will restart'
  }

  return 'Deacon stopped — needs manual start'
}

/**
 * Get activity description for running singleton roles.
 */
function getRunningActivityMessage(agent: Agent): string {
  switch (agent.role_type) {
    case 'witness':
      return 'Patrolling'
    case 'refinery':
      return 'Processing merge queue'
    case 'deacon':
      return 'Managing sessions'
    case 'mayor':
      return 'Coordinating'
    default:
      return 'Active'
  }
}

/**
 * Infer effective agent state.
 * If agent has hooked work but no explicit state (or idle), treat as working.
 */
function getEffectiveState(agent: Agent): AgentState {
  // If agent explicitly has a state, use it
  if (agent.state && agent.state !== 'idle') {
    return agent.state
  }
  // If agent has hooked work, infer working state
  if (agent.hook_bead) {
    return 'working'
  }
  // Default to running if connected (has session), otherwise idle
  if (agent.session_id) {
    return 'running'
  }
  return 'idle'
}

export function AgentCard({ agent, onClick, variant = 'default', rigAgents }: AgentCardProps) {
  const effectiveState = getEffectiveState(agent)
  const stateClass = getAgentStateClass(effectiveState)
  const stateBgClass = getAgentStateBgClass(effectiveState)
  const stateBorderClass = getAgentStateBorderClass(effectiveState)
  const stoppedContext = getStoppedContextMessage(agent, rigAgents)

  // Compact variant: minimal status-only display
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'card p-3 transition-all',
          onClick && 'cursor-pointer hover:border-border-accent hover:shadow-md',
          effectiveState === 'stuck' && 'border-l-4 border-l-red-500'
        )}
        onClick={onClick}
      >
        {/* Single row: Icon + Name + State */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-base flex-shrink-0" title={agent.role_type}>
              {getAgentRoleIcon(agent.role_type)}
            </span>
            <span className="font-medium truncate text-sm">{agent.name}</span>
          </div>
          <div className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0',
            stateBgClass,
            stateClass,
            stateBorderClass
          )}>
            <span>{getAgentStateIcon(effectiveState)}</span>
            <span className="capitalize">{effectiveState}</span>
          </div>
        </div>

        {/* Secondary info - role-specific */}
        {SINGLETON_ROLES.has(agent.role_type) ? (
          // Singleton roles: show contextual status
          <div className="mt-2 text-xs text-text-muted">
            {stoppedContext ? (
              <span className="text-yellow-500">{stoppedContext}</span>
            ) : (
              <>{getRunningActivityMessage(agent)} · {formatRelativeTime(agent.last_activity_at || agent.updated_at)}</>
            )}
          </div>
        ) : agent.hook_bead ? (
          // Workers with hooked bead
          <div className="mt-2 mono text-xs text-amber-400 truncate">
            {agent.hook_bead}
          </div>
        ) : null}
      </div>
    )
  }

  // Default variant: full display with responsive sizing
  return (
    <div
      className={cn(
        'card transition-all h-full flex flex-col',
        onClick && 'cursor-pointer hover:border-border-accent hover:shadow-md',
        effectiveState === 'stuck' && 'border-l-4 border-l-red-500'
      )}
      onClick={onClick}
    >
      {/* Header: Role icon + Name + State badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl flex-shrink-0" title={agent.role_type}>
            {getAgentRoleIcon(agent.role_type)}
          </span>
          <span className="font-semibold truncate">{agent.name}</span>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 flex-shrink-0',
          stateBgClass,
          stateClass,
          stateBorderClass
        )}>
          <span>{getAgentStateIcon(effectiveState)}</span>
          <span className="capitalize">{effectiveState}</span>
        </div>
      </div>

      {/* Role type label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary capitalize">
          {agent.role_type}
        </span>
        <span className="text-xs text-text-muted">
          {agent.rig}
        </span>
      </div>

      {/* Content section - role-specific */}
      <div className="mt-auto pt-3 border-t border-border">
        {SINGLETON_ROLES.has(agent.role_type) ? (
          // Singleton roles: show contextual status
          stoppedContext ? (
            // Stopped: show restart info
            <>
              <div className="text-xs text-text-muted mb-1">
                {ROLE_DESCRIPTIONS[agent.role_type] || 'System agent'}
              </div>
              <div className="text-sm text-yellow-500">
                {stoppedContext}
              </div>
            </>
          ) : (
            // Running: show activity
            <>
              <div className="text-xs text-text-muted mb-1">
                {getRunningActivityMessage(agent)}
              </div>
              <div className="text-sm text-text-secondary">
                Last activity {formatRelativeTime(agent.last_activity_at || agent.updated_at)}
              </div>
            </>
          )
        ) : agent.hook_bead ? (
          // Workers with hooked bead
          <>
            <div className="text-xs text-text-muted mb-1">Working on</div>
            <div className="mono text-sm text-amber-400 truncate">
              {agent.hook_bead}
            </div>
          </>
        ) : (
          // Workers without hooked bead (crew/polecat idle)
          <>
            <div className="text-xs text-text-muted mb-1">
              {ROLE_DESCRIPTIONS[agent.role_type] || 'Worker'}
            </div>
            <div className="text-sm text-text-secondary italic">
              Idle — no work assigned
            </div>
          </>
        )}
      </div>

      {/* Footer: Updated time */}
      <div className="mt-2 text-xs text-text-muted text-right">
        {formatRelativeTime(agent.updated_at)}
      </div>
    </div>
  )
}
