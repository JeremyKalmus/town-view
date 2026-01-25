import { cn } from '@/lib/class-utils'
import type { AgentState } from '@/types'
import {
  getAgentStateIcon,
  getAgentStateClass,
  getAgentStateBgClass,
} from '@/lib/agent-utils'

export type StatusDotSize = 'sm' | 'md' | 'lg'

export interface StatusDotProps {
  /** Agent state determines color and icon */
  state: AgentState | null
  /** Size variant: sm (8px dot), md (16px with icon), lg (24px with icon) */
  size?: StatusDotSize
  /** Tooltip text (defaults to state name) */
  title?: string
  /** Additional CSS classes */
  className?: string
}

const sizeClasses: Record<StatusDotSize, string> = {
  sm: 'w-2 h-2',
  md: 'w-4 h-4 text-[10px]',
  lg: 'w-6 h-6 text-xs',
}

/**
 * StatusDot - Shared status indicator component for agent health states.
 *
 * Renders a colored dot/badge indicating agent state:
 * - sm: Simple colored dot (no icon)
 * - md: Small badge with icon
 * - lg: Standard badge with icon (matches RigHealthGrid)
 *
 * Color mapping:
 * - starting: yellow (transitioning)
 * - running: green (healthy)
 * - idle: blue (available)
 * - working: amber (active)
 * - stuck: red (needs attention)
 * - stopping: orange (transitioning)
 * - stopped: gray (inactive)
 * - paused: purple (suspended)
 * - null: muted gray (no agent)
 */
export function StatusDot({
  state,
  size = 'lg',
  title,
  className,
}: StatusDotProps) {
  const displayTitle = title ?? state ?? 'No agent'
  const showIcon = size !== 'sm'

  if (!state) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'bg-bg-tertiary text-text-muted',
          sizeClasses[size],
          className
        )}
        title={displayTitle}
        aria-label={displayTitle}
      >
        {showIcon && '○'}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        getAgentStateBgClass(state),
        getAgentStateClass(state),
        sizeClasses[size],
        className
      )}
      title={displayTitle}
      aria-label={displayTitle}
    >
      {showIcon && getAgentStateIcon(state)}
    </span>
  )
}
