import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import { useRegressions } from '@/hooks/useRegressions'
import { Badge } from '@/components/ui/Badge'
import type { TestRegression } from '@/types'

export interface TestRegressionsPanelProps {
  defaultExpanded?: boolean
  className?: string
  /** If true, hides the entire panel when there are no regressions (default: true) */
  hideWhenEmpty?: boolean
}

/**
 * TestRegressionsPanel - Collapsible panel showing test regressions.
 * Displays tests that were passing but now fail, with details about
 * when they last passed and when they first failed.
 */
export function TestRegressionsPanel({
  defaultExpanded = true,
  className,
  hideWhenEmpty = true,
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

  // Hide the panel entirely when empty (no regressions, not loading, no error)
  // This must be AFTER all hooks are called to satisfy React's rules of hooks
  if (hideWhenEmpty && !loading && !error && regressions.length === 0) {
    return null
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
          <Badge status={String(regressions.length)} color="error" />
        )}

        {/* Loading indicator */}
        {loading && regressions.length === 0 && (
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
                <div key={i} className="h-16 rounded-lg bg-bg-tertiary animate-pulse" />
              ))}
            </div>
          )}

          {/* Regression list */}
          {regressions.map(regression => (
            <RegressionItem key={regression.test_name} regression={regression} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface RegressionItemProps {
  regression: TestRegression
}

/**
 * Individual regression item showing test details.
 */
function RegressionItem({ regression }: RegressionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Extract just the test name from the full path
  const displayName = regression.test_name.split('/').pop() || regression.test_name
  // Extract filename from path
  const fileName = regression.test_file.split('/').pop() || regression.test_file

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      {/* Regression header */}
      <button
        className={cn(
          'w-full flex items-start gap-3 p-3 text-left',
          'hover:bg-bg-tertiary/30 transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {/* Status indicator */}
        <span className="w-2 h-2 mt-1.5 rounded-full bg-status-blocked flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Test name */}
          <div className="font-medium text-sm text-text-primary truncate" title={regression.test_name}>
            {displayName}
          </div>

          {/* File path and timing */}
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
            <span className="truncate" title={regression.test_file}>{fileName}</span>
            <span className="flex-shrink-0">-</span>
            <span className="flex-shrink-0" title={`Last passed: ${regression.last_passed_at}`}>
              passed {formatRelativeTime(regression.last_passed_at)}
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          className={cn(
            'w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0 mt-0.5',
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

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-2 space-y-2 bg-bg-tertiary/20">
          {/* Last passed info */}
          <div className="text-xs">
            <span className="text-text-muted">Last passed:</span>
            <span className="ml-2 text-status-closed">
              {formatRelativeTime(regression.last_passed_at)}
              {regression.last_passed_commit && (
                <span className="ml-1 font-mono text-text-muted">
                  ({regression.last_passed_commit.slice(0, 7)})
                </span>
              )}
            </span>
          </div>

          {/* First failed info */}
          <div className="text-xs">
            <span className="text-text-muted">First failed:</span>
            <span className="ml-2 text-status-blocked">
              {formatRelativeTime(regression.first_failed_at)}
              {regression.first_failed_commit && (
                <span className="ml-1 font-mono text-text-muted">
                  ({regression.first_failed_commit.slice(0, 7)})
                </span>
              )}
            </span>
          </div>

          {/* Error message */}
          {regression.error_message && (
            <div className="text-xs">
              <span className="text-text-muted">Error:</span>
              <pre className="mt-1 p-2 rounded bg-bg-tertiary text-status-blocked overflow-x-auto whitespace-pre-wrap break-words text-xs font-mono">
                {regression.error_message}
              </pre>
            </div>
          )}

          {/* Full paths */}
          <div className="text-xs text-text-muted pt-1 border-t border-border/50">
            <div className="truncate" title={regression.test_name}>
              Test: {regression.test_name}
            </div>
            <div className="truncate" title={regression.test_file}>
              File: {regression.test_file}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestRegressionsPanel
