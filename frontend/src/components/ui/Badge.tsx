import { cn } from '@/lib/utils'
import type { AgentState } from '@/types'

export type BadgeVariant = 'status' | 'health-dot'

interface BadgeBaseProps {
  /** Badge variant */
  variant?: BadgeVariant
  /** Additional CSS classes */
  className?: string
}

interface StatusBadgeProps extends BadgeBaseProps {
  variant?: 'status'
  /** Status text to display */
  status: string
  /** Color scheme for the badge */
  color?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

interface HealthDotBadgeProps extends BadgeBaseProps {
  variant: 'health-dot'
  /** Agent state determines color: idle=green, working=blue, stuck=red, paused=yellow, undefined=gray */
  state?: AgentState
  /** Tooltip text for accessibility */
  title?: string
}

export type BadgeProps = StatusBadgeProps | HealthDotBadgeProps

const statusColorClasses = {
  default: 'bg-bg-tertiary text-text-secondary border-border',
  success: 'bg-status-closed/20 text-status-closed border-status-closed/30',
  warning: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
  error: 'bg-status-blocked/20 text-status-blocked border-status-blocked/30',
  info: 'bg-status-open/20 text-status-open border-status-open/30',
}

/**
 * Map agent state to health dot color.
 * - idle: green (status-closed)
 * - working: blue (status-open)
 * - stuck: red (status-blocked)
 * - paused: yellow (status-in-progress)
 * - undefined: gray (status-deferred)
 */
const healthDotColorClasses: Record<AgentState | 'none', string> = {
  idle: 'bg-status-closed',
  working: 'bg-status-open',
  stuck: 'bg-status-blocked',
  paused: 'bg-status-in-progress',
  none: 'bg-status-deferred',
}

/**
 * Badge component with multiple variants.
 *
 * - status: Text badge with colored background
 * - health-dot: Small circular indicator showing agent health state
 */
export function Badge(props: BadgeProps) {
  if (props.variant === 'health-dot') {
    const { state, title, className } = props
    const colorClass = healthDotColorClasses[state ?? 'none']

    return (
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full flex-shrink-0',
          colorClass,
          className
        )}
        title={title}
        aria-label={title}
      />
    )
  }

  // Default: status variant
  const { status, color = 'default', className } = props

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border',
        statusColorClasses[color],
        className
      )}
    >
      {status}
    </span>
  )
}

export type { AgentState }
