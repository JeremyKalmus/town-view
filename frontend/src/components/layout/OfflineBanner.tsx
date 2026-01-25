/**
 * Offline Banner Component
 * Shows a banner when the app is offline.
 */

import { WifiOff, RefreshCw } from 'lucide-react'
import { useConnectivityStore } from '@/stores/connectivity-store'
import { cn } from '@/lib/class-utils'

interface OfflineBannerProps {
  onRetry?: () => void
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { status, lastOnline } = useConnectivityStore()

  if (status === 'online') {
    return null
  }

  const isReconnecting = status === 'reconnecting'
  const timeAgo = lastOnline ? getTimeAgo(lastOnline) : null

  return (
    <div
      className={cn(
        'px-4 py-2 flex items-center justify-between text-sm transition-colors',
        isReconnecting
          ? 'bg-yellow-900/30 border-b border-yellow-700/50'
          : 'bg-red-900/30 border-b border-red-700/50'
      )}
    >
      <div className="flex items-center gap-2">
        {isReconnecting ? (
          <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className={cn(isReconnecting ? 'text-yellow-200' : 'text-red-200')}>
          {isReconnecting ? 'Reconnecting...' : 'You are offline'}
        </span>
        {timeAgo && !isReconnecting && (
          <span className="text-text-muted">
            Last online: {timeAgo}
          </span>
        )}
      </div>

      {!isReconnecting && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
