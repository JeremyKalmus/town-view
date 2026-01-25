/**
 * GitChangesTimeline - Displays git commit history with agent attribution.
 * Uses VirtualList for performance with long commit histories.
 */

import { useMemo } from 'react'
import { VirtualList } from '@/components/ui/VirtualList'
import { Badge } from '@/components/ui/Badge'
import { useFetch } from '@/hooks/useFetch'
import { formatRelativeTime } from '@/lib/status-utils'
import { cn } from '@/lib/class-utils'
import type { GitChange } from '@/types'
import type { DateRange } from '@/components/ui/DateRangePicker'
import { GitCommit, Plus, Minus, FileText } from 'lucide-react'

// Stable empty array reference to prevent infinite re-renders
const EMPTY_CHANGES: GitChange[] = []

// Height of each commit row in pixels (for VirtualList)
const COMMIT_ROW_HEIGHT = 88

export interface GitChangesTimelineProps {
  /** Optional date range filter */
  dateRange?: DateRange
  /** Optional agent ID filter */
  agentId?: string
  /** Optional bead ID filter */
  beadId?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Build the API URL with optional filters.
 */
function buildApiUrl(props: GitChangesTimelineProps): string {
  const url = new URL('/api/telemetry/git', window.location.origin)

  if (props.agentId) {
    url.searchParams.set('agent_id', props.agentId)
  }
  if (props.beadId) {
    url.searchParams.set('bead_id', props.beadId)
  }
  if (props.dateRange?.startDate) {
    url.searchParams.set('since', props.dateRange.startDate)
  }
  if (props.dateRange?.endDate) {
    url.searchParams.set('until', props.dateRange.endDate)
  }

  return url.toString()
}

/**
 * Filter changes by date range (client-side filtering for additional precision).
 */
function filterByDateRange(changes: GitChange[], dateRange?: DateRange): GitChange[] {
  if (!dateRange?.startDate && !dateRange?.endDate) {
    return changes
  }

  return changes.filter((change) => {
    const timestamp = new Date(change.timestamp)

    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate)
      if (timestamp < start) return false
    }

    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate)
      end.setHours(23, 59, 59, 999)
      if (timestamp > end) return false
    }

    return true
  })
}

/**
 * Extract agent name from agent_id (e.g., "townview/polecats/amber" -> "amber").
 */
function getAgentDisplayName(agentId: string): string {
  const parts = agentId.split('/')
  return parts[parts.length - 1] || agentId
}

/**
 * Truncate commit SHA for display.
 */
function shortenSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * Single commit row component.
 */
function CommitRow({ commit }: { commit: GitChange }) {
  const agentName = getAgentDisplayName(commit.agent_id)

  return (
    <div className="h-full px-4 py-3 border-b border-border hover:bg-bg-tertiary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left: commit info */}
        <div className="flex-1 min-w-0">
          {/* Commit message */}
          <div className="flex items-center gap-2 mb-1.5">
            <GitCommit className="h-4 w-4 text-text-muted flex-shrink-0" />
            <span
              className="font-medium text-text-primary truncate"
              title={commit.message}
            >
              {commit.message}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            {/* SHA */}
            <span className="font-mono text-text-muted">{shortenSha(commit.commit_sha)}</span>

            {/* Branch */}
            <span className="text-text-muted">on {commit.branch}</span>

            {/* Diff stats */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <FileText className="h-3 w-3" />
                {commit.files_changed}
              </span>
              <span className="flex items-center gap-0.5 text-status-closed">
                <Plus className="h-3 w-3" />
                {commit.insertions}
              </span>
              <span className="flex items-center gap-0.5 text-status-blocked">
                <Minus className="h-3 w-3" />
                {commit.deletions}
              </span>
            </div>
          </div>
        </div>

        {/* Right: agent and timestamp */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge status={agentName} color="info" />
          <span className="text-xs text-text-muted">
            {formatRelativeTime(commit.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * GitChangesTimeline component.
 * Displays git commit history with agent attribution, diff statistics, and timestamps.
 */
export function GitChangesTimeline({
  dateRange,
  agentId,
  beadId,
  className,
}: GitChangesTimelineProps) {
  const apiUrl = buildApiUrl({ dateRange, agentId, beadId })

  const { data, loading, error } = useFetch<GitChange[]>(apiUrl, {
    initialData: EMPTY_CHANGES,
    errorPrefix: 'Failed to fetch git changes',
  })

  // Filter by date range (client-side for precision)
  const filteredChanges = useMemo(() => {
    const changes = data ?? []
    const filtered = filterByDateRange(changes, dateRange)
    // Sort by timestamp descending (most recent first)
    return [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [data, dateRange])

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <span className="text-text-muted">Loading git changes...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <span className="text-status-blocked">{error}</span>
      </div>
    )
  }

  // Empty state
  if (filteredChanges.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No git changes found
        {dateRange?.startDate || dateRange?.endDate ? ' for the selected date range' : ''}
      </div>
    )
  }

  return (
    <VirtualList
      items={filteredChanges}
      itemHeight={COMMIT_ROW_HEIGHT}
      renderItem={(commit) => <CommitRow commit={commit} />}
      getKey={(commit) => commit.commit_sha}
      className={cn('h-[400px]', className)}
    />
  )
}
