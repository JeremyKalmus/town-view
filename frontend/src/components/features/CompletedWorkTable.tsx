import { useMemo, useState, useCallback } from 'react'
import type { Issue } from '@/types'
import { cn } from '@/lib/class-utils'
import { AssignmentComparison } from './AssignmentComparison'

interface CompletedWorkTableProps {
  /** Array of closed issues to display */
  issues: Issue[]
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
  /** Optional CSS class name */
  className?: string
}

type SortField = 'id' | 'title' | 'issue_type' | 'assignee' | 'duration' | 'close_reason'
type SortDirection = 'asc' | 'desc'

/**
 * CompletedWorkTable displays closed issues in a tabular format with
 * sortable columns and expandable rows for full issue details.
 *
 * Columns: ID, Title, Type, Assignee, Duration, Close Reason
 */
export function CompletedWorkTable({
  issues,
  updatedIssueIds = new Set(),
  className,
}: CompletedWorkTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Handle row expansion toggle
  const handleToggleExpand = useCallback((issueId: string) => {
    setExpandedId((prev) => (prev === issueId ? null : issueId))
  }, [])

  // Handle column header click for sorting
  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        return field
      }
      setSortDirection('asc')
      return field
    })
  }, [])

  // Calculate duration in ms for an issue
  const getDurationMs = useCallback((issue: Issue): number => {
    if (!issue.created_at || !issue.closed_at) return 0
    const created = new Date(issue.created_at).getTime()
    const closed = new Date(issue.closed_at).getTime()
    return Math.max(0, closed - created)
  }, [])

  // Sort issues based on current sort state
  const sortedIssues = useMemo(() => {
    const sorted = [...issues]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'issue_type':
          comparison = a.issue_type.localeCompare(b.issue_type)
          break
        case 'assignee':
          comparison = (a.assignee || '').localeCompare(b.assignee || '')
          break
        case 'duration':
          comparison = getDurationMs(a) - getDurationMs(b)
          break
        case 'close_reason':
          comparison = (a.close_reason || '').localeCompare(b.close_reason || '')
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [issues, sortField, sortDirection, getDurationMs])

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <SortableHeader
              label="ID"
              field="id"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Title"
              field="title"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
              className="text-left"
            />
            <SortableHeader
              label="Type"
              field="issue_type"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Assignee"
              field="assignee"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Duration"
              field="duration"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Close Reason"
              field="close_reason"
              currentField={sortField}
              direction={sortDirection}
              onSort={handleSort}
              className="text-left"
            />
            <th className="w-8" /> {/* Expand indicator column */}
          </tr>
        </thead>
        <tbody>
          {sortedIssues.map((issue) => (
            <CompletedWorkRow
              key={issue.id}
              issue={issue}
              isExpanded={expandedId === issue.id}
              onToggleExpand={() => handleToggleExpand(issue.id)}
              isUpdated={updatedIssueIds.has(issue.id)}
              durationMs={getDurationMs(issue)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentField === field

  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wide cursor-pointer',
        'hover:text-text-secondary transition-colors select-none',
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive && (
          <svg
            className={cn(
              'w-3 h-3 transition-transform',
              direction === 'desc' && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        )}
      </div>
    </th>
  )
}

interface CompletedWorkRowProps {
  issue: Issue
  isExpanded: boolean
  onToggleExpand: () => void
  isUpdated?: boolean
  durationMs: number
}

function CompletedWorkRow({
  issue,
  isExpanded,
  onToggleExpand,
  isUpdated = false,
  durationMs,
}: CompletedWorkRowProps) {
  // For the comparison, we use the same issue for both original and final
  // In a real implementation, the backend would provide the original state
  const originalIssue: Issue = useMemo(
    () => ({
      ...issue,
      status: 'open', // Original would have been open
    }),
    [issue]
  )

  return (
    <>
      <tr
        className={cn(
          'border-b border-border cursor-pointer',
          'hover:bg-bg-tertiary/50 transition-colors',
          isExpanded && 'bg-bg-tertiary/30',
          isUpdated && 'animate-flash-update'
        )}
        onClick={onToggleExpand}
      >
        {/* ID */}
        <td className="px-3 py-3 mono text-xs text-text-muted whitespace-nowrap">
          {issue.id}
        </td>

        {/* Title */}
        <td className="px-3 py-3 text-text-primary max-w-[300px]">
          <span className="truncate block">{issue.title}</span>
        </td>

        {/* Type */}
        <td className="px-3 py-3 text-center">
          <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary capitalize">
            {issue.issue_type.replace('-', ' ')}
          </span>
        </td>

        {/* Assignee */}
        <td className="px-3 py-3 text-sm text-text-secondary text-center whitespace-nowrap">
          {issue.assignee || <span className="text-text-muted italic">—</span>}
        </td>

        {/* Duration */}
        <td className="px-3 py-3 mono text-sm text-text-secondary text-center whitespace-nowrap">
          {formatDuration(durationMs)}
        </td>

        {/* Close Reason */}
        <td className="px-3 py-3 text-sm text-text-secondary max-w-[200px]">
          <span className="truncate block">
            {issue.close_reason || <span className="text-text-muted italic">—</span>}
          </span>
        </td>

        {/* Expand indicator */}
        <td className="px-3 py-3">
          <svg
            className={cn(
              'w-4 h-4 text-text-muted transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </td>
      </tr>

      {/* Expanded row with full details */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="p-4 bg-bg-tertiary/20 border-b border-border">
              <AssignmentComparison original={originalIssue} final={issue} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "2h 30m", "45m", "1d 4h"
 */
function formatDuration(ms: number): string {
  if (ms < 0) return '—'
  if (ms === 0) return '0m'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return `${minutes}m`
}
