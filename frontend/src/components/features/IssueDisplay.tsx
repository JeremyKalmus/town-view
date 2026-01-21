import type { Issue } from '@/types'
import { cn, formatDate, getStatusIcon, getStatusBadgeClass, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

interface IssueDisplayProps {
  issue: Issue
  className?: string
}

/**
 * Read-only field component for displaying non-editable issue data.
 * Styled with muted appearance to indicate the field cannot be edited.
 */
function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      <div className={cn(
        'px-3 py-2 rounded-md',
        'bg-bg-primary/50 border border-border/50',
        'text-text-muted',
        mono && 'font-mono text-sm'
      )}>
        {value || '—'}
      </div>
    </div>
  )
}

/**
 * Editable field wrapper component.
 * Styled to indicate the field can be edited (used in display mode here, editing in separate component).
 */
function EditableField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary uppercase tracking-wide">{label}</span>
      <div className={cn(
        'px-3 py-2 rounded-md',
        'bg-bg-secondary border border-border',
        'text-text-primary'
      )}>
        {children}
      </div>
    </div>
  )
}

/**
 * IssueDisplay component shows full issue details with clear distinction
 * between read-only and editable fields.
 *
 * Read-only fields: id, created_at, created_by
 * Editable fields: status, priority, title, description, labels, assignee, type
 */
export function IssueDisplay({ issue, className }: IssueDisplayProps) {
  const statusBadgeClass = getStatusBadgeClass(issue.status)

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with ID and type */}
      <div className="flex items-center justify-between">
        <span className="mono text-text-muted">{issue.id}</span>
        <span className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary">
          {issue.issue_type}
        </span>
      </div>

      {/* Title - Editable */}
      <EditableField label="Title">
        <span className="text-lg font-medium">{issue.title}</span>
      </EditableField>

      {/* Status and Priority row - Editable */}
      <div className="grid grid-cols-2 gap-4">
        <EditableField label="Status">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center justify-center',
              'w-6 h-6 rounded-full border',
              'text-sm flex-shrink-0',
              statusBadgeClass
            )}>
              {getStatusIcon(issue.status)}
            </span>
            <span className="capitalize">{issue.status.replace('_', ' ')}</span>
          </div>
        </EditableField>

        <EditableField label="Priority">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-1.5 py-0.5 rounded', getPriorityBadgeClass(issue.priority))}>
              {getPriorityLabel(issue.priority)}
            </span>
            <span className="text-text-secondary text-sm">
              {issue.priority === 0 ? 'Critical' :
               issue.priority === 1 ? 'High' :
               issue.priority === 2 ? 'Medium' :
               issue.priority === 3 ? 'Low' : 'Minimal'}
            </span>
          </div>
        </EditableField>
      </div>

      {/* Description - Editable */}
      <EditableField label="Description">
        <div className="min-h-[80px] whitespace-pre-wrap">
          {issue.description || <span className="text-text-muted italic">No description</span>}
        </div>
      </EditableField>

      {/* Labels - Editable */}
      <EditableField label="Labels">
        {issue.labels && issue.labels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {issue.labels.map((label) => (
              <span
                key={label}
                className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-text-muted italic">No labels</span>
        )}
      </EditableField>

      {/* Assignee - Editable */}
      <EditableField label="Assignee">
        {issue.assignee || <span className="text-text-muted italic">Unassigned</span>}
      </EditableField>

      {/* Divider */}
      <div className="divider-accent" />

      {/* Read-only metadata section */}
      <div className="space-y-1">
        <span className="section-header">Metadata</span>
        <p className="text-xs text-text-muted">These fields are read-only and cannot be edited.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReadOnlyField label="Issue ID" value={issue.id} mono />
        <ReadOnlyField label="Type" value={issue.issue_type} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReadOnlyField label="Created At" value={issue.created_at ? formatDate(issue.created_at) : '—'} />
        <ReadOnlyField label="Created By" value={issue.created_by || '—'} />
      </div>

      {/* Additional read-only info */}
      <div className="grid grid-cols-2 gap-4">
        <ReadOnlyField label="Updated At" value={issue.updated_at ? formatDate(issue.updated_at) : '—'} />
        <ReadOnlyField label="Owner" value={issue.owner || '—'} />
      </div>

      {/* Dependencies count - read-only */}
      <div className="grid grid-cols-2 gap-4">
        <ReadOnlyField label="Blocks" value={`${issue.dependent_count} issue${issue.dependent_count !== 1 ? 's' : ''}`} />
        <ReadOnlyField label="Blocked By" value={`${issue.dependency_count} issue${issue.dependency_count !== 1 ? 's' : ''}`} />
      </div>
    </div>
  )
}
