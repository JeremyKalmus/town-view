import { useEffect, useState, useRef, useCallback } from 'react'
import type { Rig, Issue, IssueStatus, IssueType, Dependency, Agent } from '@/types'
import { IssueRow } from './IssueRow'
import { AgentCard } from './AgentCard'
import { DependencyArrows } from './DependencyArrows'
import { SkeletonIssueList, SkeletonStatGrid, VirtualList } from "@/components/ui"
import { cachedFetch } from "@/services/cache"
import { cn } from '@/lib/class-utils'

interface RigDashboardProps {
  rig: Rig
  refreshKey?: number
  updatedIssueIds?: Set<string>
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

// Fixed height for issue rows (px) - accommodates rows with labels
const ISSUE_ROW_HEIGHT = 56

export function RigDashboard({ rig, refreshKey = 0, updatedIssueIds = new Set() }: RigDashboardProps) {
  const [allIssues, setAllIssues] = useState<Issue[]>([]) // All issues for KPI stats
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]) // Filtered for display
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')
  const [showArrows, setShowArrows] = useState(false)
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const nodeRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Callback to set node ref
  const setNodeRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      nodeRefs.current.set(id, element)
    } else {
      nodeRefs.current.delete(id)
    }
  }, [])

  // Track if this is the initial load or a rig change (vs just a refresh or filter change)
  const isInitialLoadRef = useRef(true)
  const prevRigIdRef = useRef(rig.id)

  // Fetch ALL issues for KPI stats (unfiltered)
  useEffect(() => {
    const rigChanged = prevRigIdRef.current !== rig.id

    if (isInitialLoadRef.current || rigChanged) {
      setLoading(true)
      isInitialLoadRef.current = false
    }

    prevRigIdRef.current = rig.id
    setError(null)

    const fetchAllIssues = async () => {
      const url = `/api/rigs/${rig.id}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes for issues
        returnStaleOnError: true,
      })

      if (result.data) {
        setAllIssues(result.data)
        setLoading(false)
        if (result.fromCache && result.error) {
          console.warn('[Issues] Using cached data:', result.error)
        } else {
          setError(null)
        }
      } else if (result.error) {
        setError(result.error)
        setLoading(false)
      }
    }

    fetchAllIssues()
  }, [rig.id, refreshKey])

  // Apply filters client-side for display
  useEffect(() => {
    let filtered = allIssues

    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(issue => issue.issue_type === typeFilter)
    }

    setFilteredIssues(filtered)
  }, [allIssues, statusFilter, typeFilter])

  // Fetch agents for rig
  useEffect(() => {
    setAgentsLoading(true)

    const fetchAgents = async () => {
      const url = `/api/rigs/${rig.id}/agents`
      const result = await cachedFetch<Agent[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        setAgents(result.data)
        if (result.fromCache && result.error) {
          console.warn('[Agents] Using cached data:', result.error)
        }
      } else {
        console.error('Failed to fetch agents:', result.error)
        setAgents([])
      }
      setAgentsLoading(false)
    }

    fetchAgents()
  }, [rig.id, refreshKey])

  // Fetch dependencies when arrows are enabled
  useEffect(() => {
    if (!showArrows) {
      setDependencies([])
      return
    }

    const fetchDependencies = async () => {
      const url = `/api/rigs/${rig.id}/dependencies`
      const result = await cachedFetch<Dependency[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        setDependencies(result.data)
        if (result.fromCache && result.error) {
          console.warn('[Dependencies] Using cached data:', result.error)
        }
      } else {
        console.error('Failed to fetch dependencies:', result.error)
        setDependencies([])
      }
    }

    fetchDependencies()
  }, [rig.id, showArrows, refreshKey])

  // Group ALL issues by status for KPI summary (not affected by filters)
  const statusCounts = allIssues.reduce(
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

      {/* Agent Cards */}
      {agentsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-3" />
              <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-2" />
              <div className="h-8 bg-bg-tertiary rounded mt-3" />
            </div>
          ))}
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : null}

      {/* Stats */}
      {loading ? (
        <div className="mb-6">
          <SkeletonStatGrid />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Issues"
            value={allIssues.length}
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
      )}

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
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="show-arrows" className="text-sm text-text-secondary cursor-pointer">
            Dependencies:
          </label>
          <button
            id="show-arrows"
            onClick={() => setShowArrows(!showArrows)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md border transition-colors',
              showArrows
                ? 'bg-accent-rust/20 text-accent-rust border-accent-rust/30'
                : 'bg-bg-tertiary text-text-secondary border-border hover:border-text-muted'
            )}
          >
            {showArrows ? 'Hide Arrows' : 'Show Arrows'}
          </button>
        </div>
      </div>

      {/* Issue list */}
      <div className="card relative" ref={containerRef}>
        <div className="border-b border-border pb-2 mb-2">
          <h2 className="section-header">ISSUES</h2>
        </div>

        {loading ? (
          <SkeletonIssueList count={6} />
        ) : error ? (
          <div className="py-8 text-center text-status-blocked">{error}</div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            {allIssues.length === 0 ? 'No issues found' : 'No issues match the current filters'}
          </div>
        ) : (
          <VirtualList
            items={filteredIssues}
            itemHeight={ISSUE_ROW_HEIGHT}
            className="h-[600px]"
            getKey={(issue) => issue.id}
            renderItem={(issue) => (
              <div className="border-b border-border">
                <IssueRow
                  issue={issue}
                  isUpdated={updatedIssueIds.has(issue.id)}
                  nodeRef={(el) => setNodeRef(issue.id, el)}
                />
              </div>
            )}
          />
        )}

        {/* Dependency arrows overlay */}
        <DependencyArrows
          dependencies={dependencies}
          nodeRefs={nodeRefs.current}
          containerRef={containerRef}
          visible={showArrows}
        />
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
