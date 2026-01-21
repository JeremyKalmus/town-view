import type { Issue } from '@/types'
import { cn, formatRelativeTime, getStatusIcon, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

interface IssueRowProps {
  issue: Issue
  onClick?: () => void
}

export function IssueRow({ issue, onClick }: IssueRowProps) {
  const statusClass = {
    open: 'text-status-open',
    in_progress: 'text-status-in-progress',
    blocked: 'text-status-blocked',
    closed: 'text-status-closed',
    deferred: 'text-status-deferred',
    tombstone: 'text-text-muted',
  }[issue.status] || 'text-status-open'

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 px-2 -mx-2 rounded-md transition-colors',
        onClick && 'cursor-pointer hover:bg-bg-tertiary'
      )}
      onClick={onClick}
    >
      {/* Priority badge */}
      <span className={cn('w-8 flex-shrink-0', getPriorityBadgeClass(issue.priority))}>
        {getPriorityLabel(issue.priority)}
      </span>

      {/* Status icon */}
      <span className={cn('text-lg w-5 text-center flex-shrink-0', statusClass)}>
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
