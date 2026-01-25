import { cn } from '@/lib/class-utils'
import { getStatusIcon, getStatusColorClass, formatRelativeTime } from '@/lib/status-utils'
import { useConvoyChildren, type ConvoyChild } from '@/hooks/useConvoyChildren'

export interface ConvoyChildListProps {
  /** The rig ID */
  rigId: string
  /** The convoy ID to get children for */
  convoyId: string
  /** Whether to fetch children (lazy loading) */
  expanded?: boolean
  /** Optional class name */
  className?: string
  /** Callback when a task is clicked */
  onTaskClick?: (child: ConvoyChild) => void
}

/**
 * ConvoyChildList - Displays child tasks of a convoy when expanded.
 * Fetches children lazily when expanded becomes true.
 * Shows: status icon, task title, assignee, time since update.
 */
export function ConvoyChildList({
  rigId,
  convoyId,
  expanded = false,
  className,
  onTaskClick,
}: ConvoyChildListProps) {
  const { children, loading, error } = useConvoyChildren(rigId, convoyId, {
    enabled: expanded,
  })

  // Loading skeleton
  if (loading && children.length === 0) {
    return (
      <div className={cn('space-y-1 p-3', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 rounded bg-bg-tertiary animate-pulse" />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('p-3 text-xs text-status-blocked', className)}>
        {error}
      </div>
    )
  }

  // Empty state
  if (children.length === 0) {
    return (
      <div className={cn('p-3 text-xs text-text-muted text-center', className)}>
        No child tasks
      </div>
    )
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {children.map(child => (
        <div
          key={child.id}
          className={cn(
            'flex items-center gap-3 px-3 py-2',
            'hover:bg-bg-tertiary/50 transition-colors',
            onTaskClick && 'cursor-pointer'
          )}
          onClick={() => onTaskClick?.(child)}
          role={onTaskClick ? 'button' : undefined}
          tabIndex={onTaskClick ? 0 : undefined}
          onKeyDown={onTaskClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTaskClick(child)
            }
          } : undefined}
        >
          {/* Status icon */}
          <span
            className={cn(
              'text-sm flex-shrink-0',
              getStatusColorClass(child.status)
            )}
          >
            {getStatusIcon(child.status)}
          </span>

          {/* Issue ID */}
          <span className="mono text-xs text-text-muted flex-shrink-0 w-24 truncate">
            {child.id}
          </span>

          {/* Title */}
          <span className="flex-1 text-sm text-text-primary truncate">
            {child.title}
          </span>

          {/* Assignee */}
          {child.assignee && (
            <span className="text-xs text-text-secondary flex-shrink-0 max-w-[100px] truncate">
              {child.assignee.split('/').pop()}
            </span>
          )}

          {/* Time since update */}
          <span className="text-xs text-text-muted flex-shrink-0">
            {formatRelativeTime(child.updated_at)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ConvoyChildList
