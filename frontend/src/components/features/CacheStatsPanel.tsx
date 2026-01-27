import { useDataStore, selectCacheStats } from '@/stores/data-store'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/status-utils'

/**
 * CacheStatsPanel displays cache performance metrics from the Query Service.
 * Shows entry counts, hit/miss ratios, TTL configurations, and last invalidation time.
 */
export function CacheStatsPanel() {
  const cacheStats = useDataStore(selectCacheStats)

  // If no cache stats available yet, show loading state
  if (!cacheStats) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Cache Statistics</h3>
        <div className="text-text-muted text-sm">Loading cache statistics...</div>
      </div>
    )
  }

  // Calculate hit rate percentage
  const totalRequests = cacheStats.hit_count + cacheStats.miss_count
  const hitRate = totalRequests > 0
    ? (cacheStats.hit_count / totalRequests * 100).toFixed(1)
    : '0.0'

  // Determine hit rate badge color
  const hitRateNum = parseFloat(hitRate)
  const hitRateColor: 'success' | 'warning' | 'error' =
    hitRateNum >= 80 ? 'success' :
    hitRateNum >= 50 ? 'warning' :
    'error'

  // Calculate total cache entries
  const totalEntries =
    cacheStats.issue_entries +
    cacheStats.issue_list_entries +
    cacheStats.dependency_entries +
    cacheStats.convoy_progress_entries

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Cache Statistics</h3>
        <Badge
          variant="status"
          status={`${hitRate}% hit rate`}
          color={hitRateColor}
        />
      </div>

      {/* Cache entries by type */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-text-secondary mb-2">Cache Entries</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Issues</span>
            <span className="mono text-text-primary">{cacheStats.issue_entries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Issue Lists</span>
            <span className="mono text-text-primary">{cacheStats.issue_list_entries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Dependencies</span>
            <span className="mono text-text-primary">{cacheStats.dependency_entries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Convoy Progress</span>
            <span className="mono text-text-primary">{cacheStats.convoy_progress_entries}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-medium">Total</span>
            <span className="mono font-medium">{totalEntries}</span>
          </div>
        </div>
      </div>

      {/* Hit/Miss statistics */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-text-secondary mb-2">Hit/Miss Statistics</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Hits</span>
            <span className="mono text-text-primary">{cacheStats.hit_count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Misses</span>
            <span className="mono text-text-primary">{cacheStats.miss_count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-medium">Total Requests</span>
            <span className="mono font-medium">{totalRequests.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* TTL Configuration */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-text-secondary mb-2">TTL Configuration</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Issues</span>
            <span className="mono text-text-primary">{cacheStats.issues_ttl_seconds}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Convoy Progress</span>
            <span className="mono text-text-primary">{cacheStats.convoy_progress_ttl_seconds}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Dependencies</span>
            <span className="mono text-text-primary">{cacheStats.dependencies_ttl_seconds}s</span>
          </div>
        </div>
      </div>

      {/* Last invalidation */}
      <div className="text-sm">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Last invalidation</span>
          <span className="text-text-muted">
            {formatRelativeTime(cacheStats.last_invalidation)}
          </span>
        </div>
      </div>
    </div>
  )
}
