import { useEffect, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { Issue, IssueUpdate } from '@/types'

export interface DiffEntry {
  field: string
  oldValue: string | undefined
  newValue: string | undefined
}

export interface ConfirmationModalProps {
  /** The issue being updated */
  issue: Issue
  /** The changes to apply */
  changes: IssueUpdate
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when user confirms changes */
  onConfirm: () => void
  /** Callback when user cancels */
  onCancel: () => void
  /** Whether a save operation is in progress */
  isSaving?: boolean
}

/**
 * Format a value for display in the diff
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(none)'
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '(none)'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}

/**
 * Get human-readable field name
 */
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    status: 'Status',
    priority: 'Priority',
    title: 'Title',
    description: 'Description',
    assignee: 'Assignee',
    labels: 'Labels',
  }
  return labels[field] || field
}

/**
 * Format priority for display
 */
function formatPriority(priority: number | undefined): string {
  if (priority === undefined) return '(none)'
  return `P${priority}`
}

/**
 * Calculate diff between original issue and changes
 */
export function calculateDiff(issue: Issue, changes: IssueUpdate): DiffEntry[] {
  const diff: DiffEntry[] = []

  if (changes.status !== undefined && changes.status !== issue.status) {
    diff.push({
      field: 'status',
      oldValue: issue.status,
      newValue: changes.status,
    })
  }

  if (changes.priority !== undefined && changes.priority !== issue.priority) {
    diff.push({
      field: 'priority',
      oldValue: formatPriority(issue.priority),
      newValue: formatPriority(changes.priority),
    })
  }

  if (changes.title !== undefined && changes.title !== issue.title) {
    diff.push({
      field: 'title',
      oldValue: issue.title,
      newValue: changes.title,
    })
  }

  if (changes.description !== undefined && changes.description !== issue.description) {
    diff.push({
      field: 'description',
      oldValue: issue.description || '(empty)',
      newValue: changes.description || '(empty)',
    })
  }

  if (changes.assignee !== undefined && changes.assignee !== issue.assignee) {
    diff.push({
      field: 'assignee',
      oldValue: issue.assignee || '(unassigned)',
      newValue: changes.assignee || '(unassigned)',
    })
  }

  if (changes.labels !== undefined) {
    const oldLabels = issue.labels?.slice().sort().join(', ') || '(none)'
    const newLabels = changes.labels.slice().sort().join(', ') || '(none)'
    if (oldLabels !== newLabels) {
      diff.push({
        field: 'labels',
        oldValue: oldLabels,
        newValue: newLabels,
      })
    }
  }

  return diff
}

/**
 * Confirmation modal with diff preview for issue updates.
 * Shows a detailed diff of changes before saving.
 */
export function ConfirmationModal({
  issue,
  changes,
  isOpen,
  onConfirm,
  onCancel,
  isSaving = false,
}: ConfirmationModalProps) {
  // Calculate diff entries
  const diffEntries = calculateDiff(issue, changes)

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onCancel()
      }
    },
    [onCancel, isSaving]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // If no changes, show a message
  if (diffEntries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={!isSaving ? onCancel : undefined}
        />

        {/* Modal */}
        <div className="relative bg-bg-secondary border border-border rounded-xl shadow-lg max-w-md w-full mx-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-warning" />
              <h2 className="text-lg font-semibold text-text-primary">No Changes</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-bg-tertiary text-text-secondary"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-text-secondary">
              No changes detected for <span className="font-mono text-text-primary">{issue.id}</span>.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-border">
            <button onClick={onCancel} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isSaving ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-xl shadow-lg max-w-lg w-full mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent-warning" />
            <h2 className="text-lg font-semibold text-text-primary">Confirm Changes</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary"
            disabled={isSaving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-text-secondary mb-4">
            You are about to update{' '}
            <span className="font-mono text-text-primary">{issue.id}</span>:
          </p>

          {/* Diff preview */}
          <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-text-muted font-medium">Field</th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">Old</th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">New</th>
                </tr>
              </thead>
              <tbody>
                {diffEntries.map((entry) => (
                  <tr key={entry.field} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-text-secondary font-medium">
                      {getFieldLabel(entry.field)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-status-blocked line-through">
                        {formatValue(entry.oldValue)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-status-closed">
                        {formatValue(entry.newValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Confirm Update'}
          </button>
        </div>
      </div>
    </div>
  )
}
