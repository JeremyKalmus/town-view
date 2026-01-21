import { useEffect, useState, useCallback } from 'react'
import type { Issue, IssueDependencies } from '@/types'
import { cachedFetch } from '@/services/cache'
import { cn, getStatusIcon, getStatusBadgeClass, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

interface DependenciesTabProps {
  rigId: string
  issueId: string
  onIssueClick?: (issueId: string) => void
}

interface AddDependencyModalProps {
  rigId: string
  issueId: string
  existingBlockerIds: string[]
  onAdd: (blockerId: string) => void
  onClose: () => void
}

interface ConfirmRemoveModalProps {
  issue: Issue
  onConfirm: () => void
  onCancel: () => void
}

function DependencyItem({
  issue,
  onRemove,
  onClick,
}: {
  issue: Issue
  onRemove?: () => void
  onClick?: () => void
}) {
  const statusBadgeClass = getStatusBadgeClass(issue.status)

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-2 -mx-2 rounded-md transition-colors group',
        onClick && 'cursor-pointer hover:bg-bg-tertiary'
      )}
      onClick={onClick}
    >
      {/* Priority badge */}
      <span className={cn('w-8 flex-shrink-0 text-xs', getPriorityBadgeClass(issue.priority))}>
        {getPriorityLabel(issue.priority)}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full border',
          'text-xs',
          'flex-shrink-0',
          statusBadgeClass
        )}
      >
        {getStatusIcon(issue.status)}
      </span>

      {/* Issue ID */}
      <span className="mono text-text-muted w-20 flex-shrink-0 truncate text-sm">
        {issue.id}
      </span>

      {/* Title */}
      <span className="flex-1 min-w-0 truncate text-sm">{issue.title}</span>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-blocked transition-opacity text-xs px-2 py-1"
          title="Remove dependency"
        >
          Remove
        </button>
      )}
    </div>
  )
}

function AddDependencyModal({
  rigId,
  issueId,
  existingBlockerIds,
  onAdd,
  onClose,
}: AddDependencyModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllIssues = async () => {
      const url = `/api/rigs/${rigId}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        // Filter out current issue and existing blockers
        const filtered = result.data.filter(
          (issue: Issue) =>
            issue.id !== issueId && !existingBlockerIds.includes(issue.id)
        )
        setIssues(filtered)
      }
      setLoading(false)
    }

    fetchAllIssues()
  }, [rigId, issueId, existingBlockerIds])

  const filteredIssues = issues.filter(
    (issue) =>
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Add Dependency</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            &times;
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-rust"
            autoFocus
          />
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="text-center text-text-muted py-4">Loading...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center text-text-muted py-4">No issues found</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors"
                  onClick={() => onAdd(issue.id)}
                >
                  <span
                    className={cn(
                      'w-6 flex-shrink-0 text-xs',
                      getPriorityBadgeClass(issue.priority)
                    )}
                  >
                    {getPriorityLabel(issue.priority)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center',
                      'w-5 h-5 rounded-full border',
                      'text-xs',
                      'flex-shrink-0',
                      getStatusBadgeClass(issue.status)
                    )}
                  >
                    {getStatusIcon(issue.status)}
                  </span>
                  <span className="mono text-text-muted w-20 flex-shrink-0 truncate text-sm">
                    {issue.id}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm">
                    {issue.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfirmRemoveModal({ issue, onConfirm, onCancel }: ConfirmRemoveModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="font-semibold mb-4">Remove Dependency</h3>
        <p className="text-text-secondary mb-4">
          Are you sure you want to remove the dependency on{' '}
          <span className="mono text-text-primary">{issue.id}</span>?
        </p>
        <p className="text-sm text-text-muted mb-6">{issue.title}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md bg-status-blocked text-white hover:bg-status-blocked/80 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function DependenciesTab({ rigId, issueId, onIssueClick }: DependenciesTabProps) {
  const [dependencies, setDependencies] = useState<IssueDependencies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState<Issue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchDependencies = useCallback(async () => {
    setLoading(true)
    setError(null)

    const url = `/api/rigs/${rigId}/issues/${issueId}/dependencies`
    const result = await cachedFetch<IssueDependencies>(url, {
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      returnStaleOnError: true,
    })

    if (result.data) {
      setDependencies(result.data)
      setLoading(false)
      if (result.fromCache && result.error) {
        console.warn('[IssueDeps] Using cached data:', result.error)
      } else {
        setError(null)
      }
    } else if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }, [rigId, issueId])

  useEffect(() => {
    fetchDependencies()
  }, [fetchDependencies])

  const handleAddDependency = async (blockerId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/rigs/${rigId}/issues/${issueId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocker_id: blockerId }),
      })
      if (!res.ok) throw new Error('Failed to add dependency')
      setShowAddModal(false)
      fetchDependencies()
    } catch (err) {
      console.error('Failed to add dependency:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveDependency = async (blockerId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/rigs/${rigId}/issues/${issueId}/dependencies/${blockerId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to remove dependency')
      setRemoveConfirm(null)
      fetchDependencies()
    } catch (err) {
      console.error('Failed to remove dependency:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-text-muted">Loading dependencies...</div>
  }

  if (error) {
    return <div className="p-4 text-status-blocked">{error}</div>
  }

  const blockers = dependencies?.blockers || []
  const blockedBy = dependencies?.blocked_by || []

  return (
    <div className="p-4">
      {/* Blockers section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Blocked By ({blockers.length})
          </h4>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-accent-rust text-white hover:bg-accent-rust/80 transition-colors"
            disabled={isSubmitting}
          >
            + Add Blocker
          </button>
        </div>
        {blockers.length === 0 ? (
          <p className="text-sm text-text-muted">No blockers</p>
        ) : (
          <div className="card">
            {blockers.map((issue) => (
              <DependencyItem
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick?.(issue.id)}
                onRemove={() => setRemoveConfirm(issue)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Blocked By section */}
      <div>
        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Blocks ({blockedBy.length})
        </h4>
        {blockedBy.length === 0 ? (
          <p className="text-sm text-text-muted">Not blocking any issues</p>
        ) : (
          <div className="card">
            {blockedBy.map((issue) => (
              <DependencyItem
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick?.(issue.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Dependency Modal */}
      {showAddModal && (
        <AddDependencyModal
          rigId={rigId}
          issueId={issueId}
          existingBlockerIds={blockers.map((b) => b.id)}
          onAdd={handleAddDependency}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Confirm Remove Modal */}
      {removeConfirm && (
        <ConfirmRemoveModal
          issue={removeConfirm}
          onConfirm={() => handleRemoveDependency(removeConfirm.id)}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}
    </div>
  )
}
