import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/class-utils'
import { useRegressions } from '@/hooks/useRegressions'
import type { TestRegression } from '@/types'

export interface TestRegressionsPanelProps {
  defaultExpanded?: boolean
  className?: string
}

/**
 * Format a date string for display.
 * Shows relative time for recent dates, otherwise date.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Truncate commit SHA for display.
 */
function formatCommit(sha?: string): string {
  if (!sha) return ''
  return sha.substring(0, 7)
}

/**
 * Individual regression row component.
 */
function RegressionRow({ regression }: { regression: TestRegression }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-border rounded-md bg-bg-tertiary/30">
      {/* Row header - clickable to expand */}
      <div
        className={cn(
          'flex items-start gap-3 px-3 py-2 cursor-pointer',
          'hover:bg-bg-tertiary/50 transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        aria-expanded={isExpanded}
      >
        {/* Expand chevron */}
        <button
          className={cn(
            'w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5',
            'text-text-muted hover:text-text-primary',
            'transition-transform duration-200'
          )}
          tabIndex={-1}
        >
          <svg
            className={cn(
              'w-3 h-3 transition-transform duration-200',
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

        {/* Status indicator */}
        <span
          className="w-2 h-2 rounded-full bg-status-blocked flex-shrink-0 mt-1.5"
          title="Regression"
        />

        {/* Test info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {regression.test_name}
          </div>
          <div className="text-xs text-text-muted truncate">
            {regression.test_file}
          </div>
        </div>

        {/* Time info */}
        <div className="text-xs text-text-muted text-right flex-shrink-0">
          <div>Failed {formatDate(regression.first_failed_at)}</div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <div className="space-y-2 text-xs">
            {/* Last passed info */}
            <div className="flex gap-4">
              <div className="text-text-muted">Last passed:</div>
              <div className="text-text-secondary">
                {formatDate(regression.last_passed_at)}
                {regression.last_passed_commit && (
                  <span className="ml-2 font-mono text-text-muted">
                    ({formatCommit(regression.last_passed_commit)})
                  </span>
                )}
              </div>
            </div>

            {/* First failed info */}
            <div className="flex gap-4">
              <div className="text-text-muted">First failed:</div>
              <div className="text-text-secondary">
                {formatDate(regression.first_failed_at)}
                {regression.first_failed_commit && (
                  <span className="ml-2 font-mono text-text-muted">
                    ({formatCommit(regression.first_failed_commit)})
                  </span>
                )}
              </div>
            </div>

            {/* Error message */}
            {regression.error_message && (
              <div className="mt-2">
                <div className="text-text-muted mb-1">Error:</div>
                <div className="bg-bg-primary p-2 rounded text-status-blocked font-mono text-xs overflow-x-auto">
                  {regression.error_message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * TestRegressionsPanel - Collapsible panel showing test regressions.
 * Displays tests that were passing but are now failing.
 */
export function TestRegressionsPanel({
  defaultExpanded = true,
  className,
}: TestRegressionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  const { regressions, loading, error } = useRegressions()

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [regressions, loading, error])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

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
        aria-controls="test-regressions-content"
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
          <svg className="w-4 h-4 text-status-blocked" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>

        {/* Section title */}
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex-shrink-0">
          TEST REGRESSIONS
        </span>

        {/* Count badge */}
        {!loading && regressions.length > 0 && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            'bg-status-blocked/20 text-status-blocked'
          )}>
            {regressions.length}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <span className="text-xs text-text-muted animate-pulse">Loading...</span>
        )}
      </div>

      {/* Collapsible content */}
      <div
        id="test-regressions-content"
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
        <div className="border-t border-border p-4 space-y-3">
          {/* Error state */}
          {error && (
            <div className="text-sm text-status-blocked p-3 bg-status-blocked/10 rounded-md">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && regressions.length === 0 && (
            <div className="text-sm text-text-muted text-center py-4">
              No test regressions
            </div>
          )}

          {/* Loading skeleton */}
          {loading && regressions.length === 0 && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-14 rounded-lg bg-bg-tertiary animate-pulse" />
              ))}
            </div>
          )}

          {/* Regression list */}
          {regressions.map(regression => (
            <RegressionRow
              key={`${regression.test_file}:${regression.test_name}`}
              regression={regression}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TestRegressionsPanel
