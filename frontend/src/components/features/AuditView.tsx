import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRigStore } from '@/stores/rig-store'
import { cachedFetch } from '@/services/cache'
import { ConvoySelector, type ConvoySortBy } from './ConvoySelector'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { AgentFilter } from './AgentFilter'
import { MetricsDisplay } from './MetricsDisplay'
import { AssignmentComparison } from './AssignmentComparison'
import { getDescendants } from '@/lib/tree'
import type { Issue, AuditMetrics } from '@/types'
import { cn } from '@/lib/class-utils'
import { getStatusIcon } from '@/lib/status-utils'
import { SkeletonCompletedWorkList, ErrorState } from '@/components/ui/Skeleton'

interface AuditViewProps {
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
}

/**
 * AuditView - Audit completed work and compare assignments
 * Part of the three-view architecture: Planning | Monitoring | Audit
 */
export function AuditView({ updatedIssueIds = new Set() }: AuditViewProps) {
  const { selectedRig } = useRigStore()

  // Convoy selection state
  const [convoys, setConvoys] = useState<Issue[]>([])
  const [selectedConvoy, setSelectedConvoy] = useState<Issue | null>(null)
  const [convoySortBy, setConvoySortBy] = useState<ConvoySortBy>('date')
  const [convoysLoading, setConvoysLoading] = useState(true)
  const [convoysError, setConvoysError] = useState<string | null>(null)

  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  })

  // Agent filter
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null)

  // Completed work items
  const [completedWork, setCompletedWork] = useState<Issue[]>([])
  const [completedWorkLoading, setCompletedWorkLoading] = useState(false)
  const [completedWorkError, setCompletedWorkError] = useState<string | null>(null)

  // Expanded item for full comparison view
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Retry counter for manual retry
  const [retryCount, setRetryCount] = useState(0)

  // Fetch convoys when rig changes
  useEffect(() => {
    if (!selectedRig) {
      setConvoys([])
      setConvoysLoading(false)
      return
    }

    setConvoysLoading(true)
    setConvoysError(null)

    const fetchConvoys = async () => {
      const url = `/api/rigs/${selectedRig.id}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        // Filter to only convoy-type issues
        const convoyIssues = result.data.filter(
          (issue) => issue.issue_type === 'convoy'
        )
        setConvoys(convoyIssues)
      } else {
        setConvoysError(result.error || 'Failed to load convoys')
        setConvoys([])
      }
      setConvoysLoading(false)
    }

    fetchConvoys()
  }, [selectedRig?.id, retryCount])

  // Fetch completed work when convoy or date range changes
  useEffect(() => {
    if (!selectedRig) {
      setCompletedWork([])
      return
    }

    setCompletedWorkLoading(true)
    setCompletedWorkError(null)

    const fetchCompletedWork = async () => {
      const url = `/api/rigs/${selectedRig.id}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        // Filter to closed issues
        let filtered = result.data.filter((issue) => issue.status === 'closed')

        // Filter by date range if set
        if (dateRange.startDate) {
          const start = new Date(dateRange.startDate)
          filtered = filtered.filter((issue) => {
            const closedAt = issue.closed_at ? new Date(issue.closed_at) : null
            return closedAt && closedAt >= start
          })
        }
        if (dateRange.endDate) {
          const end = new Date(dateRange.endDate)
          end.setHours(23, 59, 59, 999)
          filtered = filtered.filter((issue) => {
            const closedAt = issue.closed_at ? new Date(issue.closed_at) : null
            return closedAt && closedAt <= end
          })
        }

        // Filter by convoy - show only descendants of the selected convoy
        if (selectedConvoy) {
          const allIssues = result.data
          const convoyDescendants = getDescendants(allIssues, selectedConvoy.id)
          const descendantIds = new Set(convoyDescendants.map((i) => i.id))
          filtered = filtered.filter((issue) => descendantIds.has(issue.id))
        }

        setCompletedWork(filtered)
      } else {
        setCompletedWorkError(result.error || 'Failed to load completed work')
        setCompletedWork([])
      }
      setCompletedWorkLoading(false)
    }

    fetchCompletedWork()
  }, [selectedRig?.id, selectedConvoy?.id, dateRange, retryCount])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Handle convoy selection
  const handleConvoySelect = useCallback((convoy: Issue | null) => {
    setSelectedConvoy(convoy)
    setExpandedItemId(null) // Collapse any expanded item
  }, [])

  // Handle item expansion toggle
  const handleToggleExpand = useCallback((issueId: string) => {
    setExpandedItemId((prev) => (prev === issueId ? null : issueId))
  }, [])

  // Filter completed work by selected agent
  const filteredCompletedWork = useMemo(() => {
    if (!selectedAgentFilter) {
      return completedWork
    }
    return completedWork.filter((issue) => issue.assignee === selectedAgentFilter)
  }, [completedWork, selectedAgentFilter])

  // Calculate metrics from completed work
  const metrics: AuditMetrics = useMemo(() => {
    if (completedWork.length === 0) {
      return {
        timeToComplete: { avg: 0, min: 0, max: 0 },
        completionCount: 0,
        typeBreakdown: { bugs: 0, tasks: 0, features: 0 },
      }
    }

    // Calculate time to complete for each issue
    const completionTimes = completedWork
      .filter((issue) => issue.closed_at && issue.created_at)
      .map((issue) => {
        const created = new Date(issue.created_at).getTime()
        const closed = new Date(issue.closed_at!).getTime()
        return closed - created
      })
      .filter((time) => time > 0)

    const avg = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0
    const min = completionTimes.length > 0 ? Math.min(...completionTimes) : 0
    const max = completionTimes.length > 0 ? Math.max(...completionTimes) : 0

    // Calculate type breakdown
    const typeBreakdown = {
      bugs: completedWork.filter((issue) => issue.issue_type === 'bug').length,
      tasks: completedWork.filter((issue) => issue.issue_type === 'task').length,
      features: completedWork.filter((issue) => issue.issue_type === 'feature').length,
    }

    return {
      timeToComplete: { avg, min, max },
      completionCount: completedWork.length,
      typeBreakdown,
      anomalyThresholds: {
        timeToComplete: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }
  }, [completedWork])

  if (!selectedRig) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted">Select a rig from the sidebar to view audit data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide">AUDIT</h1>
        <p className="text-text-muted text-sm mt-2">
          Review completed work and historical data
        </p>
      </div>

      {/* Error state */}
      {convoysError && !convoysLoading && (
        <ErrorState
          title="Failed to load data"
          message={convoysError}
          onRetry={handleRetry}
        />
      )}

      {/* Convoy Selector */}
      {!convoysError && (
        <div className="card mb-6">
          <ConvoySelector
            convoys={convoys}
            selectedConvoyId={selectedConvoy?.id}
            onSelect={handleConvoySelect}
            sortBy={convoySortBy}
            onSortChange={setConvoySortBy}
            loading={convoysLoading}
            className="max-w-md"
          />
        </div>
      )}

      {/* Date Range Picker */}
      {!convoysError && (
        <div className="card mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">
              Filter by Date Range
            </span>
            {(dateRange.startDate || dateRange.endDate) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-rust/20 text-accent-rust">
                Active
              </span>
            )}
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      )}

      {/* Agent Filter */}
      {!convoysError && (
        <div className="card mb-6">
          <AgentFilter
            closedIssues={completedWork}
            selectedAgent={selectedAgentFilter}
            onSelect={setSelectedAgentFilter}
            className="max-w-md"
          />
        </div>
      )}

      {/* Metrics Display */}
      {!convoysError && (
        <div className="mb-6">
          <div className="mb-3">
            <span className="section-header">METRICS SUMMARY</span>
          </div>
          <MetricsDisplay metrics={metrics} />
        </div>
      )}

      {/* Completed Work List */}
      {!convoysError && (
        <div className="card">
          <div className="border-b border-border pb-2 mb-4">
            <h2 className="section-header">
              COMPLETED WORK
              <span className="text-text-muted font-normal ml-2">
                {selectedAgentFilter
                  ? `(${filteredCompletedWork.length} of ${completedWork.length} items)`
                  : `(${completedWork.length} ${completedWork.length === 1 ? 'item' : 'items'})`}
              </span>
            </h2>
          </div>

          {completedWorkLoading ? (
            <SkeletonCompletedWorkList count={3} />
          ) : completedWorkError ? (
            <div className="py-8 text-center text-status-blocked text-sm">
              {completedWorkError}
            </div>
          ) : filteredCompletedWork.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              {selectedAgentFilter
                ? 'No completed work found for this agent'
                : selectedConvoy && (dateRange.startDate || dateRange.endDate)
                  ? 'No completed work found for this convoy in the selected date range'
                  : selectedConvoy
                    ? 'No completed work found for this convoy'
                    : dateRange.startDate || dateRange.endDate
                      ? 'No completed work found in the selected date range'
                      : 'No completed work found'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredCompletedWork.map((issue) => (
                <CompletedWorkItem
                  key={issue.id}
                  issue={issue}
                  isExpanded={expandedItemId === issue.id}
                  onToggleExpand={() => handleToggleExpand(issue.id)}
                  isUpdated={updatedIssueIds.has(issue.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CompletedWorkItemProps {
  issue: Issue
  isExpanded: boolean
  onToggleExpand: () => void
  isUpdated?: boolean
}

/**
 * Individual completed work item with expandable comparison view.
 */
function CompletedWorkItem({ issue, isExpanded, onToggleExpand, isUpdated = false }: CompletedWorkItemProps) {
  // For the comparison, we use the same issue for both original and final
  // In a real implementation, the backend would provide the original state
  // This is a placeholder until we have proper history tracking
  const originalIssue: Issue = useMemo(() => ({
    ...issue,
    status: 'open', // Original would have been open
    // Other fields would come from history
  }), [issue])

  return (
    <div className={cn(
      "border border-border rounded-md overflow-hidden",
      isUpdated && "animate-flash-update"
    )}>
      {/* Summary row - always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'w-full px-4 py-3 flex items-center gap-4 text-left',
          'hover:bg-bg-tertiary/50 transition-colors',
          isExpanded && 'bg-bg-tertiary/30'
        )}
      >
        {/* Status icon */}
        <span className="text-status-closed text-lg flex-shrink-0">
          {getStatusIcon('closed')}
        </span>

        {/* Issue ID */}
        <span className="mono text-xs text-text-muted flex-shrink-0 w-20">
          {issue.id}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-text-primary">
          {issue.title}
        </span>

        {/* Closed date */}
        <span className="text-sm text-text-muted flex-shrink-0">
          {issue.closed_at
            ? new Date(issue.closed_at).toLocaleDateString()
            : '—'}
        </span>

        {/* Expand/collapse indicator */}
        <svg
          className={cn(
            'w-4 h-4 text-text-muted transition-transform flex-shrink-0',
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
      </button>

      {/* Expanded comparison view */}
      {isExpanded && (
        <div className="border-t border-border p-4 bg-bg-tertiary/20">
          <AssignmentComparison original={originalIssue} final={issue} />
        </div>
      )}
    </div>
  )
}
