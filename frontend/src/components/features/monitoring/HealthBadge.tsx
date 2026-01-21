import { cn } from '@/lib/utils'

export type HealthStatus = 'normal' | 'concerning' | 'stuck'

interface HealthBadgeProps {
  /** Duration in milliseconds since last activity */
  durationMs?: number
  /** Override the computed health status */
  status?: HealthStatus
  /** Show the duration text (e.g. '12m' or '2h 15m') */
  showDuration?: boolean
  /** Additional CSS classes */
  className?: string
}

/** Thresholds in milliseconds */
const CONCERNING_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
const STUCK_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Compute health status from duration.
 * - normal: < 2 minutes
 * - concerning: 2-10 minutes
 * - stuck: > 10 minutes
 */
function computeHealthStatus(durationMs: number): HealthStatus {
  if (durationMs >= STUCK_THRESHOLD_MS) return 'stuck'
  if (durationMs >= CONCERNING_THRESHOLD_MS) return 'concerning'
  return 'normal'
}

/**
 * Format duration for display.
 * - Under 60 seconds: '<1m'
 * - Under 60 minutes: 'Xm'
 * - 60+ minutes: 'Xh Ym'
 */
function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / (60 * 1000))

  if (totalMinutes < 1) return '<1m'
  if (totalMinutes < 60) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/** Color classes for each health status */
const healthColorClasses: Record<HealthStatus, { bg: string; text: string; dot: string }> = {
  normal: {
    bg: 'bg-status-closed/20',
    text: 'text-status-closed',
    dot: 'bg-status-closed',
  },
  concerning: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  stuck: {
    bg: 'bg-status-blocked/20',
    text: 'text-status-blocked',
    dot: 'bg-status-blocked',
  },
}

/**
 * HealthBadge displays a color-coded health indicator.
 *
 * Colors:
 * - Green (status-closed): normal, < 2 minutes
 * - Yellow (amber-500): concerning, 2-10 minutes
 * - Red (status-blocked): stuck, > 10 minutes
 */
export function HealthBadge({
  durationMs = 0,
  status,
  showDuration = false,
  className,
}: HealthBadgeProps) {
  const computedStatus = status ?? computeHealthStatus(durationMs)
  const colors = healthColorClasses[computedStatus]

  if (showDuration) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium',
          colors.bg,
          colors.text,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
        {formatDuration(durationMs)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full flex-shrink-0',
        colors.dot,
        className
      )}
      title={`Health: ${computedStatus}`}
      aria-label={`Health status: ${computedStatus}`}
    />
  )
}

export { computeHealthStatus, formatDuration }
