import type { Issue } from '@/types'
import { cn, getStatusIcon, getStatusBadgeClass, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

interface AssignmentComparisonProps {
  /** The original state of the issue when it was dispatched/assigned */
  original: Issue
  /** The final state of the issue when it was closed */
  final: Issue
  /** Optional CSS class name */
  className?: string
}

/**
 * Checks if two values are different, handling arrays and nullish values.
 */
function isDifferent(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true
    return a.some((item, i) => item !== b[i])
  }
  return a !== b
}

/**
 * Field display component with optional diff highlighting.
 */
function ComparisonField({
  label,
  originalValue,
  finalValue,
  renderValue,
  mono = false,
}: {
  label: string
  originalValue: unknown
  finalValue: unknown
  renderValue?: (value: unknown) => React.ReactNode
  mono?: boolean
}) {
  const hasDiff = isDifferent(originalValue, finalValue)
  const render = renderValue || ((v: unknown) => String(v ?? '—'))

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Original (left) */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
        <div
          className={cn(
            'px-3 py-2 rounded-md',
            'bg-bg-primary/50 border',
            hasDiff ? 'border-status-blocked/50 bg-status-blocked/5' : 'border-border/50',
            mono && 'font-mono text-sm'
          )}
        >
          {render(originalValue)}
        </div>
      </div>

      {/* Final (right) */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
        <div
          className={cn(
            'px-3 py-2 rounded-md',
            'bg-bg-primary/50 border',
            hasDiff ? 'border-status-closed/50 bg-status-closed/5' : 'border-border/50',
            mono && 'font-mono text-sm'
          )}
        >
          {render(finalValue)}
        </div>
      </div>
    </div>
  )
}

/**
 * Status field with icon and badge styling.
 */
function StatusDisplay({ status }: { status: string }) {
  const badgeClass = getStatusBadgeClass(status)
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-6 h-6 rounded-full border',
          'text-sm flex-shrink-0',
          badgeClass
        )}
      >
        {getStatusIcon(status)}
      </span>
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </div>
  )
}

/**
 * Priority field with badge styling.
 */
function PriorityDisplay({ priority }: { priority: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('text-xs px-1.5 py-0.5 rounded', getPriorityBadgeClass(priority))}>
        {getPriorityLabel(priority)}
      </span>
      <span className="text-text-secondary text-sm">
        {priority === 0
          ? 'Critical'
          : priority === 1
            ? 'High'
            : priority === 2
              ? 'Medium'
              : priority === 3
                ? 'Low'
                : 'Minimal'}
      </span>
    </div>
  )
}

/**
 * Labels display with diff highlighting for added/removed labels.
 */
