/**
 * TestSuiteList component for displaying test suite status.
 * Shows a table of all tests with sorting, filtering, and expandable rows.
 */

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronRight, Filter, ArrowUpDown, RefreshCw, AlertTriangle, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import {
  useTestSuiteStatus,
  filterTests,
  sortTests,
  getDisplayStatus,
  type TestStatusFilter,
  type TestSortField,
  type SortDirection,
} from '@/hooks/useTestSuiteStatus'
import type { TestStatus } from '@/types'

export interface TestSuiteListProps {
  /** Override tests for testing (bypasses API) */
  mockTests?: TestStatus[]
  /** Override loading state */
  mockLoading?: boolean
  /** Override error state */
  mockError?: string
  /** Callback when a test row is clicked */
  onTestClick?: (test: TestStatus) => void
}

/** Status filter button */
function FilterButton({
  label,
  value,
  count,
  active,
  onClick,
}: {
  label: string
  value: TestStatusFilter
  count: number
  active: boolean
  onClick: (value: TestStatusFilter) => void
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        active
          ? 'bg-bg-tertiary text-text-primary font-medium'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
      }`}
    >
      {label}
      <span className="ml-1.5 text-xs text-text-muted">({count})</span>
    </button>
  )
}

/** Sort header button */
function SortHeader({
  label,
  field,
  currentField,
  direction,
  onClick,
}: {
  label: string
  field: TestSortField
  currentField: TestSortField
  direction: SortDirection
  onClick: (field: TestSortField) => void
}) {
  const isActive = currentField === field

  return (
    <button
      onClick={() => onClick(field)}
      className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
    >
      {label}
      {isActive && (
        <ArrowUpDown
          className={`h-3 w-3 ${direction === 'desc' ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  )
}

