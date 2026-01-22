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
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'open':
      return '○'
    case 'in_progress':
      return '◐'
    case 'blocked':
      return '●'
    case 'closed':
      return '✓'
    case 'deferred':
      return '❄'
    default:
      return '○'
  }
}

/**
 * Returns the CSS class for status badge styling.
 * Includes background, text color, and border color.
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-status-open/20 text-status-open border-status-open/30'
    case 'in_progress':
      return 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30'
    case 'blocked':
      return 'bg-status-blocked/20 text-status-blocked border-status-blocked/30'
    case 'closed':
      return 'bg-status-closed/20 text-status-closed border-status-closed/30'
    case 'deferred':
      return 'bg-status-deferred/20 text-status-deferred border-status-deferred/30'
    case 'tombstone':
      return 'bg-bg-tertiary text-text-muted border-border'
    default:
      return 'bg-status-open/20 text-status-open border-status-open/30'
  }
}

/**
 * Returns the CSS class for status text color only.
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'open':
      return 'text-status-open'
    case 'in_progress':
      return 'text-status-in-progress'
    case 'blocked':
      return 'text-status-blocked'
    case 'closed':
      return 'text-status-closed'
    case 'deferred':
      return 'text-status-deferred'
    case 'tombstone':
      return 'text-text-muted'
    default:
      return 'text-status-open'
  }
}

/**
 * Returns the CSS class for tree status icon.
 */
export function getTreeStatusIconClass(status: string): string {
  switch (status) {
    case 'open':
      return 'tree-status-icon-open'
    case 'in_progress':
      return 'tree-status-icon-in-progress'
    case 'blocked':
      return 'tree-status-icon-blocked'
    case 'closed':
      return 'tree-status-icon-closed'
    case 'deferred':
      return 'tree-status-icon-deferred'
    default:
      return 'tree-status-icon-open'
  }
}
