import type { HistoryEntry } from '@/types'
import { cn, formatRelativeTime } from '@/lib/utils'

interface HistoryTabProps {
  entries: HistoryEntry[]
  className?: string
}

/**
 * HistoryTab displays an audit trail of changes for an issue.
 * Shows timestamp, actor, field, and old→new values.
 * Scrollable list, newest first, read-only.
 */
export function HistoryTab({ entries, className }: HistoryTabProps) {
  // Sort entries by timestamp, newest first
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  if (sortedEntries.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No history available
      </div>
    )
  }

  return (
    <div className={cn('overflow-y-auto', className)}>
      <div className="space-y-1">
        {sortedEntries.map((entry) => (
          <HistoryEntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

interface HistoryEntryRowProps {
  entry: HistoryEntry
}

function HistoryEntryRow({ entry }: HistoryEntryRowProps) {
  return (
    <div
      className={cn(
        'px-3 py-2 rounded-md',
        'bg-bg-secondary border border-border',
        'transition-colors duration-100',
        'hover:bg-bg-tertiary'
      )}
    >
      {/* Header row: timestamp and actor */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-text-muted mono" title={entry.timestamp}>
          {formatRelativeTime(entry.timestamp)}
        </span>
        <span className="text-text-muted">·</span>
        <span className="text-sm text-text-secondary truncate">{entry.actor}</span>
      </div>

      {/* Change details: field and values */}
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-text-secondary font-medium">{entry.field}</span>
        <span className="text-text-muted">:</span>
        <span className="flex items-center gap-1.5 min-w-0">
          {entry.old_value !== null ? (
            <span className="text-status-blocked/80 line-through truncate max-w-[120px]" title={entry.old_value}>
              {entry.old_value}
            </span>
          ) : (
            <span className="text-text-muted italic">none</span>
          )}
          <span className="text-text-muted flex-shrink-0">→</span>
          {entry.new_value !== null ? (
            <span className="text-status-closed truncate max-w-[120px]" title={entry.new_value}>
              {entry.new_value}
            </span>
          ) : (
            <span className="text-text-muted italic">none</span>
          )}
        </span>
      </div>
    </div>
  )
}
