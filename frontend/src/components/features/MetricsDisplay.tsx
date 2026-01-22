import type { AuditMetrics } from '@/types'
import { cn } from '@/lib/class-utils'

interface MetricsDisplayProps {
  metrics: AuditMetrics
  className?: string
}

/**
 * MetricsDisplay shows dashboard cards for audit metrics.
 * Displays time-to-complete (avg/min/max), re-assignments count,
 * and merge conflicts count with visual anomaly indicators.
 */
export function MetricsDisplay({ metrics, className }: MetricsDisplayProps) {
  const { timeToComplete, reassignmentCount, mergeConflictCount, anomalyThresholds } = metrics

  const isTimeAnomaly = anomalyThresholds?.timeToComplete !== undefined &&
    timeToComplete.avg > anomalyThresholds.timeToComplete
  const isReassignmentAnomaly = anomalyThresholds?.reassignmentCount !== undefined &&
    reassignmentCount > anomalyThresholds.reassignmentCount
  const isConflictAnomaly = anomalyThresholds?.mergeConflictCount !== undefined &&
    mergeConflictCount > anomalyThresholds.mergeConflictCount

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      <MetricCard
        title="Time to Complete"
        icon="⏱"
        isAnomaly={isTimeAnomaly}
      >
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-text-secondary text-sm">Average</span>
            <span className={cn('mono text-lg font-semibold', isTimeAnomaly && 'text-status-blocked')}>
              {formatDuration(timeToComplete.avg)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-text-muted">Min</span>
            <span className="mono text-text-secondary">{formatDuration(timeToComplete.min)}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-text-muted">Max</span>
            <span className="mono text-text-secondary">{formatDuration(timeToComplete.max)}</span>
          </div>
        </div>
      </MetricCard>

      <MetricCard
        title="Re-assignments"
        icon="↔"
        isAnomaly={isReassignmentAnomaly}
      >
        <div className="flex items-center justify-center py-2">
          <span className={cn(
            'mono text-4xl font-bold',
            isReassignmentAnomaly ? 'text-status-blocked' : 'text-text-primary'
          )}>
            {reassignmentCount}
          </span>
        </div>
        <div className="text-center text-xs text-text-muted">
          {reassignmentCount === 1 ? 'reassignment' : 'reassignments'}
        </div>
      </MetricCard>

      <MetricCard
        title="Merge Conflicts"
        icon="⚡"
        isAnomaly={isConflictAnomaly}
      >
        <div className="flex items-center justify-center py-2">
          <span className={cn(
            'mono text-4xl font-bold',
            isConflictAnomaly ? 'text-status-blocked' : 'text-text-primary'
          )}>
            {mergeConflictCount}
          </span>
        </div>
        <div className="text-center text-xs text-text-muted">
          {mergeConflictCount === 1 ? 'conflict' : 'conflicts'}
        </div>
      </MetricCard>
    </div>
  )
}

interface MetricCardProps {
  title: string
  icon: string
  isAnomaly?: boolean
  children: React.ReactNode
}

function MetricCard({ title, icon, isAnomaly, children }: MetricCardProps) {
  return (
    <div
      className={cn(
        'card p-4',
        'transition-all duration-200',
        isAnomaly && 'border-l-4 border-l-status-blocked'
      )}
    >
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        {isAnomaly && (
          <span className="ml-auto text-status-blocked text-sm" title="Anomaly detected">
            ⚠
          </span>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "2h 30m", "45m", "1d 4h"
 */
function formatDuration(ms: number): string {
  if (ms < 0) return '—'
  if (ms === 0) return '0m'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return `${minutes}m`
}
