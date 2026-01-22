import { useMemo } from 'react'
import type { Issue, IssueStatus, IssueType } from '@/types'
import { cn } from '@/lib/class-utils'
import { getStatusBadgeClass, getStatusIcon } from '@/lib/status-utils'
import { HIDDEN_TYPES } from './FilterBar'

/** Filter values for status or type selection */
export interface KPIFilter {
  status?: IssueStatus
  type?: IssueType
}

interface KPISummaryProps {
  issues: Issue[]
  /** Currently active filter */
  activeFilter?: KPIFilter
  /** Callback when a chip is clicked to apply filter */
  onFilterChange?: (filter: KPIFilter | null) => void
  className?: string
}

/** Status labels for display */
const STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  deferred: 'Deferred',
  closed: 'Closed',
  tombstone: 'Tombstone',
}

/** Type labels for display */
const TYPE_LABELS: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
  epic: 'Epic',
  chore: 'Chore',
  'merge-request': 'MR',
  molecule: 'Molecule',
  gate: 'Gate',
  convoy: 'Convoy',
  agent: 'Agent',
  event: 'Event',
  rig: 'Rig',
}

/** Status display order */
const STATUS_ORDER: IssueStatus[] = [
  'blocked',
  'in_progress',
  'open',
  'deferred',
  'closed',
  'tombstone',
]

/** Type display order (excludes hidden system types) */
const TYPE_ORDER: IssueType[] = [
  'epic',
  'feature',
  'task',
  'bug',
  'chore',
]

/**
 * KPISummary displays issue type and status counts as clickable chips.
 * Chips filter the view when clicked, with active filter highlighted.
 */
export function KPISummary({
  issues,
  activeFilter,
  onFilterChange,
  className,
}: KPISummaryProps) {
  // Filter out hidden types (system-level beads like agent, molecule, etc.)
  const visibleIssues = useMemo(() => {
    return issues.filter(issue => !HIDDEN_TYPES.includes(issue.issue_type))
  }, [issues])

  // Count visible issues by status
  const statusCounts = useMemo(() => {
    const counts = new Map<IssueStatus, number>()
    for (const issue of visibleIssues) {
      counts.set(issue.status, (counts.get(issue.status) || 0) + 1)
    }
    return counts
  }, [visibleIssues])

  // Count visible issues by type
  const typeCounts = useMemo(() => {
    const counts = new Map<IssueType, number>()
    for (const issue of visibleIssues) {
      counts.set(issue.issue_type, (counts.get(issue.issue_type) || 0) + 1)
    }
    return counts
  }, [visibleIssues])

  const handleStatusClick = (status: IssueStatus) => {
    if (activeFilter?.status === status) {
      // Clicking active filter clears it
      onFilterChange?.(null)
    } else {
      onFilterChange?.({ status })
    }
  }

  const handleTypeClick = (type: IssueType) => {
    if (activeFilter?.type === type) {
      // Clicking active filter clears it
      onFilterChange?.(null)
    } else {
      onFilterChange?.({ type })
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted uppercase tracking-wide mr-1">
          Status
        </span>
        {STATUS_ORDER.map((status) => {
          const count = statusCounts.get(status) || 0
          if (count === 0) return null
          const isActive = activeFilter?.status === status
          return (
            <StatusChip
              key={status}
              status={status}
              count={count}
              isActive={isActive}
              onClick={() => handleStatusClick(status)}
            />
          )
        })}
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted uppercase tracking-wide mr-1">
          Type
        </span>
        {TYPE_ORDER.map((type) => {
          const count = typeCounts.get(type) || 0
          if (count === 0) return null
          const isActive = activeFilter?.type === type
          return (
            <TypeChip
              key={type}
              type={type}
              count={count}
              isActive={isActive}
              onClick={() => handleTypeClick(type)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface StatusChipProps {
  status: IssueStatus
  count: number
  isActive: boolean
  onClick: () => void
}

function StatusChip({ status, count, isActive, onClick }: StatusChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs',
        'transition-all duration-150',
        'hover:scale-105 active:scale-95',
        getStatusBadgeClass(status),
        isActive && 'ring-2 ring-offset-1 ring-offset-bg-primary ring-current'
      )}
      title={`Filter by ${STATUS_LABELS[status]}`}
    >
      <span>{getStatusIcon(status)}</span>
      <span>{STATUS_LABELS[status]}</span>
      <span className="mono font-semibold">{count}</span>
    </button>
  )
}

interface TypeChipProps {
  type: IssueType
  count: number
  isActive: boolean
  onClick: () => void
}

function TypeChip({ type, count, isActive, onClick }: TypeChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs',
        'transition-all duration-150',
        'hover:scale-105 active:scale-95',
        'bg-bg-tertiary text-text-secondary border-border',
        'hover:bg-bg-secondary hover:text-text-primary',
        isActive && 'ring-2 ring-offset-1 ring-offset-bg-primary ring-accent-rust bg-accent-rust/10 text-text-primary border-accent-rust/30'
      )}
      title={`Filter by ${TYPE_LABELS[type]}`}
    >
      <span>{TYPE_LABELS[type]}</span>
      <span className="mono font-semibold">{count}</span>
    </button>
  )
}
