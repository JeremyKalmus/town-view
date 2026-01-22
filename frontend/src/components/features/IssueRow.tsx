import type { Issue } from '@/types'
import { cn } from '@/lib/class-utils'
import { getPriorityBadgeClass, getPriorityLabel } from '@/lib/priority-utils'
import { formatRelativeTime, getStatusBadgeClass, getStatusIcon } from '@/lib/status-utils'

interface IssueRowProps {
  issue: Issue
  onClick?: () => void
  isUpdated?: boolean
  nodeRef?: (el: HTMLDivElement | null) => void
}

export function IssueRow({ issue, onClick, isUpdated = false, nodeRef }: IssueRowProps) {
  const statusBadgeClass = getStatusBadgeClass(issue.status)

  return (
    <div
      ref={nodeRef}
      className={cn(
        'flex items-center gap-3 py-3 px-2 -mx-2 rounded-md transition-colors',
        onClick && 'cursor-pointer hover:bg-bg-tertiary',
        isUpdated && 'animate-flash-update'
      )}
      onClick={onClick}
    >
      {/* Priority badge */}
      <span className={cn('w-8 flex-shrink-0', getPriorityBadgeClass(issue.priority))}>
        {getPriorityLabel(issue.priority)}
      </span>

      {/* Status badge - pill-shaped with icon */}
      <span className={cn(
        'inline-flex items-center justify-center',
        'w-6 h-6 rounded-full border',
        'text-sm',
        'flex-shrink-0',
        statusBadgeClass
      )}>
        {getStatusIcon(issue.status)}
      </span>

      {/* Issue ID */}
      <span className="mono text-text-muted w-24 flex-shrink-0 truncate">
        {issue.id}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="truncate block">{issue.title}</span>
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted"
              >
                {label}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-xs text-text-muted">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Type badge */}
      <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0">
        {issue.issue_type}
      </span>

      {/* Updated time */}
      <span className="text-xs text-text-muted w-16 text-right flex-shrink-0">
        {formatRelativeTime(issue.updated_at)}
      </span>
    </div>
  )
}
