import { useState, useCallback } from 'react'
import { cn } from '@/lib/class-utils'
import { useActiveConvoys } from '@/hooks/useActiveConvoys'
import { ConvoyGroupHeader } from './ConvoyGroupHeader'
import { ConvoyChildList } from './ConvoyChildList'
import type { ConvoyChild } from '@/hooks/useConvoyChildren'

export interface ActiveConvoysPanelProps {
  rigId: string
  defaultExpanded?: boolean
  className?: string
  /** Callback when a child task is clicked */
  onTaskClick?: (child: ConvoyChild) => void
}

/**
 * ActiveConvoysPanel - Collapsible panel showing active convoys with progress.
 * Uses polling to keep convoy data fresh and displays each convoy
 * with its progress badge using ConvoyGroupHeader.
 * Uses CSS Grid animation for smooth expand/collapse without JS measurement.
 */
export function ActiveConvoysPanel({
  rigId,
  defaultExpanded = true,
  className,
  onTaskClick,
}: ActiveConvoysPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  // Track which convoys are expanded (for lazy loading children)
  const [expandedConvoys, setExpandedConvoys] = useState<Set<string>>(new Set())

  const { convoys, loading, error } = useActiveConvoys(rigId)

  // Handle individual convoy expansion toggle
  const handleConvoyToggle = useCallback((convoyId: string, expanded: boolean) => {
    setExpandedConvoys(prev => {
      const next = new Set(prev)
      if (expanded) {
        next.add(convoyId)
      } else {
        next.delete(convoyId)
      }
      return next
    })
  }, [])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  // Count completed convoys for the header badge
  const completedCount = convoys.filter(c => c.convoy.progress.completed === c.convoy.progress.total).length

  return (
    <div className={cn('rounded-lg border border-border bg-bg-secondary overflow-hidden', className)}>
      {/* Section header - clickable to toggle */}
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
        aria-controls="active-convoys-content"
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

        {/* Section icon */}
        <span className="text-base flex-shrink-0" aria-hidden="true">
          🚚
        </span>

        {/* Section title */}
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex-shrink-0">
          ACTIVE CONVOYS
        </span>

        {/* Count badge */}
        {!loading && convoys.length > 0 && (
          <span className="text-xs text-text-muted">
            {completedCount}/{convoys.length}
          </span>
        )}

        {/* Loading indicator */}
        {loading && convoys.length === 0 && (
          <span className="text-xs text-text-muted animate-pulse">Loading...</span>
        )}
      </div>

      {/* Collapsible content - uses CSS Grid for smooth animation without JS measurement */}
      <div
        id="active-convoys-content"
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
        aria-hidden={!isExpanded}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-border p-4 space-y-3">
          {/* Error state */}
          {error && (
            <div className="text-sm text-status-blocked p-3 bg-status-blocked/10 rounded-md">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && convoys.length === 0 && (
            <div className="text-sm text-text-muted text-center py-4">
              No active convoys
            </div>
          )}

          {/* Loading skeleton */}
          {loading && convoys.length === 0 && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-14 rounded-lg bg-bg-tertiary animate-pulse" />
              ))}
            </div>
          )}

          {/* Convoy list */}
          {convoys.map(convoy => (
            <ConvoyGroupHeader
              key={convoy.id}
              convoyId={convoy.convoy.id}
              title={convoy.convoy.title}
              progress={convoy.convoy.progress}
              itemCount={convoy.convoy.progress.total}
              onToggle={(expanded) => handleConvoyToggle(convoy.convoy.id, expanded)}
            >
              <ConvoyChildList
                rigId={rigId}
                convoyId={convoy.convoy.id}
                expanded={expandedConvoys.has(convoy.convoy.id)}
                onTaskClick={onTaskClick}
              />
            </ConvoyGroupHeader>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActiveConvoysPanel
