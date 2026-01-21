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
 * Returns the CSS class for priority-based border coloring on tree nodes.
 */
export function getPriorityBorderClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'border-l-priority-p0'
    case 1:
      return 'border-l-priority-p1'
    case 2:
      return 'border-l-priority-p2'
    case 3:
      return 'border-l-priority-p3'
    case 4:
      return 'border-l-priority-p4'
    default:
      return 'border-l-priority-p2'
  }
}

/**
 * Returns the CSS class for priority text color.
 */
export function getPriorityColorClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'text-priority-p0'
    case 1:
      return 'text-priority-p1'
    case 2:
      return 'text-priority-p2'
    case 3:
      return 'text-priority-p3'
    case 4:
      return 'text-priority-p4'
    default:
      return 'text-priority-p2'
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

/**
 * Returns the CSS class for tree node priority styling.
 */
export function getTreeNodePriorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'tree-node-priority-p0'
    case 1:
      return 'tree-node-priority-p1'
    case 2:
      return 'tree-node-priority-p2'
    case 3:
      return 'tree-node-priority-p3'
    case 4:
      return 'tree-node-priority-p4'
    default:
      return 'tree-node-priority-p2'
  }
}

/**
 * Returns the CSS class for tree indentation by depth level.
 */
export function getTreeIndentClass(depth: number): string {
  const maxIndent = 5
  const clampedDepth = Math.min(Math.max(0, depth), maxIndent)
  return `tree-indent-${clampedDepth}`
}
