import { useEffect, useRef, useCallback } from 'react'
import type { Mail } from '@/types'
import { MailItem } from './MailItem'
import { cn } from '@/lib/utils'

export interface ActivityStreamProps {
  messages: Mail[]
  loading?: boolean
  error?: string | null
  unreadCount?: number
  hasMore?: boolean
  onLoadMore?: () => void
  onMailClick?: (mail: Mail) => void
  onMarkAllAsRead?: () => void
  className?: string
}

/**
 * ActivityStream - Renders a scrollable list of mail messages.
 * Supports infinite scroll for loading more messages.
 */
export function ActivityStream({
  messages,
  loading = false,
  error = null,
  unreadCount = 0,
  hasMore = false,
  onLoadMore,
  onMailClick,
  onMarkAllAsRead,
  className,
}: ActivityStreamProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px',
        threshold: 0,
      }
    )

    const trigger = loadMoreTriggerRef.current
    if (trigger) {
      observer.observe(trigger)
    }

    return () => {
      if (trigger) {
        observer.unobserve(trigger)
      }
    }
  }, [hasMore, loading, onLoadMore])

  const handleMailClick = useCallback(
    (mail: Mail) => {
      onMailClick?.(mail)
    },
    [onMailClick]
  )

  return (
    <div className={cn('card', className)}>
      {/* Header with unread count and mark all as read */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mail Stream</span>
          {unreadCount > 0 && (
            <span className="badge bg-status-in-progress/20 text-status-in-progress text-xs">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <button
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            onClick={onMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto max-h-[400px] divide-y divide-border/50"
      >
        {error ? (
          <div className="py-8 text-center text-status-blocked text-sm">
            {error}
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="py-8 text-center text-text-muted">
            No messages yet
          </div>
        ) : (
          <>
            {messages.map((mail) => (
              <MailItem
                key={mail.id}
                mail={mail}
                onClick={() => handleMailClick(mail)}
              />
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="py-4 text-center">
                {loading ? (
                  <span className="text-xs text-text-muted">Loading more...</span>
                ) : (
                  <span className="text-xs text-text-muted">Scroll for more</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Initial loading state */}
        {loading && messages.length === 0 && (
          <div className="py-8 text-center">
            <span className="text-sm text-text-muted">Loading messages...</span>
          </div>
        )}
      </div>
    </div>
  )
}
