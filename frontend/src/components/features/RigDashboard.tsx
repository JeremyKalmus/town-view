import { useEffect, useState } from 'react'
import type { Rig, Issue } from '@/types'
import { IssueRow } from './IssueRow'
import { cn } from '@/lib/utils'

interface RigDashboardProps {
  rig: Rig
  refreshKey?: number
}

export function RigDashboard({ rig, refreshKey = 0 }: RigDashboardProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    } else {
      params.set('all', 'true')
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
  }, [rig.id, statusFilter, refreshKey])

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
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-text-secondary">Filter:</span>
        {['all', 'open', 'in_progress', 'blocked', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-1 rounded-md text-sm transition-colors',
              statusFilter === status
                ? 'bg-accent-rust text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            )}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
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
