import type { Issue } from '@/types'
import { cn, getStatusIcon, getStatusBadgeClass } from '@/lib/utils'

export interface BlockingContextProps {
  /** Issues that are blocking this work item */
  blockers: Issue[]
  /** Compact mode shows "Blocked by: ID1, ID2" format */
  compact?: boolean
  /** Callback when a blocker is clicked for navigation */
  onBlockerClick?: (issueId: string) => void
  /** Additional CSS classes */
  className?: string
}

interface BlockerItemProps {
  issue: Issue
  onClick?: () => void
}

function BlockerItem({ issue, onClick }: BlockerItemProps) {
  const statusBadgeClass = getStatusBadgeClass(issue.status)

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md transition-colors',
        onClick && 'cursor-pointer hover:bg-bg-tertiary'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Status icon */}
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full border',
          'text-xs flex-shrink-0',
          statusBadgeClass
        )}
        title={issue.status}
      >
        {getStatusIcon(issue.status)}
      </span>

      {/* Issue ID */}
      <span className="mono text-text-muted text-sm flex-shrink-0">
        {issue.id}
      </span>

      {/* Title (truncated) */}
      <span className="text-sm text-text-secondary truncate min-w-0">
        {issue.title}
      </span>
    </div>
  )
}

export function BlockingContext({
  blockers,
  compact = false,
  onBlockerClick,
  className,
}: BlockingContextProps) {
  if (blockers.length === 0) {
    return null
  }

  // Compact mode: "Blocked by: GT-123, GT-456"
  if (compact) {
    const blockerIds = blockers.map((b) => b.id)

    return (
      <div className={cn('flex items-center gap-1 text-sm', className)}>
        <span className="text-text-muted">Blocked by:</span>
        <span className="flex items-center gap-1 flex-wrap">
          {blockerIds.map((id, index) => (
            <span key={id} className="inline-flex items-center">
              <button
                onClick={() => onBlockerClick?.(id)}
                className={cn(
                  'mono text-status-blocked hover:underline',
                  onBlockerClick && 'cursor-pointer'
                )}
                disabled={!onBlockerClick}
              >
                {id}
              </button>
              {index < blockerIds.length - 1 && (
                <span className="text-text-muted">,</span>
              )}
            </span>
          ))}
        </span>
      </div>
    )
  }

  // Full mode: list of blockers with status icons
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
        Blocked by ({blockers.length})
      </div>
      <div className="space-y-0.5">
        {blockers.map((blocker) => (
          <BlockerItem
            key={blocker.id}
            issue={blocker}
            onClick={onBlockerClick ? () => onBlockerClick(blocker.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