function LabelsDisplay({
  labels,
  comparisonLabels,
  isOriginal,
}: {
  labels: string[]
  comparisonLabels: string[]
  isOriginal: boolean
}) {
  if (!labels || labels.length === 0) {
    return <span className="text-text-muted italic">No labels</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => {
        const existsInComparison = comparisonLabels?.includes(label)
        // If original side and label doesn't exist in final -> removed (red)
        // If final side and label doesn't exist in original -> added (green)
        const isRemoved = isOriginal && !existsInComparison
        const isAdded = !isOriginal && !existsInComparison

        return (
          <span
            key={label}
            className={cn(
              'text-xs px-2 py-1 rounded',
              isRemoved && 'bg-status-blocked/20 text-status-blocked line-through',
              isAdded && 'bg-status-closed/20 text-status-closed',
              !isRemoved && !isAdded && 'bg-bg-tertiary text-text-secondary'
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

/**
 * AssignmentComparison displays a side-by-side view comparing the original
 * assignment state of an issue with its final closed state.
 *
 * Left side shows the original state (when dispatched).
 * Right side shows the final state (when closed).
 * Differences are highlighted with red (removed/original) and green (added/final) styling.
 */
export function AssignmentComparison({ original, final, className }: AssignmentComparisonProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with column labels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-status-blocked/30 border border-status-blocked/50" />
          <span className="section-header">Original Assignment</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-status-closed/30 border border-status-closed/50" />
          <span className="section-header">Final State</span>
        </div>
      </div>

      {/* Issue ID (should be the same) */}
      <ComparisonField
        label="Issue ID"
        originalValue={original.id}
        finalValue={final.id}
        mono
      />

      {/* Title */}
      <ComparisonField
        label="Title"
        originalValue={original.title}
        finalValue={final.title}
        renderValue={(v) => (
          <span className="text-lg font-medium text-text-primary">{String(v) || '—'}</span>
        )}
      />

      {/* Status */}
      <ComparisonField
        label="Status"
        originalValue={original.status}
        finalValue={final.status}
        renderValue={(v) => <StatusDisplay status={String(v)} />}
      />

      {/* Priority */}
      <ComparisonField
        label="Priority"
        originalValue={original.priority}
        finalValue={final.priority}
        renderValue={(v) => <PriorityDisplay priority={Number(v)} />}
      />

      {/* Description */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Description</span>
          <div
            className={cn(
              'px-3 py-2 rounded-md min-h-[80px]',
              'bg-bg-primary/50 border whitespace-pre-wrap',
              isDifferent(original.description, final.description)
                ? 'border-status-blocked/50 bg-status-blocked/5'
                : 'border-border/50'
            )}
          >
            {original.description || <span className="text-text-muted italic">No description</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Description</span>
          <div
            className={cn(
              'px-3 py-2 rounded-md min-h-[80px]',
              'bg-bg-primary/50 border whitespace-pre-wrap',
              isDifferent(original.description, final.description)
                ? 'border-status-closed/50 bg-status-closed/5'
                : 'border-border/50'
            )}
          >
            {final.description || <span className="text-text-muted italic">No description</span>}
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Labels</span>
          <div
            className={cn(
              'px-3 py-2 rounded-md',
              'bg-bg-primary/50 border',
              isDifferent(original.labels, final.labels)
                ? 'border-status-blocked/50 bg-status-blocked/5'
                : 'border-border/50'
            )}
          >
            <LabelsDisplay
              labels={original.labels || []}
              comparisonLabels={final.labels || []}
              isOriginal={true}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Labels</span>
          <div
            className={cn(
              'px-3 py-2 rounded-md',
              'bg-bg-primary/50 border',
              isDifferent(original.labels, final.labels)
                ? 'border-status-closed/50 bg-status-closed/5'
                : 'border-border/50'
            )}
          >
            <LabelsDisplay
              labels={final.labels || []}
              comparisonLabels={original.labels || []}
              isOriginal={false}
            />
          </div>
        </div>
      </div>

      {/* Assignee */}
      <ComparisonField
        label="Assignee"
        originalValue={original.assignee}
        finalValue={final.assignee}
        renderValue={(v): React.ReactNode => v as React.ReactNode || <span className="text-text-muted italic">Unassigned</span>}
      />

      {/* Close reason (only relevant for final) */}
      {final.close_reason && (
        <>
          <div className="divider-accent" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-muted uppercase tracking-wide">Close Reason</span>
            <div className="px-3 py-2 rounded-md bg-status-closed/10 border border-status-closed/30 text-text-primary">
              {final.close_reason}
            </div>
          </div>
        </>
      )}

      {/* Timestamps */}
      <div className="divider-accent" />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Assigned At</span>
          <div className="px-3 py-2 rounded-md bg-bg-primary/50 border border-border/50 text-text-muted font-mono text-sm">
            {original.created_at ? new Date(original.created_at).toLocaleString() : '—'}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Closed At</span>
          <div className="px-3 py-2 rounded-md bg-bg-primary/50 border border-border/50 text-text-muted font-mono text-sm">
            {final.closed_at ? new Date(final.closed_at).toLocaleString() : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
