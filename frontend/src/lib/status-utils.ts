import { createClassMapper } from './class-utils'

/**
 * Formats a date string for display.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Formats a date string as relative time (e.g., "2h ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(dateString)
}

/**
 * Returns the status icon for an issue status.
 */
export const getStatusIcon = createClassMapper<string>(
  {
    open: '○',
    in_progress: '◐',
    blocked: '●',
    closed: '✓',
    deferred: '❄',
  },
  '○'
)

/**
 * Returns the CSS class for status badge styling.
 * Includes background, text color, and border color.
 */
export const getStatusBadgeClass = createClassMapper<string>(
  {
    open: 'bg-status-open/20 text-status-open border-status-open/30',
    in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
    blocked: 'bg-status-blocked/20 text-status-blocked border-status-blocked/30',
    closed: 'bg-status-closed/20 text-status-closed border-status-closed/30',
    deferred: 'bg-status-deferred/20 text-status-deferred border-status-deferred/30',
    tombstone: 'bg-bg-tertiary text-text-muted border-border',
  },
  'bg-status-open/20 text-status-open border-status-open/30'
)

/**
 * Returns the CSS class for status text color only.
 */
export const getStatusColorClass = createClassMapper<string>(
  {
    open: 'text-status-open',
    in_progress: 'text-status-in-progress',
    blocked: 'text-status-blocked',
    closed: 'text-status-closed',
    deferred: 'text-status-deferred',
    tombstone: 'text-text-muted',
  },
  'text-status-open'
)

/**
 * Returns the CSS class for tree status icon.
 */
export const getTreeStatusIconClass = createClassMapper<string>(
  {
    open: 'tree-status-icon-open',
    in_progress: 'tree-status-icon-in-progress',
    blocked: 'tree-status-icon-blocked',
    closed: 'tree-status-icon-closed',
    deferred: 'tree-status-icon-deferred',
  },
  'tree-status-icon-open'
)
