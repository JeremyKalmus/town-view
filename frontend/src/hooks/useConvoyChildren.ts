/**
 * Hook for fetching child issues of a convoy.
 * Used to display expanded convoy contents in the monitoring view.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Issue } from '@/types'

export interface ConvoyChild {
  id: string
  title: string
  status: Issue['status']
  assignee?: string
  updated_at: string
}

export interface UseConvoyChildrenOptions {
  /** Only fetch when enabled (default: false for lazy loading) */
  enabled?: boolean
}

export interface UseConvoyChildrenResult {
  /** Child issues of the convoy */
  children: ConvoyChild[]
  /** Whether data is currently being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refresh */
  refresh: () => void
}

/**
 * Fetch child issues for a convoy.
 * Only fetches when enabled, allowing lazy loading when convoy is expanded.
 *
 * @param rigId - The rig ID
 * @param convoyId - The convoy ID to get children for
 * @param options - Optional configuration
 * @returns Children, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { children, loading, error } = useConvoyChildren(rigId, convoyId, {
 *   enabled: isExpanded  // Only fetch when convoy is expanded
 * })
 * ```
 */
export function useConvoyChildren(
  rigId: string | undefined,
  convoyId: string | undefined,
  options: UseConvoyChildrenOptions = {}
): UseConvoyChildrenResult {
  const { enabled = false } = options

  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchIssues = useCallback(async () => {
    if (!rigId || !convoyId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all issues for the rig (we could optimize this with a parent filter on the server)
      const url = `/api/rigs/${rigId}/issues?all=true`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.statusText}`)
      }

      const issues: Issue[] = await response.json()

      if (mountedRef.current) {
        setAllIssues(issues)
        setHasFetched(true)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch convoy children'
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [rigId, convoyId])

  // Fetch when enabled and not yet fetched
  useEffect(() => {
    if (enabled && !hasFetched && rigId && convoyId) {
      fetchIssues()
    }
  }, [enabled, hasFetched, rigId, convoyId, fetchIssues])

  // Reset when convoy changes
  useEffect(() => {
    setHasFetched(false)
    setAllIssues([])
    setError(null)
  }, [convoyId])

  // Filter to direct children of the convoy
  const children: ConvoyChild[] = useMemo(() => {
    if (!convoyId || allIssues.length === 0) {
      return []
    }

    const prefix = convoyId + '.'

    return allIssues
      .filter(issue => {
        // Must start with convoy prefix
        if (!issue.id.startsWith(prefix)) return false
        // Must be a direct child (no more dots after the prefix)
        const suffix = issue.id.slice(prefix.length)
        return !suffix.includes('.')
      })
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        assignee: issue.assignee,
        updated_at: issue.updated_at,
      }))
      .sort((a, b) => {
        // Sort by status: in_progress first, then open, then closed
        const statusOrder: Record<string, number> = {
          in_progress: 0,
          open: 1,
          blocked: 2,
          closed: 3,
        }
        const aOrder = statusOrder[a.status] ?? 4
        const bOrder = statusOrder[b.status] ?? 4
        if (aOrder !== bOrder) return aOrder - bOrder
        // Then by update time (most recent first)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
  }, [convoyId, allIssues])

  return {
    children,
    loading,
    error,
    refresh: fetchIssues,
  }
}
