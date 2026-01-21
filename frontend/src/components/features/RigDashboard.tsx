import { useEffect, useState } from 'react'
import type { Rig, Issue, IssueStatus, IssueType } from '@/types'
import { IssueRow } from './IssueRow'
import { cn } from '@/lib/utils'

interface RigDashboardProps {
  rig: Rig
  refreshKey?: number
}

const STATUS_OPTIONS: Array<{ value: IssueStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
]

const TYPE_OPTIONS: Array<{ value: IssueType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'epic', label: 'Epic' },
  { value: 'chore', label: 'Chore' },
]

export function RigDashboard({ rig, refreshKey = 0 }: RigDashboardProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    } else {
      params.set('all', 'true')
    }
    if (typeFilter !== 'all') {
      params.set('type', typeFilter)
    }

    fetch(`/api/rigs/${rig.id}/issues?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch issues')
        return res.json()
      })
      .then((data) => {
        setIssues(data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [rig.id, statusFilter, typeFilter, refreshKey])

  // Group issues by status for summary
  const statusCounts = issues.reduce(
    (acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          {rig.name.toUpperCase()}
        </h1>
        <p className="text-text-muted text-sm">
          Prefix: <span className="mono">{rig.prefix}</span> &middot; Path: {rig.path}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Issues"
          value={issues.length}
          color="text-text-primary"
        />
        <StatCard
          label="Open"
          value={statusCounts['open'] || 0}
          color="text-status-open"
        />
        <StatCard
          label="In Progress"
          value={statusCounts['in_progress'] || 0}
          color="text-status-in-progress"
        />
        <StatCard
          label="Closed"
          value={statusCounts['closed'] || 0}
          color="text-status-closed"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-text-secondary">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus | 'all')}
            className="bg-bg-tertiary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-rust"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm text-text-secondary">
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as IssueType | 'all')}
            className="bg-bg-tertiary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-rust"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issue list */}
      <div className="card">
        <div className="border-b border-border pb-2 mb-2">
          <h2 className="section-header">ISSUES</h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-text-muted">Loading issues...</div>
        ) : error ? (
          <div className="py-8 text-center text-status-blocked">{error}</div>
        ) : issues.length === 0 ? (
          <div className="py-8 text-center text-text-muted">No issues found</div>
        ) : (
          <div className="divide-y divide-border">
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  color: string
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="card">
      <div className="text-sm text-text-secondary mb-1">{label}</div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  )
}
