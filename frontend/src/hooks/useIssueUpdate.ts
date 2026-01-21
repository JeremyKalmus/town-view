/**
 * Hook for updating issues via bd CLI backend.
 * Handles API calls, success/error toasts, and panel close callbacks.
 */

import { useState, useCallback } from 'react'
import type { Issue, IssueUpdate } from '@/types'
import { updateIssue } from '@/services/api'
import { showSuccessToast, showErrorToast } from '@/stores/toast-store'

export interface UseIssueUpdateOptions {
  /** Callback when update succeeds - use to close panel */
  onSuccess?: (issue: Issue) => void
  /** Callback when update fails */
  onError?: (error: string) => void
}

export interface UseIssueUpdateResult {
  /** Execute the update */
  update: (rigId: string, issueId: string, changes: IssueUpdate) => Promise<boolean>
  /** Whether an update is in progress */
  isUpdating: boolean
  /** Last error message if any */
  error: string | null
}

/**
 * Hook for updating issues with bd CLI integration.
 *
 * @example
 * ```tsx
 * const { update, isUpdating } = useIssueUpdate({
 *   onSuccess: (issue) => {
 *     closePanel()
 *   }
 * })
 *
 * const handleConfirm = async () => {
 *   await update(rigId, issueId, changedFields)
 * }
 * ```
 */
export function useIssueUpdate(options: UseIssueUpdateOptions = {}): UseIssueUpdateResult {
  const { onSuccess, onError } = options
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(
    async (rigId: string, issueId: string, changes: IssueUpdate): Promise<boolean> => {
      // Don't allow concurrent updates
      if (isUpdating) {
        return false
      }

      setIsUpdating(true)
      setError(null)

      const result = await updateIssue(rigId, issueId, changes)

      if (result.success && result.issue) {
        showSuccessToast('Issue updated', `${issueId} has been saved`)
        onSuccess?.(result.issue)
        setIsUpdating(false)
        return true
      } else {
        const errorMessage = result.error?.message || 'Failed to update issue'
        setError(errorMessage)
        showErrorToast('Update failed', errorMessage)
        onError?.(errorMessage)
        setIsUpdating(false)
        return false
      }
    },
    [isUpdating, onSuccess, onError]
  )

  return {
    update,
    isUpdating,
    error,
  }
}

/**
 * Build IssueUpdate from original and edited issue objects.
 * Only includes fields that have changed.
 */
export function buildIssueUpdate(original: Issue, edited: Partial<Issue>): IssueUpdate {
  const update: IssueUpdate = {}

  if (edited.status !== undefined && edited.status !== original.status) {
    update.status = edited.status
  }

  if (edited.priority !== undefined && edited.priority !== original.priority) {
    update.priority = edited.priority
  }

  if (edited.title !== undefined && edited.title !== original.title) {
    update.title = edited.title
  }

  if (edited.description !== undefined && edited.description !== original.description) {
    update.description = edited.description
  }

  if (edited.assignee !== undefined && edited.assignee !== original.assignee) {
    update.assignee = edited.assignee
  }

  if (edited.labels !== undefined) {
    const originalLabels = original.labels || []
    const editedLabels = edited.labels || []

    // Check if labels have changed
    const labelsChanged =
      originalLabels.length !== editedLabels.length ||
      !originalLabels.every((label) => editedLabels.includes(label))

    if (labelsChanged) {
      update.labels = editedLabels
    }
  }

  return update
}

/**
 * Check if there are any changes between original and edited issue.
 */
export function hasChanges(original: Issue, edited: Partial<Issue>): boolean {
  const update = buildIssueUpdate(original, edited)
  return Object.keys(update).length > 0
}

/**
 * Format field changes for diff display.
 */
export interface FieldChange {
  field: string
  label: string
  oldValue: string
  newValue: string
}

export function getFieldChanges(original: Issue, edited: Partial<Issue>): FieldChange[] {
  const changes: FieldChange[] = []

  if (edited.status !== undefined && edited.status !== original.status) {
    changes.push({
      field: 'status',
      label: 'Status',
      oldValue: original.status,
      newValue: edited.status,
    })
  }

  if (edited.priority !== undefined && edited.priority !== original.priority) {
    changes.push({
      field: 'priority',
      label: 'Priority',
      oldValue: `P${original.priority}`,
      newValue: `P${edited.priority}`,
    })
  }

  if (edited.title !== undefined && edited.title !== original.title) {
    changes.push({
      field: 'title',
      label: 'Title',
      oldValue: original.title,
      newValue: edited.title,
    })
  }

  if (edited.description !== undefined && edited.description !== original.description) {
    changes.push({
      field: 'description',
      label: 'Description',
      oldValue: original.description || '(empty)',
      newValue: edited.description || '(empty)',
    })
  }

  if (edited.assignee !== undefined && edited.assignee !== original.assignee) {
    changes.push({
      field: 'assignee',
      label: 'Assignee',
      oldValue: original.assignee || '(unassigned)',
      newValue: edited.assignee || '(unassigned)',
    })
  }

  if (edited.labels !== undefined) {
    const originalLabels = original.labels || []
    const editedLabels = edited.labels || []

    const labelsChanged =
      originalLabels.length !== editedLabels.length ||
      !originalLabels.every((label) => editedLabels.includes(label))

    if (labelsChanged) {
      changes.push({
        field: 'labels',
        label: 'Labels',
        oldValue: originalLabels.join(', ') || '(none)',
        newValue: editedLabels.join(', ') || '(none)',
      })
    }
  }

  return changes
}
