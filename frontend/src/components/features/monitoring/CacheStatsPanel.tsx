import { cn } from '@/lib/class-utils'
import { useDataStore, selectCacheStats } from '@/stores/data-store'
import { formatRelativeTime } from '@/lib/status-utils'
import type { CacheStats } from '@/types'

export interface CacheStatsPanelProps {
  className?: string
}

function hitRate(stats: CacheStats): string {
  const total = stats.hit_count + stats.miss_count
  if (total === 0) return '0%'
  return `${((stats.hit_count / total) * 100).toFixed(1)}%`
}

function StatRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={cn('text-xs font-mono', muted ? 'text-text-muted' : 'text-text-primary')}>
        {value}
      </span>
    </div>
  )
}

/**
 * CacheStatsPanel - Displays Query Service cache performance metrics.
 * Shows cache entry counts, hit/miss ratio, and TTL configuration.
 * Data comes from WebSocket snapshots (real-time).
 */
export function CacheStatsPanel({ className }: CacheStatsPanelProps) {
  const cacheStats = useDataStore(selectCacheStats)

  if (!cacheStats) {
    return (
      <div className={cn('rounded-lg border border-border bg-bg-secondary p-4', className)}>
        <div className="text-sm text-text-muted text-center py-4">
          No cache statistics available
        </div>
      </div>
    )
  }

  const totalEntries =
    cacheStats.issue_entries +
    cacheStats.issue_list_entries +
    cacheStats.dependency_entries +
    cacheStats.convoy_progress_entries

  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="section-header">CACHE PERFORMANCE</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-text-muted uppercase tracking-wider">Hit Rate</div>
          <div className={cn(
            'text-xl font-bold',
            cacheStats.hit_count + cacheStats.miss_count > 0
              ? 'text-status-closed'
              : 'text-text-muted'
          )}>
            {hitRate(cacheStats)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-text-muted uppercase tracking-wider">Total Entries</div>
          <div className="text-xl font-bold text-text-primary">{totalEntries}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-muted uppercase tracking-wider">Hits / Misses</div>
          <div className="text-xl font-bold text-text-primary">
            {cacheStats.hit_count} / {cacheStats.miss_count}
          </div>
        </div>
      </div>

      {/* Cache entries breakdown */}
      <div className="card">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Cache Entries</h3>
        <div className="space-y-2">
          <StatRow label="Issue entries" value={cacheStats.issue_entries.toString()} />
          <StatRow label="Issue list entries" value={cacheStats.issue_list_entries.toString()} />
          <StatRow label="Dependency entries" value={cacheStats.dependency_entries.toString()} />
          <StatRow label="Convoy progress entries" value={cacheStats.convoy_progress_entries.toString()} />
        </div>
      </div>

      {/* TTL configuration */}
      <div className="card">
        <h3 className="text-sm font-medium text-text-secondary mb-3">TTL Configuration</h3>
        <div className="space-y-2">
          <StatRow label="Issues TTL" value={`${cacheStats.issues_ttl_seconds}s`} muted />
          <StatRow label="Convoy progress TTL" value={`${cacheStats.convoy_progress_ttl_seconds}s`} muted />
          <StatRow label="Dependencies TTL" value={`${cacheStats.dependencies_ttl_seconds}s`} muted />
        </div>
      </div>

      {/* Last invalidation */}
      {cacheStats.last_invalidation && cacheStats.last_invalidation !== '0001-01-01T00:00:00Z' && (
        <div className="text-xs text-text-muted">
          Last cache invalidation: {formatRelativeTime(cacheStats.last_invalidation)}
        </div>
      )}
    </div>
  )
}

export default CacheStatsPanel
