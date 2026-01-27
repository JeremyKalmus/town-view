/**
 * Hook for fetching child issues of a convoy.
 * Used to display expanded convoy contents in the monitoring view.
 *
 * Convoys track issues via dependencies (type: "tracks"), not parent/child naming.
 * The tracked issues may be in different rigs (external references like "external:townview:to-qsa2s.1").
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDataStore, selectIssuesByRig } from '@/stores/data-store'
import type { Issue } from '@/types'

// HQ rig ID where convoys live
const HQ_RIG_ID = 'hq'

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

// Parse external reference like "external:townview:to-qsa2s.1" -> { rig: "townview", id: "to-qsa2s.1" }
function parseExternalRef(ref: string): { rig: string; id: string } | null {
  if (!ref.startsWith('external:')) return null
  const parts = ref.slice('external:'.length).split(':')
  if (parts.length !== 2) return null
  return { rig: parts[0], id: parts[1] }
}

/**
 * Fetch child issues for a convoy by looking up its tracked dependencies.
 * Only fetches when enabled, allowing lazy loading when convoy is expanded.
 *
 * @param _rigId - The rig ID (kept for API compatibility, but convoys always come from HQ)
 * @param convoyId - The convoy ID to get children for
 * @param options - Optional configuration
 * @returns Children, loading state, error, and refresh function
 */
export function useConvoyChildren(
  _rigId: string | undefined,
  convoyId: string | undefined,
  options: UseConvoyChildrenOptions = {}
): UseConvoyChildrenResult {
  const { enabled = false } = options

  const [children, setChildren] = useState<ConvoyChild[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get HQ issues (where convoys live) from data store
  const hqIssues = useDataStore(selectIssuesByRig(HQ_RIG_ID))
  // Get townview issues (where tracked tasks likely live)
  const townviewIssues = useDataStore(selectIssuesByRig('townview'))

  // Track if component is mounted
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const resolveChildren = useCallback(() => {
    if (!convoyId) {
      setChildren([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Find the convoy in HQ issues
      const convoy = hqIssues.find(i => i.id === convoyId)
      if (!convoy) {
        // Convoy not found, show empty
        setChildren([])
        setLoading(false)
        return
      }

      // Get tracked dependencies from the convoy
      const trackedDeps = convoy.dependencies?.filter(d => d.type === 'tracks') ?? []

      // Resolve each tracked dependency to an issue
      const resolvedChildren: ConvoyChild[] = []

      for (const dep of trackedDeps) {
        const externalRef = parseExternalRef(dep.depends_on_id)

        if (externalRef) {
          // External reference - look up in the appropriate rig's issues
          const rigIssues = externalRef.rig === 'townview' ? townviewIssues : []
          const issue = rigIssues.find(i => i.id === externalRef.id)

          if (issue) {
            resolvedChildren.push({
              id: issue.id,
              title: issue.title,
              status: issue.status,
              assignee: issue.assignee,
              updated_at: issue.updated_at,
            })
          } else {
            // External issue not found in data store - show placeholder
            resolvedChildren.push({
              id: externalRef.id,
              title: `[${externalRef.rig}] ${externalRef.id}`,
              status: 'open', // Unknown, assume open
              updated_at: new Date().toISOString(),
            })
          }
        } else {
          // Local reference - look up in HQ issues
          const issue = hqIssues.find(i => i.id === dep.depends_on_id)
          if (issue) {
            resolvedChildren.push({
              id: issue.id,
              title: issue.title,
              status: issue.status,
              assignee: issue.assignee,
              updated_at: issue.updated_at,
            })
          }
        }
      }

      // Sort: in_progress first, then open, then closed
      const statusOrder: Record<string, number> = {
        in_progress: 0,
        open: 1,
        blocked: 2,
        closed: 3,
      }
      resolvedChildren.sort((a, b) => {
        const aOrder = statusOrder[a.status] ?? 4
        const bOrder = statusOrder[b.status] ?? 4
        if (aOrder !== bOrder) return aOrder - bOrder
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mountedRef.current) {
        setChildren(resolvedChildren)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to resolve convoy children'
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [convoyId, hqIssues, townviewIssues])

  // Resolve when enabled and data changes
  useEffect(() => {
    if (enabled && convoyId) {
      resolveChildren()
    }
  }, [enabled, convoyId, resolveChildren])

  // Reset when convoy changes
  useEffect(() => {
    setChildren([])
    setError(null)
  }, [convoyId])

  return {
    children,
    loading,
    error,
    refresh: resolveChildren,
  }
}
