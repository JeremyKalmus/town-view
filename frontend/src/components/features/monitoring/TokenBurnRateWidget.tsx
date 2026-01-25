import { cn } from '@/lib/class-utils'
import { useTokenSummary } from '@/hooks/useTokenSummary'
import type { TokenModelSummary } from '@/types'

export interface TokenBurnRateWidgetProps {
  className?: string
}

/**
 * Format a token count for display (e.g., 1234 -> "1.2k", 1234567 -> "1.2M").
 */
function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`
  }
  return count.toString()
}

/**
 * Format USD cost for display.
 */
function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01'
  }
  return `$${cost.toFixed(2)}`
}

/**
 * Stat row component for displaying a label/value pair.
 */
function StatRow({
  label,
  value,
  secondary,
}: {
  label: string
  value: string
  secondary?: boolean
}) {
  return (
    <div className={cn('flex justify-between items-center', secondary && 'pl-3')}>
      <span className={cn('text-xs', secondary ? 'text-text-muted' : 'text-text-secondary')}>
        {label}
      </span>
      <span className={cn('text-xs font-mono', secondary ? 'text-text-muted' : 'text-text-primary')}>
        {value}
      </span>
    </div>
  )
}

/**
 * Breakdown section for model or agent token usage.
 */
function BreakdownSection({
  title,
  data,
}: {
  title: string
  data: Record<string, TokenModelSummary>
}) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null

  return (
    <div className="space-y-1">
      <span className="text-xs text-text-muted uppercase tracking-wide">{title}</span>
      {entries.map(([name, summary]) => (
        <StatRow
          key={name}
          label={name}
          value={`${formatTokenCount(summary.input)} / ${formatTokenCount(summary.output)}`}
          secondary
        />
      ))}
    </div>
  )
}

/**
 * TokenBurnRateWidget - Displays token consumption statistics.
 * Shows total input/output tokens, breakdown by model and agent,
 * and estimated cost in USD when available.
 */
export function TokenBurnRateWidget({ className }: TokenBurnRateWidgetProps) {
  const { summary, loading, error } = useTokenSummary()

  const totalTokens = summary.total_input + summary.total_output
  const hasData = totalTokens > 0 || loading

  return (
    <div className={cn('rounded-lg border border-border bg-bg-secondary overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <span className="text-base flex-shrink-0" aria-hidden="true">
          🔥
        </span>
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Token Usage
        </span>
        {loading && (
          <span className="text-xs text-text-muted animate-pulse ml-auto">Loading...</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Error state */}
        {error && (
          <div className="text-sm text-status-blocked p-3 bg-status-blocked/10 rounded-md">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !hasData && (
          <div className="text-sm text-text-muted text-center py-4">
            No token usage data
          </div>
        )}

        {/* Loading skeleton */}
        {loading && totalTokens === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 rounded bg-bg-tertiary animate-pulse" />
            ))}
          </div>
        )}

        {/* Token totals */}
        {(totalTokens > 0 || (!loading && !error)) && (
          <>
            <div className="space-y-2">
              <StatRow label="Input tokens" value={formatTokenCount(summary.total_input)} />
              <StatRow label="Output tokens" value={formatTokenCount(summary.total_output)} />
              <StatRow label="Total" value={formatTokenCount(totalTokens)} />
              {summary.total_cost_usd !== undefined && summary.total_cost_usd > 0 && (
                <StatRow label="Est. cost" value={formatCost(summary.total_cost_usd)} />
              )}
            </div>

            {/* Breakdown by model */}
            <BreakdownSection title="By Model" data={summary.by_model} />

            {/* Breakdown by agent */}
            <BreakdownSection title="By Agent" data={summary.by_agent} />
          </>
        )}
      </div>
    </div>
  )
}

export default TokenBurnRateWidget
