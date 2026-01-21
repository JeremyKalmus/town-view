import { useCallback } from 'react'
import type { IssueStatus, IssueType } from '@/types'
import { cn } from '@/lib/utils'

export interface TreeFilters {
  status: IssueStatus | 'all'
  type: IssueType | 'all'
  assignee: string | 'all'
  priorityMin: number
  priorityMax: number
}

export const DEFAULT_FILTERS: TreeFilters = {
  status: 'all',
  type: 'all',
  assignee: 'all',
  priorityMin: 0,
  priorityMax: 4,
}

interface FilterBarProps {
  filters: TreeFilters
  onFiltersChange: (filters: TreeFilters) => void
  assignees?: string[]
  className?: string
}

const STATUS_OPTIONS: Array<{ value: IssueStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
  { value: 'deferred', label: 'Deferred' },
]

const TYPE_OPTIONS: Array<{ value: IssueType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
  { value: 'chore', label: 'Chore' },
]

const PRIORITY_LABELS: Record<number, string> = {
  0: 'P0 (Critical)',
  1: 'P1 (High)',
  2: 'P2 (Medium)',
  3: 'P3 (Low)',
  4: 'P4 (Minimal)',
}

export function FilterBar({ filters, onFiltersChange, assignees = [], className }: FilterBarProps) {
  const handleStatusChange = useCallback(
    (value: IssueStatus | 'all') => {
      onFiltersChange({ ...filters, status: value })
    },
    [filters, onFiltersChange]
  )

  const handleTypeChange = useCallback(
    (value: IssueType | 'all') => {
      onFiltersChange({ ...filters, type: value })
    },
    [filters, onFiltersChange]
  )

  const handleAssigneeChange = useCallback(
    (value: string | 'all') => {
      onFiltersChange({ ...filters, assignee: value })
    },
    [filters, onFiltersChange]
  )

  const handlePriorityMinChange = useCallback(
    (value: number) => {
      onFiltersChange({
        ...filters,
        priorityMin: value,
        priorityMax: Math.max(value, filters.priorityMax),
      })
    },
    [filters, onFiltersChange]
  )

  const handlePriorityMaxChange = useCallback(
    (value: number) => {
      onFiltersChange({
        ...filters,
        priorityMax: value,
        priorityMin: Math.min(value, filters.priorityMin),
      })
    },
    [filters, onFiltersChange]
  )

  const handleClearAll = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS)
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.assignee !== 'all' ||
    filters.priorityMin !== 0 ||
    filters.priorityMax !== 4

  const selectClass =
    'bg-bg-tertiary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-rust'

  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-status" className="text-sm text-text-secondary">
          Status:
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) => handleStatusChange(e.target.value as IssueStatus | 'all')}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-type" className="text-sm text-text-secondary">
          Type:
        </label>
        <select
          id="filter-type"
          value={filters.type}
          onChange={(e) => handleTypeChange(e.target.value as IssueType | 'all')}
          className={selectClass}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Assignee Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-assignee" className="text-sm text-text-secondary">
          Assignee:
        </label>
        <select
          id="filter-assignee"
          value={filters.assignee}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Assignees</option>
          {assignees.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Range */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">Priority:</label>
        <div className="flex items-center gap-1">
          <select
            id="filter-priority-min"
            value={filters.priorityMin}
            onChange={(e) => handlePriorityMinChange(Number(e.target.value))}
            className={cn(selectClass, 'w-28')}
            aria-label="Minimum priority"
          >
            {[0, 1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <span className="text-text-muted">to</span>
          <select
            id="filter-priority-max"
            value={filters.priorityMax}
            onChange={(e) => handlePriorityMaxChange(Number(e.target.value))}
            className={cn(selectClass, 'w-28')}
            aria-label="Maximum priority"
          >
            {[0, 1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm text-accent-rust hover:text-accent-rust/80 transition-colors underline underline-offset-2"
        >
          Clear All
        </button>
      )}
    </div>
  )
}

/**
 * Checks if an issue matches the given filters.
 */
export function matchesFilters(
  issue: { status: IssueStatus; issue_type: IssueType; assignee?: string; priority: number },
  filters: TreeFilters
): boolean {
  // Status filter
  if (filters.status !== 'all' && issue.status !== filters.status) {
    return false
  }

  // Type filter
  if (filters.type !== 'all' && issue.issue_type !== filters.type) {
    return false
  }

  // Assignee filter
  if (filters.assignee !== 'all' && issue.assignee !== filters.assignee) {
    return false
  }

  // Priority range filter
  if (issue.priority < filters.priorityMin || issue.priority > filters.priorityMax) {
    return false
  }

  return true
}

/**
 * Given a set of matching node IDs and a parent lookup map,
 * returns the set of all ancestor IDs that should remain visible.
 * This ensures filtered tree views show the path to matching nodes.
 */
export function getVisibleAncestorIds(
  matchingIds: Set<string>,
  parentLookup: Map<string, string | undefined>
): Set<string> {
  const ancestorIds = new Set<string>()

  for (const id of matchingIds) {
    let currentId: string | undefined = parentLookup.get(id)
    while (currentId) {
      ancestorIds.add(currentId)
      currentId = parentLookup.get(currentId)
    }
  }

  return ancestorIds
}

/**
 * Determines which nodes should be visible in a filtered tree.
 * A node is visible if:
 * 1. It matches the filters, OR
 * 2. It is an ancestor of a matching node
 *
 * Returns a Set of visible node IDs.
 */
export function getVisibleNodeIds<T extends { id: string; status: IssueStatus; issue_type: IssueType; assignee?: string; priority: number }>(
  nodes: T[],
  filters: TreeFilters,
  parentLookup: Map<string, string | undefined>
): Set<string> {
  // If no filters active, all nodes are visible
  if (
    filters.status === 'all' &&
    filters.type === 'all' &&
    filters.assignee === 'all' &&
    filters.priorityMin === 0 &&
    filters.priorityMax === 4
  ) {
    return new Set(nodes.map((n) => n.id))
  }

  // Find matching nodes
  const matchingIds = new Set<string>()
  for (const node of nodes) {
    if (matchesFilters(node, filters)) {
      matchingIds.add(node.id)
    }
  }

  // Get ancestors of matching nodes
  const ancestorIds = getVisibleAncestorIds(matchingIds, parentLookup)

  // Combine matching nodes and their ancestors
  return new Set([...matchingIds, ...ancestorIds])
}
