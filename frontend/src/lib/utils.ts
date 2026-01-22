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
 * Creates a type-safe mapper function that returns a value based on a key lookup.
 * Replaces switch-based get*Class functions with a more concise pattern.
 *
 * @example
 * const getStatusClass = createClassMapper<IssueStatus>({
 *   open: 'text-status-open',
 *   closed: 'text-status-closed'
 * }, 'text-status-open')
 *
 * getStatusClass('open') // 'text-status-open'
 * getStatusClass('unknown') // 'text-status-open' (default)
 */
export function createClassMapper<T extends string | number>(
  mapping: Partial<Record<T, string>>,
  defaultValue: string
): (key: T) => string {
  return (key: T): string => mapping[key] ?? defaultValue
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
 * Returns the CSS class for a priority level.
 */
export const getPriorityClass = createClassMapper<number>(
  {
    0: 'priority-p0',
    1: 'priority-p1',
    2: 'priority-p2',
    3: 'priority-p3',
    4: 'priority-p4',
  },
  'priority-p2'
)

/**
 * Returns the display label for a priority level.
 */
export function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

/**
 * Returns the icon for an agent state.
 */
export const getAgentStateIcon = createClassMapper<string>(
  {
    idle: '○',
    working: '◉',
    stuck: '⚠',
    paused: '❚❚',
  },
  '○'
)

/**
 * Returns the CSS class for an agent state.
 */
export const getAgentStateClass = createClassMapper<string>(
  {
    idle: 'text-text-muted',
    working: 'text-status-in-progress',
    stuck: 'text-status-blocked',
    paused: 'text-status-deferred',
  },
  'text-text-muted'
)

/**
 * Returns the background class for an agent state indicator.
 */
export const getAgentStateBgClass = createClassMapper<string>(
  {
    idle: 'bg-text-muted/20',
    working: 'bg-status-in-progress/20',
    stuck: 'bg-status-blocked/20',
    paused: 'bg-status-deferred/20',
  },
  'bg-text-muted/20'
)

/**
 * Returns the icon for an agent role type.
 */
export const getAgentRoleIcon = createClassMapper<string>(
  {
    witness: '👁',
    refinery: '⚙',
    crew: '👥',
    polecat: '🏎',
    deacon: '📋',
    mayor: '🏛',
  },
  '⚡'
)

/**
 * Returns the CSS class for a priority badge.
 */
export const getPriorityBadgeClass = createClassMapper<number>(
  {
    0: 'badge-priority-p0',
    1: 'badge-priority-p1',
    2: 'badge-priority-p2',
    3: 'badge-priority-p3',
    4: 'badge-priority-p4',
  },
  'badge-priority-p2'
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
 * Returns the CSS class for priority-based border coloring on tree nodes.
 */
export const getPriorityBorderClass = createClassMapper<number>(
  {
    0: 'border-l-priority-p0',
    1: 'border-l-priority-p1',
    2: 'border-l-priority-p2',
    3: 'border-l-priority-p3',
    4: 'border-l-priority-p4',
  },
  'border-l-priority-p2'
)

/**
 * Returns the CSS class for priority text color.
 */
export const getPriorityColorClass = createClassMapper<number>(
  {
    0: 'text-priority-p0',
    1: 'text-priority-p1',
    2: 'text-priority-p2',
    3: 'text-priority-p3',
    4: 'text-priority-p4',
  },
  'text-priority-p2'
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

/**
 * Returns the CSS class for tree node priority styling.
 */
export const getTreeNodePriorityClass = createClassMapper<number>(
  {
    0: 'tree-node-priority-p0',
    1: 'tree-node-priority-p1',
    2: 'tree-node-priority-p2',
    3: 'tree-node-priority-p3',
    4: 'tree-node-priority-p4',
  },
  'tree-node-priority-p2'
)

/**
 * Returns the CSS class for tree indentation by depth level.
 */
export function getTreeIndentClass(depth: number): string {
  const maxIndent = 5
  const clampedDepth = Math.min(Math.max(0, depth), maxIndent)
  return `tree-indent-${clampedDepth}`
}
