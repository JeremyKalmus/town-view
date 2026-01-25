import type { AgentState } from '@/types'
import { getAgentStateIcon, getAgentStateClass, getAgentStateBgClass } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'

export type StatusDotSize = 'sm' | 'md' | 'lg'

export interface StatusDotProps {
  /** Agent state to display, or null for no agent */
  state: AgentState | null
  /** Size variant */
  size?: StatusDotSize
  /** Additional class names */
  className?: string
}

const sizeClasses: Record<StatusDotSize, string> = {
  sm: 'w-4 h-4 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
}

/**
 * StatusDot - A colored dot indicator for agent state
 *
 * Displays the agent's current state as a colored dot with an icon.
 * Supports three size variants: sm, md, lg.
 */
export function StatusDot({ state, size = 'md', className }: StatusDotProps) {
  if (!state) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'bg-bg-tertiary text-text-muted',
          sizeClasses[size],
          className
        )}
        title="No agent"
      />
    )
  }

  const icon = getAgentStateIcon(state)
  const textClass = getAgentStateClass(state)
  const bgClass = getAgentStateBgClass(state)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        bgClass,
        textClass,
        sizeClasses[size],
        className
      )}
      title={state}
    >
      {icon}
    </span>
  )
}
