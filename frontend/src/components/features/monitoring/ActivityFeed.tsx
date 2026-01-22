import type { ActivityEvent } from '@/types'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'

const MAX_EVENTS = 100

interface ActivityFeedProps {
  events: ActivityEvent[]
  onEventClick?: (event: ActivityEvent) => void
  className?: string
}

/**
 * Returns the icon for an event type.
 * status_changed=↻, assigned=→, blocked=⊗, completed=✓
 */
function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'status_changed':
      return '↻'
    case 'assigned':
      return '→'
    case 'blocked':
      return '⊗'
    case 'completed':
      return '✓'
    default:
      return '•'
  }
}

/**
 * Returns the CSS class for an event type icon.
 */
function getEventIconClass(eventType: string): string {
  switch (eventType) {
    case 'status_changed':
      return 'text-status-in-progress'
    case 'assigned':
      return 'text-accent-primary'
    case 'blocked':
      return 'text-status-blocked'
    case 'completed':
      return 'text-status-closed'
    default:
      return 'text-text-muted'
  }
}

/**
 * ActivityFeed displays a scrollable list of recent activity events.
 * Shows icon, title, time, and actor for each event.
 * Supports click handling for navigation.
 */
export function ActivityFeed({ events, onEventClick, className }: ActivityFeedProps) {
  // Sort events by timestamp, newest first, limit to max
  const sortedEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_EVENTS)

  if (sortedEvents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No recent activity
      </div>
    )
  }

  return (
    <div className={cn('overflow-y-auto', className)}>
      <div className="space-y-1">
        {sortedEvents.map((event) => (
          <ActivityEventRow
            key={event.id}
            event={event}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

interface ActivityEventRowProps {
  event: ActivityEvent
  onClick?: (event: ActivityEvent) => void
}

function ActivityEventRow({ event, onClick }: ActivityEventRowProps) {
  const icon = getEventIcon(event.event_type)
  const iconClass = getEventIconClass(event.event_type)
  const isClickable = !!onClick

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-md',
        'bg-bg-secondary border border-border',
        'transition-colors duration-100',
        'hover:bg-bg-tertiary',
        isClickable && 'cursor-pointer'
      )}
      onClick={() => onClick?.(event)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.(event)
        }
      }}
    >
      {/* Header row: icon, title, time */}
      <div className="flex items-center gap-2 mb-1">
        <span className={cn('text-sm font-medium', iconClass)} aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm text-text-primary truncate flex-1" title={event.title}>
          {event.title}
        </span>
        <span className="text-xs text-text-muted mono flex-shrink-0" title={event.timestamp}>
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>

      {/* Detail row: actor and change */}
      <div className="flex items-center gap-2 text-xs text-text-secondary pl-5">
        <span className="truncate">{event.actor}</span>
        {event.old_value !== null || event.new_value !== null ? (
          <>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1 min-w-0">
              {event.old_value !== null && (
                <span className="text-text-muted line-through truncate max-w-[80px]" title={event.old_value}>
                  {event.old_value}
                </span>
              )}
              {event.old_value !== null && event.new_value !== null && (
                <span className="text-text-muted">→</span>
              )}
              {event.new_value !== null && (
                <span className="truncate max-w-[80px]" title={event.new_value}>
                  {event.new_value}
                </span>
              )}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