/** Status icon component */
function StatusIcon({ status }: { status: 'passing' | 'failing' | 'regression' | 'skipped' }) {
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

/** Row background color based on status */
function getRowClassName(status: 'passing' | 'failing' | 'regression' | 'skipped'): string {
  const baseClass = 'transition-colors'

  switch (status) {
    case 'passing':
      return `${baseClass} bg-status-closed/5 hover:bg-status-closed/10`
    case 'failing':
      return `${baseClass} bg-status-blocked/5 hover:bg-status-blocked/10`
    case 'regression':
      return `${baseClass} bg-status-in-progress/5 hover:bg-status-in-progress/10`
    case 'skipped':
      return `${baseClass} bg-bg-tertiary/30 hover:bg-bg-tertiary/50`
  }
}

/** Format timestamp for display */
function formatTimestamp(timestamp: string): string {
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

/** Truncate commit SHA for display */
function formatCommit(commit: string | undefined): string {
  if (!commit) return '-'
  return commit.slice(0, 7)
}

/** Test row component */
function TestRow({
  test,
  isExpanded,
  onToggle,
  onClick,
}: {
  test: TestStatus
  isExpanded: boolean
  onToggle: () => void
  onClick?: (test: TestStatus) => void
}) {
  const displayStatus = getDisplayStatus(test)
  const rowClassName = getRowClassName(displayStatus)

  return (
    <>
      <tr
        className={`${rowClassName} cursor-pointer border-b border-border`}
        onClick={() => onClick?.(test)}
      >
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-1 hover:bg-bg-tertiary rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StatusIcon status={displayStatus} />
            <span className="font-mono text-sm">{test.test_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-text-secondary font-mono truncate max-w-[200px]">
          {test.test_file}
        </td>
        <td className="px-4 py-3 text-sm text-text-secondary">
          {formatTimestamp(test.last_run_at)}
        </td>
        <td className="px-4 py-3 text-sm text-text-secondary">
          {formatTimestamp(test.last_passed_at || '')}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
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
        </td>
        <td className="px-4 py-3 text-sm text-text-secondary font-mono">
          {formatCommit(test.last_passed_commit)}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-bg-tertiary/20">
          <td colSpan={7} className="px-4 py-3">
            <TestHistoryPanel test={test} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Expanded history panel for a test */
function TestHistoryPanel({ test }: { test: TestStatus }) {
  // In a real implementation, this would fetch history from an API
  // For now, show summary information
  return (
    <div className="pl-8 space-y-2">
      <div className="text-sm text-text-secondary">
        <span className="font-medium">Total runs:</span> {test.total_runs}
      </div>
      {test.fail_count > 0 && (
        <div className="text-sm text-status-blocked">
          <span className="font-medium">Consecutive failures:</span> {test.fail_count}
        </div>
      )}
      {test.last_passed_at && (
        <div className="text-sm text-text-secondary">
          <span className="font-medium">Last passed:</span>{' '}
          {new Date(test.last_passed_at).toLocaleString()}
          {test.last_passed_commit && (
            <span className="ml-2 font-mono text-xs">({formatCommit(test.last_passed_commit)})</span>
          )}
        </div>
      )}
    </div>
  )
}

/** Main TestSuiteList component */
export function TestSuiteList({
  mockTests,
  mockLoading,
  mockError,
  onTestClick,
}: TestSuiteListProps) {
  const [filter, setFilter] = useState<TestStatusFilter>('all')
  const [sortField, setSortField] = useState<TestSortField>('status')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())

  // Fetch test suite status (or use mocks)
  const { tests: apiTests, loading: apiLoading, error: apiError, refetch } = useTestSuiteStatus({
    enabled: !mockTests,
  })

  const tests = mockTests ?? apiTests
  const loading = mockLoading ?? apiLoading
  const error = mockError ?? apiError

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: tests.length,
      passing: tests.filter((t) => t.current_status === 'passed').length,
      failing: tests.filter((t) => t.current_status === 'failed' && !t.last_passed_at).length,
      regression: tests.filter((t) => t.current_status === 'failed' && !!t.last_passed_at).length,
      skipped: tests.filter((t) => t.current_status === 'skipped').length,
    }
  }, [tests])

  // Apply filter and sort
  const displayedTests = useMemo(() => {
    const filtered = filterTests(tests, filter)
    return sortTests(filtered, sortField, sortDirection)
  }, [tests, filter, sortField, sortDirection])

  // Handle sort click
  const handleSortClick = useCallback((field: TestSortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  // Handle row expansion toggle
  const toggleExpanded = useCallback((testName: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev)
      if (next.has(testName)) {
        next.delete(testName)
      } else {
        next.add(testName)
      }
      return next
    })
  }, [])

  // Loading state
  if (loading && tests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error && tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-status-blocked" />
        <p className="text-text-secondary">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-bg-tertiary hover:bg-border rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <MinusCircle className="h-12 w-12 text-text-muted" />
        <p className="text-text-secondary">No test results found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <div className="flex gap-1">
            <FilterButton
              label="All"
              value="all"
              count={filterCounts.all}
              active={filter === 'all'}
              onClick={setFilter}
            />
            <FilterButton
              label="Passing"
              value="passing"
              count={filterCounts.passing}
              active={filter === 'passing'}
              onClick={setFilter}
            />
            <FilterButton
              label="Failing"
              value="failing"
              count={filterCounts.failing}
              active={filter === 'failing'}
              onClick={setFilter}
            />
            <FilterButton
              label="Regression"
              value="regression"
              count={filterCounts.regression}
              active={filter === 'regression'}
              onClick={setFilter}
            />
            <FilterButton
              label="Skipped"
              value="skipped"
              count={filterCounts.skipped}
              active={filter === 'skipped'}
              onClick={setFilter}
            />
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-bg-tertiary sticky top-0">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-2 w-10"></th>
              <th className="px-4 py-2">
                <SortHeader
                  label="Test Name"
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSortClick}
                />
              </th>
              <th className="px-4 py-2">File</th>
              <th className="px-4 py-2">
                <SortHeader
                  label="Last Run"
                  field="last_run"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSortClick}
                />
              </th>
              <th className="px-4 py-2">Last Passed</th>
              <th className="px-4 py-2">
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSortClick}
                />
              </th>
              <th className="px-4 py-2">Commit</th>
            </tr>
          </thead>
          <tbody>
            {displayedTests.map((test) => (
              <TestRow
                key={test.test_name}
                test={test}
                isExpanded={expandedTests.has(test.test_name)}
                onToggle={() => toggleExpanded(test.test_name)}
                onClick={onTestClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="px-4 py-2 text-xs text-text-muted border-t border-border bg-bg-secondary">
        Showing {displayedTests.length} of {tests.length} tests
        {filterCounts.regression > 0 && (
          <span className="ml-4 text-status-in-progress">
            {filterCounts.regression} regression{filterCounts.regression !== 1 ? 's' : ''} detected
          </span>
        )}
      </div>
    </div>
  )
}
