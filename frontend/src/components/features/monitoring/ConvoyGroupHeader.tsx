import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ConvoyProgress } from '@/types/convoy'

export interface ConvoyGroupHeaderProps {
  /** Convoy ID (e.g., "hq-cv-abc") */
  convoyId: string
  /** Convoy title/description */
  title: string
  /** Progress tracking (completed/total) */
  progress: ConvoyProgress
  /** Number of items in this convoy group */
  itemCount: number
  /** Override default expansion behavior (auto-calculated based on itemCount if not provided) */
  defaultExpanded?: boolean
  /** Callback when expansion state changes */
  onToggle?: (expanded: boolean) => void
  /** Child WorkItemRows to display when expanded */
  children: React.ReactNode
}

/**
 * ConvoyGroupHeader - Collapsible header for grouping work items by convoy.
 * Used in MonitoringView to organize work items under their parent convoy.
 *
 * Features:
 * - Collapsible with smooth CSS transition
 * - Shows progress badge (X/Y completed)
 * - Auto-expands for small convoys (<5 items), collapses for larger ones
 * - Truck emoji to indicate convoy grouping
 */
export function ConvoyGroupHeader({
  convoyId,
  title,
  progress,
  itemCount,
  defaultExpanded,
  onToggle,
  children,
}: ConvoyGroupHeaderProps) {
  // Auto-calculate default expansion: expanded for <5 items, collapsed for >=5
  const computedDefaultExpanded = defaultExpanded ?? itemCount < 5
  const [isExpanded, setIsExpanded] = useState(computedDefaultExpanded)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [children])

  const handleToggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  // Determine progress badge color based on completion
  const isComplete = progress.completed === progress.total
  const progressBadgeClass = isComplete
    ? 'bg-status-closed/20 text-status-closed border-status-closed/30'
    : 'bg-bg-tertiary text-text-secondary border-border'

  return (
    <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
      {/* Header row - clickable to toggle */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          'cursor-pointer select-none',
          'hover:bg-bg-tertiary/50 transition-colors'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`convoy-content-${convoyId}`}
      >
        {/* Expand/collapse chevron */}
        <button
          className={cn(
            'w-5 h-5 flex items-center justify-center flex-shrink-0',
            'text-text-muted hover:text-text-primary',
            'transition-transform duration-200'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          tabIndex={-1}
        >
          <svg
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Convoy icon */}
        <span className="text-base flex-shrink-0" aria-hidden="true">
          🚚
        </span>

        {/* Convoy ID */}
        <span className="mono text-xs text-text-muted flex-shrink-0">
          {convoyId}
        </span>

        {/* Convoy title */}
        <span className="flex-1 truncate text-text-primary font-medium">
          {title}
        </span>

        {/* Progress badge */}
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border flex-shrink-0',
            progressBadgeClass
          )}
          title={`${progress.completed} of ${progress.total} completed (${progress.percentage}%)`}
        >
          {progress.completed}/{progress.total}
        </span>
      </div>

      {/* Collapsible content */}
      <div
        id={`convoy-content-${convoyId}`}
        ref={contentRef}
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
          isExpanded ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
        }}
        aria-hidden={!isExpanded}
      >
        <div className="border-t border-border">
          {children}
        </div>
      </div>
    </div>
  )
}

export default ConvoyGroupHeader
