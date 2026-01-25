import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import { VirtualList } from '@/components/ui/VirtualList'
import { Badge } from '@/components/ui/Badge'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { useFetch } from '@/hooks/useFetch'
import type { TestHistoryEntry, TestStatusValue } from '@/types'

interface TestHistoryPanelProps {
  /** Name of the test to show history for */
  testName: string
  /** Optional CSS class name */
  className?: string
}

const ITEM_HEIGHT = 64

/**
 * Maps test status to Badge color.
 */
function getStatusColor(status: TestStatusValue): 'success' | 'error' | 'warning' | 'default' {
  switch (status) {
    case 'passed':
      return 'success'
    case 'failed':
    case 'error':
      return 'error'
    case 'skipped':
      return 'warning'
    default:
      return 'default'
  }
}

/**
 * Maps test status to display label.
 */
function getStatusLabel(status: TestStatusValue): string {
  switch (status) {
    case 'passed':
      return 'Pass'
    case 'failed':
      return 'Fail'
    case 'error':
      return 'Error'
    case 'skipped':
      return 'Skip'
    default:
      return status
  }
}

/**
 * Formats duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/**
 * Filters history entries by date range.
 */
function filterByDateRange(entries: TestHistoryEntry[], range: DateRange): TestHistoryEntry[] {
  if (!range.startDate && !range.endDate) return entries

  return entries.filter((entry) => {
    const entryDate = entry.timestamp.split('T')[0]

    if (range.startDate && entryDate < range.startDate) return false
    if (range.endDate && entryDate > range.endDate) return false

    return true
  })
}

/**
 * TestHistoryPanel shows test run history with pass/fail indicators.
 * Uses VirtualList for performance with long histories.
 */
export function TestHistoryPanel({ testName, className }: TestHistoryPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })

  const { data, loading, error } = useFetch<TestHistoryEntry[]>(
    `/api/telemetry/tests/${encodeURIComponent(testName)}/history`,
    {
      errorPrefix: 'Failed to fetch test history',
    }
  )

  const entries = useMemo(() => data ?? [], [data])

  const filteredEntries = useMemo(
    () => filterByDateRange(entries, dateRange),
    [entries, dateRange]
  )

  const sortedEntries = useMemo(
    () =>
      [...filteredEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [filteredEntries]
  )

  const getKey = useCallback((entry: TestHistoryEntry, index: number) => {
    return `${entry.timestamp}-${index}`
  }, [])

  const renderItem = useCallback((entry: TestHistoryEntry) => {
    return (
      <div
        className={cn(
          'mx-2 px-3 py-2 rounded-md h-[60px]',
          'bg-bg-secondary border border-border',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary'
        )}
      >
        {/* Header: status badge, timestamp, duration */}
        <div className="flex items-center gap-3 mb-1">
          <Badge status={getStatusLabel(entry.status)} color={getStatusColor(entry.status)} />
          <span className="text-xs text-text-muted mono" title={entry.timestamp}>
            {formatRelativeTime(entry.timestamp)}
          </span>
          <span className="text-xs text-text-secondary">
            {formatDuration(entry.duration_ms)}
          </span>
          {entry.commit_sha && (
            <span className="text-xs text-text-muted mono truncate max-w-[80px]" title={entry.commit_sha}>
              {entry.commit_sha.slice(0, 7)}
            </span>
          )}
        </div>

        {/* Error message if failed */}
        {entry.error_message && (
          <div className="text-xs text-status-blocked truncate" title={entry.error_message}>
            {entry.error_message}
          </div>
        )}
      </div>
    )
  }, [])

  if (loading) {
    return (
      <div className={cn('bg-bg-secondary border border-border rounded-lg p-4', className)}>
        <div className="flex items-center justify-center py-8 text-text-muted">
          Loading test history...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-bg-secondary border border-border rounded-lg p-4', className)}>
        <div className="flex items-center justify-center py-8 text-status-blocked">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-bg-secondary border border-border rounded-lg', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">Test History</h3>
        <div className="text-xs text-text-muted mono truncate mb-3" title={testName}>
          {testName}
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Results count */}
      <div className="px-4 py-2 text-xs text-text-muted border-b border-border">
        {sortedEntries.length} result{sortedEntries.length !== 1 ? 's' : ''}
        {dateRange.startDate || dateRange.endDate ? ' (filtered)' : ''}
      </div>

      {/* Virtual list */}
      <VirtualList
        items={sortedEntries}
        itemHeight={ITEM_HEIGHT}
        renderItem={renderItem}
        getKey={getKey}
        className="h-[400px]"
      />
    </div>
  )
}
