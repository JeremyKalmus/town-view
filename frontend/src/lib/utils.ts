import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge.
 * Useful for conditional classes and merging Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
 * Returns the CSS class for a priority level.
 */
export function getPriorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'priority-p0'
    case 1:
      return 'priority-p1'
    case 2:
      return 'priority-p2'
    case 3:
      return 'priority-p3'
    case 4:
      return 'priority-p4'
    default:
      return 'priority-p2'
  }
}

/**
 * Returns the display label for a priority level.
 */
export function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

/**
 * Returns the icon for an agent state.
 */
export function getAgentStateIcon(state: string): string {
  switch (state) {
    case 'idle':
      return '○'
    case 'working':
      return '◉'
    case 'stuck':
      return '⚠'
    case 'paused':
      return '❚❚'
    default:
      return '○'
  }
}

/**
 * Returns the CSS class for an agent state.
 */
export function getAgentStateClass(state: string): string {
  switch (state) {
    case 'idle':
      return 'text-text-muted'
    case 'working':
      return 'text-status-in-progress'
    case 'stuck':
      return 'text-status-blocked'
    case 'paused':
      return 'text-status-deferred'
    default:
      return 'text-text-muted'
  }
}

/**
 * Returns the background class for an agent state indicator.
 */
export function getAgentStateBgClass(state: string): string {
  switch (state) {
    case 'idle':
      return 'bg-text-muted/20'
    case 'working':
      return 'bg-status-in-progress/20'
    case 'stuck':
      return 'bg-status-blocked/20'
    case 'paused':
      return 'bg-status-deferred/20'
    default:
      return 'bg-text-muted/20'
  }
}

/**
 * Returns the icon for an agent role type.
 */
export function getAgentRoleIcon(roleType: string): string {
  switch (roleType) {
    case 'witness':
      return '👁'
    case 'refinery':
      return '⚙'
    case 'crew':
      return '👥'
    case 'polecat':
      return '🏎'
    case 'deacon':
      return '📋'
    case 'mayor':
      return '🏛'
    default:
      return '⚡'
  }
}

/**
 * Returns the CSS class for a priority badge.
 */
export function getPriorityBadgeClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'badge-priority-p0'
    case 1:
      return 'badge-priority-p1'
    case 2:
      return 'badge-priority-p2'
    case 3:
      return 'badge-priority-p3'
    case 4:
      return 'badge-priority-p4'
    default:
      return 'badge-priority-p2'
  }
}
