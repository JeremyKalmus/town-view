/**
 * Hook for accessing mail messages from the central data store.
 * Mail data is pushed via WebSocket and stored in the data store.
 */

import { useCallback, useMemo } from 'react'
import { useDataStore, selectMail } from '@/stores/data-store'
import type { Mail } from '@/types'

export interface UseMailResult {
  /** List of mail messages (most recent first) */
  messages: Mail[]
  /** Whether WebSocket is connected (data is live) */
  connected: boolean
  /** Number of unread messages */
  unreadCount: number
  /** Mark a message as read (local only, fire-and-forget to API) */
  markAsRead: (id: string) => void
  /** Mark all messages as read (local only, fire-and-forget to API) */
  markAllAsRead: () => void
}

/**
 * Access mail messages from the WebSocket-powered data store.
 *
 * @example
 * ```tsx
 * const { messages, connected, unreadCount, markAsRead } = useMail()
 *
 * return (
 *   <div>
 *     <span>Unread: {unreadCount}</span>
 *     {messages.map(msg => (
 *       <MailItem key={msg.id} mail={msg} onClick={() => markAsRead(msg.id)} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useMail(): UseMailResult {
  const messages = useDataStore(selectMail)
  const connected = useDataStore((state) => state.connected)

  // Calculate unread count
  const unreadCount = useMemo(
    () => messages.filter((m) => !m.read).length,
    [messages]
  )

  // Mark single message as read (fire and forget to API)
  const markAsRead = useCallback((id: string) => {
    // Note: The data store receives fresh snapshots, so we don't need to
    // update local state. The API call will update the server state,
    // which will be reflected in the next snapshot.
    fetch(`/api/mail/${id}/read`, { method: 'POST' }).catch(() => {
      // Ignore errors - next snapshot will have correct state
    })
  }, [])

  // Mark all messages as read (fire and forget to API)
  const markAllAsRead = useCallback(() => {
    fetch('/api/mail/read-all', { method: 'POST' }).catch(() => {
      // Ignore errors - next snapshot will have correct state
    })
  }, [])

  return {
    messages,
    connected,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
