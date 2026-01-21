import type { Agent, AgentState } from '@/types'
import { cn, formatRelativeTime, getAgentStateIcon, getAgentStateClass, getAgentStateBgClass, getAgentRoleIcon } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  /** Compact variant for minimal status-only display */
  variant?: 'default' | 'compact'
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
  // Default to idle
  return 'idle'
}

export function AgentCard({ agent, onClick, variant = 'default' }: AgentCardProps) {
  const effectiveState = getEffectiveState(agent)
  const stateClass = getAgentStateClass(effectiveState)
  const stateBgClass = getAgentStateBgClass(effectiveState)

  // Compact variant: minimal status-only display
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary transition-all',
          onClick && 'cursor-pointer hover:border-border-accent hover:bg-bg-tertiary',
          effectiveState === 'stuck' && 'border-l-4 border-l-status-blocked'
        )}
        onClick={onClick}
      >
        {/* State indicator dot */}
        <div className={cn('health-dot flex-shrink-0', `health-dot-${effectiveState}`)}>
          {getAgentStateIcon(effectiveState)}
        </div>

        {/* Role icon + Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base" title={agent.role_type}>
            {getAgentRoleIcon(agent.role_type)}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate capitalize">
              {agent.role_type}
            </span>
            {agent.hook_bead && (
              <span className="mono text-xs text-status-in-progress truncate">
                {agent.hook_bead}
              </span>
            )}
          </div>
        </div>

        {/* State label */}
        <span className={cn('text-xs font-medium capitalize', stateClass)}>
          {effectiveState}
        </span>
      </div>
    )
  }

  // Default variant: full card display
  return (
    <div
      className={cn(
        'card transition-all',
        onClick && 'cursor-pointer hover:border-border-accent hover:shadow-md',
        effectiveState === 'stuck' && 'border-l-4 border-l-status-blocked'
      )}
      onClick={onClick}
    >
      {/* Header: Role icon + Name + State badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={agent.role_type}>
            {getAgentRoleIcon(agent.role_type)}
          </span>
          <span className="font-medium truncate">{agent.name}</span>
        </div>
        <div className={cn('badge', stateBgClass, stateClass)}>
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

      {/* Hooked bead */}
      {agent.hook_bead ? (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-text-muted mb-1">Hooked bead</div>
          <div className="mono text-sm text-status-in-progress truncate">
            {agent.hook_bead}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-text-muted italic">No hooked bead</div>
        </div>
      )}

      {/* Footer: Updated time */}
      <div className="mt-3 text-xs text-text-muted text-right">
        Updated {formatRelativeTime(agent.updated_at)}
      </div>
    </div>
  )
}
