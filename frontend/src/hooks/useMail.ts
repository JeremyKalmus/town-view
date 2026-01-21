/**
 * Hook for fetching and managing mail messages.
 * Supports real-time updates via WebSocket.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Mail, WSMessage } from '@/types'
import { useWebSocket } from './useWebSocket'

/** Maximum number of messages to display */
const MAX_MESSAGES = 50

export interface UseMailResult {
  /** List of mail messages (most recent first) */
  messages: Mail[]
  /** Whether messages are currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Number of unread messages */
  unreadCount: number
  /** Refetch messages */
  refetch: () => void
  /** Mark a message as read */
  markAsRead: (id: string) => void
  /** Mark all messages as read */
  markAllAsRead: () => void
  /** Load more messages (for infinite scroll) */
  loadMore: () => void
  /** Whether there are more messages to load */
  hasMore: boolean
}

/**
 * Fetch and manage mail messages with real-time WebSocket updates.
 *
 * @example
 * ```tsx
 * const { messages, loading, unreadCount, markAsRead } = useMail()
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
  const [messages, setMessages] = useState<Mail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'mail_received' && msg.payload) {
      const newMail = msg.payload as unknown as Mail
      setMessages((prev) => {
        // Add new message at the beginning, keep max limit
        const updated = [newMail, ...prev].slice(0, MAX_MESSAGES)
        return updated
      })
    }
  }, [])

  // Connect to WebSocket for real-time updates
  useWebSocket({
    onMessage: handleWebSocketMessage,
  })

  // Fetch messages from API
  const fetchMessages = useCallback(async (reset = true) => {
    setLoading(true)
    setError(null)

    const currentOffset = reset ? 0 : offset

    try {
      const response = await fetch(`/api/mail?limit=${MAX_MESSAGES}&offset=${currentOffset}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch mail: ${response.statusText}`)
      }

      const data: Mail[] = await response.json()

      if (reset) {
        setMessages(data)
        setOffset(data.length)
      } else {
        setMessages((prev) => [...prev, ...data])
        setOffset((prev) => prev + data.length)
      }

      // If we got fewer than requested, no more to load
      setHasMore(data.length === MAX_MESSAGES)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch mail'
      setError(message)
      if (reset) {
        setMessages([])
      }
    } finally {
      setLoading(false)
    }
  }, [offset])

  // Initial fetch
  useEffect(() => {
    fetchMessages(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate unread count
  const unreadCount = messages.filter((m) => !m.read).length

  // Mark single message as read
  const markAsRead = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, read: true } : msg))
    )

    // Optionally send to API (fire and forget)
    fetch(`/api/mail/${id}/read`, { method: 'POST' }).catch(() => {
      // Ignore errors for now
    })
  }, [])

  // Mark all messages as read
  const markAllAsRead = useCallback(() => {
    setMessages((prev) => prev.map((msg) => ({ ...msg, read: true })))

    // Optionally send to API (fire and forget)
    fetch('/api/mail/read-all', { method: 'POST' }).catch(() => {
      // Ignore errors for now
    })
  }, [])

  // Load more messages (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(false)
    }
  }, [loading, hasMore, fetchMessages])

  return {
    messages,
    loading,
    error,
    unreadCount,
    refetch: () => fetchMessages(true),
    markAsRead,
    markAllAsRead,
    loadMore,
    hasMore,
  }
}
