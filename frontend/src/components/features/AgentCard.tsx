import type { Agent, AgentState } from '@/types'
import { getAgentRoleIcon, getAgentStateBgClass, getAgentStateBorderClass, getAgentStateClass, getAgentStateIcon } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
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
  // Default to running if connected (has session), otherwise idle
  if (agent.session_id) {
    return 'running'
  }
  return 'idle'
}

export function AgentCard({ agent, onClick, variant = 'default' }: AgentCardProps) {
  const effectiveState = getEffectiveState(agent)
  const stateClass = getAgentStateClass(effectiveState)
  const stateBgClass = getAgentStateBgClass(effectiveState)
  const stateBorderClass = getAgentStateBorderClass(effectiveState)

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

        {/* Hooked bead (if working) */}
        {agent.hook_bead && (
          <div className="mt-2 mono text-xs text-amber-400 truncate">
            {agent.hook_bead}
          </div>
        )}
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

      {/* Hooked bead - grows to fill space */}
      <div className="mt-auto pt-3 border-t border-border">
        {agent.hook_bead ? (
          <>
            <div className="text-xs text-text-muted mb-1">Hooked bead</div>
            <div className="mono text-sm text-amber-400 truncate">
              {agent.hook_bead}
            </div>
          </>
        ) : (
          <div className="text-xs text-text-muted italic">No hooked bead</div>
        )}
      </div>

      {/* Footer: Updated time */}
      <div className="mt-3 text-xs text-text-muted text-right">
        Updated {formatRelativeTime(agent.updated_at)}
      </div>
    </div>
  )
}
