import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRigStore } from '@/stores/rig-store'
import { useDataStore, selectIssuesByRig, selectConnected } from '@/stores/data-store'
import { getIssues } from '@/services'
import { ConvoySelector, type ConvoySortBy } from './ConvoySelector'
import { ConvoyTreeView } from './ConvoyTreeView'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { AgentFilter } from './AgentFilter'
import { MetricsDisplay } from './MetricsDisplay'
import { CompletedWorkTable } from './CompletedWorkTable'
import { getDescendants } from '@/lib/tree'
import type { Issue, AuditMetrics, TestStatus } from '@/types'
import { SkeletonCompletedWorkList, ErrorState } from '@/components/ui/Skeleton'
import { useTestSuiteStatus, getDisplayStatus, isRegression } from '@/hooks/useTestSuiteStatus'
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, GitCommit } from 'lucide-react'

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

  // Data store (WebSocket-fed)
  const wsIssues = useDataStore(selectIssuesByRig(selectedRig?.id || ''))
  const wsConnected = useDataStore(selectConnected)

  // HTTP fallback state
  const [httpIssues, setHttpIssues] = useState<Issue[]>([])
  const [httpLoading, setHttpLoading] = useState(true)
  const [httpError, setHttpError] = useState<string | null>(null)

  // Use WebSocket data when connected and available, otherwise HTTP fallback
  const allIssues = wsConnected && wsIssues.length > 0 ? wsIssues : httpIssues
  const convoysLoading = !wsConnected && httpLoading
  const convoysError = !wsConnected ? httpError : null

  // Convoy selection state (derived from allIssues)
  const convoys = useMemo(() =>
    allIssues.filter((issue) => issue.issue_type === 'convoy'),
    [allIssues]
  )
  const [selectedConvoy, setSelectedConvoy] = useState<Issue | null>(null)
  const [convoySortBy, setConvoySortBy] = useState<ConvoySortBy>('date')

  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  })

  // Agent filter
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null)

  // Completed work (derived from allIssues with filters)
  const completedWork = useMemo(() => {
    // Filter to closed issues
    let filtered = allIssues.filter((issue) => issue.status === 'closed')

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
      const convoyDescendants = getDescendants(allIssues, selectedConvoy.id)
      const descendantIds = new Set(convoyDescendants.map((i) => i.id))
      filtered = filtered.filter((issue) => descendantIds.has(issue.id))
    }

    return filtered
  }, [allIssues, dateRange, selectedConvoy])

  const completedWorkLoading = convoysLoading
  const completedWorkError = convoysError

  // Retry counter for manual retry
  const [retryCount, setRetryCount] = useState(0)

  // Test suite data for test history
  const { tests: testSuiteTests, loading: testsLoading } = useTestSuiteStatus({ enabled: true })

  // Filter tests by date range
  const filteredTests = useMemo(() => {
    let filtered = testSuiteTests

    // Filter by date range if set (based on last_run_at)
    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate)
      filtered = filtered.filter((test) => {
        const runAt = new Date(test.last_run_at)
        return runAt >= start
      })
    }
    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((test) => {
        const runAt = new Date(test.last_run_at)
        return runAt <= end
      })
    }

    // Sort by last run (most recent first)
    return [...filtered].sort(
      (a, b) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime()
    )
  }, [testSuiteTests, dateRange])

  // Test metrics
  const testMetrics = useMemo(() => {
    const passing = filteredTests.filter((t) => t.current_status === 'passed').length
    const failing = filteredTests.filter((t) => t.current_status === 'failed').length
    const regressions = filteredTests.filter((t) => isRegression(t)).length
    return { passing, failing, regressions, total: filteredTests.length }
  }, [filteredTests])

  // Fetch issues via HTTP as fallback
  useEffect(() => {
    if (!selectedRig) {
      setHttpIssues([])
      setHttpLoading(false)
      return
    }

    // Skip HTTP fetch if WebSocket is connected and has data
    if (wsConnected && wsIssues.length > 0) {
      setHttpLoading(false)
      return
    }

    setHttpLoading(true)
    setHttpError(null)

    const fetchIssues = async () => {
      const result = await getIssues(selectedRig.id, { all: true })

      if (result.data) {
        setHttpIssues(result.data)
      } else {
        setHttpError(result.error || 'Failed to load issues')
        setHttpIssues([])
      }
      setHttpLoading(false)
    }

    fetchIssues()
  }, [selectedRig?.id, retryCount, wsConnected, wsIssues.length])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Handle convoy selection
  const handleConvoySelect = useCallback((convoy: Issue | null) => {
    setSelectedConvoy(convoy)
  }, [])

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return selectedConvoy !== null ||
      dateRange.startDate !== null ||
      dateRange.endDate !== null ||
      selectedAgentFilter !== null
  }, [selectedConvoy, dateRange, selectedAgentFilter])

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSelectedConvoy(null)
    setDateRange({ startDate: null, endDate: null })
    setSelectedAgentFilter(null)
  }, [])

  // Filter completed work by selected agent
  const filteredCompletedWork = useMemo(() => {
    if (!selectedAgentFilter) {
      return completedWork
    }
    return completedWork.filter((issue) => issue.assignee === selectedAgentFilter)
  }, [completedWork, selectedAgentFilter])

  // Calculate metrics from filtered completed work (includes all filters: date range, convoy, agent)
  const metrics: AuditMetrics = useMemo(() => {
    if (filteredCompletedWork.length === 0) {
      return {
        timeToComplete: { avg: 0, min: 0, max: 0 },
        completionCount: 0,
        typeBreakdown: { bugs: 0, tasks: 0, features: 0 },
      }
    }

    // Calculate time to complete for each issue
    const completionTimes = filteredCompletedWork
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
      bugs: filteredCompletedWork.filter((issue) => issue.issue_type === 'bug').length,
      tasks: filteredCompletedWork.filter((issue) => issue.issue_type === 'task').length,
      features: filteredCompletedWork.filter((issue) => issue.issue_type === 'feature').length,
    }

    return {
      timeToComplete: { avg, min, max },
      completionCount: filteredCompletedWork.length,
      typeBreakdown,
      anomalyThresholds: {
        timeToComplete: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }
  }, [filteredCompletedWork])

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">AUDIT</h1>
          <p className="text-text-muted text-sm mt-2">
            Review completed work and historical data
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearAllFilters}
            className="px-3 py-1.5 text-sm rounded-md border border-border hover:border-text-muted transition-colors text-text-secondary hover:text-text-primary"
          >
            Clear all filters
          </button>
        )}
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

      {/* Test History */}
      {!convoysError && (
        <div className="card mb-6">
          <div className="border-b border-border pb-2 mb-4">
            <h2 className="section-header">
              TEST HISTORY
              <span className="text-text-muted font-normal ml-2">
                ({filteredTests.length} tests)
              </span>
            </h2>
            {testMetrics.regressions > 0 && (
              <p className="text-sm text-status-in-progress mt-1">
                {testMetrics.regressions} regression{testMetrics.regressions !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>

          {/* Test summary stats */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-closed" />
              <span className="text-text-secondary">{testMetrics.passing} passing</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-status-blocked" />
              <span className="text-text-secondary">{testMetrics.failing - testMetrics.regressions} failing</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-in-progress" />
              <span className="text-text-secondary">{testMetrics.regressions} regressions</span>
            </div>
          </div>

          {testsLoading ? (
            <div className="py-8 text-center text-text-muted">
              Loading test history...
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="py-8 text-center text-text-muted">
              No test results found for the selected date range
            </div>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary sticky top-0">
                  <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Test Name</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Last Run</th>
                    <th className="px-3 py-2">Commit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.slice(0, 50).map((test) => (
                    <TestHistoryRow key={test.test_name} test={test} />
                  ))}
                </tbody>
              </table>
              {filteredTests.length > 50 && (
                <div className="py-2 text-center text-xs text-text-muted border-t border-border">
                  Showing 50 of {filteredTests.length} tests
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed Work - Hierarchical Tree View when convoy selected, Table View otherwise */}
      {!convoysError && (
        <div className="card">
          <div className="border-b border-border pb-2 mb-4">
            <h2 className="section-header">
              {selectedConvoy ? 'CONVOY HIERARCHY' : 'COMPLETED WORK'}
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
              {(() => {
                const filterParts: string[] = []
                if (selectedAgentFilter) filterParts.push('this agent')
                if (selectedConvoy) filterParts.push('this convoy')
                if (dateRange.startDate || dateRange.endDate) filterParts.push('the selected date range')

                if (filterParts.length === 0) return 'No completed work found'
                if (filterParts.length === 1) return `No completed work found for ${filterParts[0]}`
                if (filterParts.length === 2) return `No completed work found for ${filterParts[0]} in ${filterParts[1]}`
                return `No completed work found matching the current filters`
              })()}
            </div>
          ) : selectedConvoy ? (
            /* Hierarchical Tree View when convoy is selected */
            <ConvoyTreeView
              convoy={selectedConvoy}
              allIssues={allIssues}
              selectedAgentFilter={selectedAgentFilter}
            />
          ) : (
            <CompletedWorkTable
              issues={filteredCompletedWork}
              updatedIssueIds={updatedIssueIds}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Status icon component for test history */
function TestStatusIcon({ status }: { status: 'passing' | 'failing' | 'regression' | 'skipped' }) {
  switch (status) {
    case 'passing':
      return <CheckCircle className="h-4 w-4 text-status-closed" />
    case 'failing':
      return <XCircle className="h-4 w-4 text-status-blocked" />
    case 'regression':
      return <AlertTriangle className="h-4 w-4 text-status-in-progress" />
    case 'skipped':
      return <MinusCircle className="h-4 w-4 text-text-muted" />
  }
}

/** Format timestamp for display */
function formatTestTimestamp(timestamp: string): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Show relative time for recent timestamps
  if (diff < 60 * 1000) return 'just now'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`

  return date.toLocaleDateString()
}

/** Row component for test history table */
function TestHistoryRow({ test }: { test: TestStatus }) {
  const displayStatus = getDisplayStatus(test)

  const rowBgClass =
    displayStatus === 'passing'
      ? 'bg-status-closed/5 hover:bg-status-closed/10'
      : displayStatus === 'failing'
        ? 'bg-status-blocked/5 hover:bg-status-blocked/10'
        : displayStatus === 'regression'
          ? 'bg-status-in-progress/5 hover:bg-status-in-progress/10'
          : 'bg-bg-tertiary/30 hover:bg-bg-tertiary/50'

  return (
    <tr className={`border-b border-border transition-colors ${rowBgClass}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <TestStatusIcon status={displayStatus} />
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              displayStatus === 'passing'
                ? 'bg-status-closed/20 text-status-closed'
                : displayStatus === 'failing'
                  ? 'bg-status-blocked/20 text-status-blocked'
                  : displayStatus === 'regression'
                    ? 'bg-status-in-progress/20 text-status-in-progress'
                    : 'bg-bg-tertiary text-text-muted'
            }`}
          >
            {displayStatus}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-text-primary truncate max-w-[200px]" title={test.test_name}>
        {test.test_name}
      </td>
      <td className="px-3 py-2 text-text-secondary font-mono truncate max-w-[200px]" title={test.test_file}>
        {test.test_file}
      </td>
      <td className="px-3 py-2 text-text-secondary">
        {formatTestTimestamp(test.last_run_at)}
      </td>
      <td className="px-3 py-2">
        {test.last_passed_commit ? (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <GitCommit className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{test.last_passed_commit.slice(0, 7)}</span>
          </div>
        ) : (
          <span className="text-text-muted">-</span>
        )}
      </td>
    </tr>
  )
}
