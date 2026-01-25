/**
 * AgentTelemetryPanel - Displays comprehensive telemetry for a selected agent.
 * Shows token usage, git commits, test runs, and summary statistics.
 */

import { useMemo } from 'react'
import { useAgentTelemetry } from '@/hooks/useAgentTelemetry'
import { VirtualList } from '@/components/ui/VirtualList'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelativeTime } from '@/lib/status-utils'
import { cn } from '@/lib/class-utils'
import type { GitChange, TestRun } from '@/types'
import {
  Coins,
  GitCommit,
  TestTube2,
  FileText,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

interface AgentTelemetryPanelProps {
  /** Agent ID to fetch telemetry for */
  agentId: string | null
  /** Additional CSS classes */
  className?: string
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

/**
 * Summary card component for displaying key metrics
 */
function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subtext?: string
  className?: string
}) {
  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-bg-tertiary">
          <Icon className="h-5 w-5 text-text-muted" />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
          <p className="text-xl font-semibold text-text-primary">{value}</p>
          {subtext && <p className="text-xs text-text-muted">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

/**
 * Git commit row component
 */
function GitCommitRow({ commit }: { commit: GitChange }) {
  return (
    <div className="px-4 py-3 border-b border-border hover:bg-bg-tertiary/50 transition-colors h-full flex flex-col justify-center">
      <div className="flex items-start gap-3">
        <GitCommit className="h-4 w-4 text-text-muted mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">{commit.message}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span className="font-mono">{commit.commit_sha.slice(0, 7)}</span>
            <span>{formatRelativeTime(commit.timestamp)}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {commit.files_changed}
              </span>
              <span className="flex items-center gap-1 text-status-closed">
                <Plus className="h-3 w-3" />
                {commit.insertions}
              </span>
              <span className="flex items-center gap-1 text-status-blocked">
                <Minus className="h-3 w-3" />
                {commit.deletions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Test run row component
 */
function TestRunRow({ run }: { run: TestRun }) {
  const passRate = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0
  const hasFailures = run.failed > 0

  return (
    <div className="px-4 py-3 border-b border-border hover:bg-bg-tertiary/50 transition-colors h-full flex flex-col justify-center">
      <div className="flex items-start gap-3">
        <TestTube2
          className={cn(
            'h-4 w-4 mt-0.5 flex-shrink-0',
            hasFailures ? 'text-status-blocked' : 'text-status-closed'
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-primary">{run.command}</p>
            <Badge
              status={hasFailures ? 'failed' : 'passed'}
              color={hasFailures ? 'error' : 'success'}
            />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{formatRelativeTime(run.timestamp)}</span>
            {run.commit_sha && (
              <span className="font-mono">{run.commit_sha.slice(0, 7)}</span>
            )}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-status-closed">
                <CheckCircle className="h-3 w-3" />
                {run.passed}
              </span>
              {run.failed > 0 && (
                <span className="flex items-center gap-1 text-status-blocked">
                  <XCircle className="h-3 w-3" />
                  {run.failed}
                </span>
              )}
              {run.skipped > 0 && (
                <span className="flex items-center gap-1 text-text-muted">
                  <AlertTriangle className="h-3 w-3" />
                  {run.skipped}
                </span>
              )}
            </div>
            <span className="text-text-muted">({passRate}% pass rate)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-text-muted">
      <p>{message}</p>
    </div>
  )
}

/**
 * AgentTelemetryPanel displays comprehensive telemetry data for a selected agent.
 */
export function AgentTelemetryPanel({ agentId, className }: AgentTelemetryPanelProps) {
  const { telemetry, loading, error } = useAgentTelemetry(agentId)

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!telemetry) return null

    const totalTokens =
      telemetry.token_summary.total_input + telemetry.token_summary.total_output

    // Calculate test pass rate
    const testPassRate =
      telemetry.test_summary.total_tests > 0
        ? Math.round(
            (telemetry.test_summary.total_passed / telemetry.test_summary.total_tests) *
              100
          )
        : 0

    return {
      totalTokens,
      inputTokens: telemetry.token_summary.total_input,
      outputTokens: telemetry.token_summary.total_output,
      totalCommits: telemetry.git_summary.total_commits,
      totalInsertions: telemetry.git_summary.total_insertions,
      totalDeletions: telemetry.git_summary.total_deletions,
      totalTestRuns: telemetry.test_summary.total_runs,
      totalTestsPassed: telemetry.test_summary.total_passed,
      totalTestsFailed: telemetry.test_summary.total_failed,
      testPassRate,
    }
  }, [telemetry])

  // No agent selected
  if (!agentId) {
    return (
      <div className={cn('card', className)}>
        <EmptyState message="Select an agent to view telemetry data" />
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn('card', className)}>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-text-muted">Loading telemetry...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('card', className)}>
        <div className="py-12 text-center">
          <p className="text-status-blocked mb-2">Failed to load telemetry</p>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    )
  }

  // No data state
  if (!telemetry || !summaryMetrics) {
    return (
      <div className={cn('card', className)}>
        <EmptyState message="No telemetry data available for this agent" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div>
        <h3 className="section-header mb-4">SUMMARY</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={Coins}
            label="Total Tokens"
            value={formatNumber(summaryMetrics.totalTokens)}
            subtext={`${formatNumber(summaryMetrics.inputTokens)} in / ${formatNumber(summaryMetrics.outputTokens)} out`}
          />
          <SummaryCard
            icon={GitCommit}
            label="Git Commits"
            value={summaryMetrics.totalCommits}
            subtext={`+${formatNumber(summaryMetrics.totalInsertions)} / -${formatNumber(summaryMetrics.totalDeletions)}`}
          />
          <SummaryCard
            icon={TestTube2}
            label="Test Runs"
            value={summaryMetrics.totalTestRuns}
            subtext={`${summaryMetrics.testPassRate}% pass rate`}
          />
          <SummaryCard
            icon={CheckCircle}
            label="Tests Passed"
            value={summaryMetrics.totalTestsPassed}
            subtext={
              summaryMetrics.totalTestsFailed > 0
                ? `${summaryMetrics.totalTestsFailed} failed`
                : 'No failures'
            }
          />
        </div>
      </div>

      {/* Git Commits */}
      <div className="card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="section-header">
            GIT COMMITS
            <span className="text-text-muted font-normal ml-2">
              ({telemetry.git_changes.length})
            </span>
          </h3>
        </div>

        {telemetry.git_changes.length === 0 ? (
          <EmptyState message="No git commits recorded" />
        ) : (
          <VirtualList
            items={telemetry.git_changes}
            itemHeight={72}
            className="max-h-[300px]"
            getKey={(commit) => commit.commit_sha}
            renderItem={(commit) => <GitCommitRow commit={commit} />}
          />
        )}
      </div>

      {/* Test Runs */}
      <div className="card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="section-header">
            TEST RUNS
            <span className="text-text-muted font-normal ml-2">
              ({telemetry.test_runs.length})
            </span>
          </h3>
        </div>

        {telemetry.test_runs.length === 0 ? (
          <EmptyState message="No test runs recorded" />
        ) : (
          <VirtualList
            items={telemetry.test_runs}
            itemHeight={72}
            className="max-h-[300px]"
            getKey={(run, index) => `${run.timestamp}-${index}`}
            renderItem={(run) => <TestRunRow run={run} />}
          />
        )}
      </div>

      {/* Token Usage by Model */}
      {Object.keys(telemetry.token_summary.by_model).length > 0 && (
        <div className="card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="section-header">TOKEN USAGE BY MODEL</h3>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="pb-2">Model</th>
                  <th className="pb-2 text-right">Input</th>
                  <th className="pb-2 text-right">Output</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(telemetry.token_summary.by_model).map(
                  ([model, summary]) => (
                    <tr key={model} className="border-t border-border">
                      <td className="py-2 font-mono text-text-secondary">{model}</td>
                      <td className="py-2 text-right text-text-muted">
                        {formatNumber(summary.input)}
                      </td>
                      <td className="py-2 text-right text-text-muted">
                        {formatNumber(summary.output)}
                      </td>
                      <td className="py-2 text-right text-text-primary font-medium">
                        {formatNumber(summary.input + summary.output)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
