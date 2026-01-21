import { useCallback, useMemo, useState, useEffect } from 'react'
import type { Issue } from '@/types'
import { cn, formatDate } from '@/lib/utils'

export type ConvoySortBy = 'date' | 'name'

export interface ConvoySelectorProps {
  /** Available convoys to select from */
  convoys: Issue[]
  /** Currently selected convoy ID */
  selectedConvoyId?: string
  /** Called when a convoy is selected */
  onSelect: (convoy: Issue | null) => void
  /** Sort convoys by date or name */
  sortBy?: ConvoySortBy
  /** Called when sort order changes */
  onSortChange?: (sortBy: ConvoySortBy) => void
  /** Show loading state */
  loading?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Maps issue status to convoy display status.
 * For audit purposes, convoys are either "active" (in progress) or "completed" (closed).
 */
function getConvoyStatus(status: Issue['status']): 'active' | 'completed' {
  return status === 'closed' ? 'completed' : 'active'
}

/**
 * Returns CSS class for convoy status indicator.
 */
function getConvoyStatusClass(status: 'active' | 'completed'): string {
  return status === 'completed'
    ? 'text-status-closed'
    : 'text-status-in-progress'
}

/**
 * Convoy selector dropdown for audit view.
 * Lists convoys by date/name with status indicators.
 */
export function ConvoySelector({
  convoys,
  selectedConvoyId,
  onSelect,
  sortBy = 'date',
  onSortChange,
  loading = false,
  className,
}: ConvoySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Sort convoys based on sortBy preference
  const sortedConvoys = useMemo(() => {
    const sorted = [...convoys]
    if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
    return sorted
  }, [convoys, sortBy])

  // Find selected convoy
  const selectedConvoy = useMemo(() => {
    return convoys.find((c) => c.id === selectedConvoyId) ?? null
  }, [convoys, selectedConvoyId])

  // Handle convoy selection
  const handleSelect = useCallback(
    (convoyId: string) => {
      const convoy = convoys.find((c) => c.id === convoyId) ?? null
      onSelect(convoy)
      setIsOpen(false)
    },
    [convoys, onSelect]
  )

  // Handle clear selection
  const handleClear = useCallback(() => {
    onSelect(null)
    setIsOpen(false)
  }, [onSelect])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-convoy-selector]')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectClass =
    'bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-rust hover:border-border-accent transition-colors cursor-pointer'

  return (
    <div className={cn('relative', className)} data-convoy-selector>
      {/* Label and Sort Toggle */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-text-secondary">
          Select Convoy
        </label>
        {onSortChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Sort by:</span>
            <button
              type="button"
              onClick={() => onSortChange(sortBy === 'date' ? 'name' : 'date')}
              className="text-xs text-accent-rust hover:text-accent-rust/80 transition-colors underline underline-offset-2"
            >
              {sortBy === 'date' ? 'Date' : 'Name'}
            </button>
          </div>
        )}
      </div>

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          selectClass,
          'w-full flex items-center justify-between',
          loading && 'opacity-50 cursor-not-allowed'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          {loading ? (
            <span className="text-text-muted">Loading convoys...</span>
          ) : selectedConvoy ? (
            <>
              <span
                className={cn(
                  'text-xs font-medium',
                  getConvoyStatusClass(getConvoyStatus(selectedConvoy.status))
                )}
              >
                {getConvoyStatus(selectedConvoy.status) === 'completed' ? '✓' : '◐'}
              </span>
              <span className="truncate">{selectedConvoy.title}</span>
              <span className="text-text-muted text-xs">
                ({formatDate(selectedConvoy.created_at)})
              </span>
            </>
          ) : (
            <span className="text-text-muted">Select a convoy...</span>
          )}
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-bg-secondary border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {/* Clear option */}
          {selectedConvoy && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-tertiary border-b border-border"
            >
              Clear selection
            </button>
          )}

          {/* Empty state */}
          {sortedConvoys.length === 0 && (
            <div className="px-3 py-4 text-sm text-text-muted text-center">
              No convoys available
            </div>
          )}

          {/* Convoy list */}
          {sortedConvoys.map((convoy) => {
            const convoyStatus = getConvoyStatus(convoy.status)
            const isSelected = convoy.id === selectedConvoyId

            return (
              <button
                key={convoy.id}
                type="button"
                onClick={() => handleSelect(convoy.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors',
                  'flex items-center gap-2',
                  isSelected && 'bg-bg-tertiary border-l-2 border-l-accent-rust'
                )}
                role="option"
                aria-selected={isSelected}
              >
                <span
                  className={cn(
                    'text-xs font-medium flex-shrink-0',
                    getConvoyStatusClass(convoyStatus)
                  )}
                >
                  {convoyStatus === 'completed' ? '✓' : '◐'}
                </span>
                <span className="truncate flex-1">{convoy.title}</span>
                <span className="text-text-muted text-xs flex-shrink-0">
                  {formatDate(convoy.created_at)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
