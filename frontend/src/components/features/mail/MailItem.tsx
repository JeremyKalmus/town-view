import { useState } from 'react'
import type { Mail } from '@/types'
import { cn, formatRelativeTime } from '@/lib/utils'

export interface MailItemProps {
  mail: Mail
  onClick?: () => void
}

/**
 * MailItem - Displays a single mail message in a compact single-line format.
 * Supports expandable preview on click.
 */
export function MailItem({ mail, onClick }: MailItemProps) {
  const [expanded, setExpanded] = useState(false)

  const handleClick = () => {
    setExpanded((prev) => !prev)
    onClick?.()
  }

  return (
    <div
      className={cn(
        'py-2 px-3 hover:bg-bg-tertiary/50 transition-colors cursor-pointer',
        !mail.read && 'bg-status-in-progress/5'
      )}
      onClick={handleClick}
    >
      {/* Compact single-line view */}
      <div className="flex items-center gap-3">
        {/* Unread indicator */}
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            mail.read ? 'bg-transparent' : 'bg-status-in-progress'
          )}
          aria-label={mail.read ? 'Read' : 'Unread'}
        />

        {/* From */}
        <span
          className={cn(
            'text-sm w-24 flex-shrink-0 truncate',
            mail.read ? 'text-text-secondary' : 'text-text-primary font-medium'
          )}
          title={mail.from}
        >
          {mail.from}
        </span>

        {/* Subject */}
        <span
          className={cn(
            'text-sm flex-1 truncate min-w-0',
            mail.read ? 'text-text-secondary' : 'text-text-primary'
          )}
          title={mail.subject}
        >
          {mail.subject}
        </span>

        {/* Timestamp */}
        <span className="text-xs text-text-muted flex-shrink-0 w-16 text-right">
          {formatRelativeTime(mail.timestamp)}
        </span>

        {/* Expand indicator */}
        <span
          className={cn(
            'text-text-muted text-xs transition-transform flex-shrink-0',
            expanded && 'rotate-90'
          )}
        >
          ▶
        </span>
      </div>

      {/* Expandable preview */}
      {expanded && (
        <div className="mt-2 pl-5 pr-3">
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {mail.preview}
          </p>
        </div>
      )}
    </div>
  )
}
