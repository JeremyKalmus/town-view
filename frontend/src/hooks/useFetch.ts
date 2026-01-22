/**
 * Generic hook for fetching data with loading/error state management.
 * Extracts common fetch boilerplate from useAgents, useMail, useMoleculeProgress, etc.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseFetchOptions<T> {
  /** Whether to fetch on mount and when url changes (default: true) */
  enabled?: boolean
  /** Initial data value */
  initialData?: T
  /** Callback when fetch succeeds - use this to store data externally */
  onSuccess?: (data: T) => void
  /** Callback when fetch fails */
  onError?: (error: string) => void
  /** Custom error message prefix (default: 'Failed to fetch') */
  errorPrefix?: string
  /** Reset data to initialData on error (default: false) */
  clearOnError?: boolean
}

export interface UseFetchResult<T> {
  /** Fetched data (null if not yet fetched or error occurred) */
  data: T | null
  /** Whether fetch is in progress */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Extract error message from an unknown error value.
 */
export function extractErrorMessage(err: unknown, prefix: string = 'Failed to fetch'): string {
  if (err instanceof Error) {
    return err.message
  }
  return prefix
}

/**
 * Generic fetch hook that handles loading state, error state, and try/catch pattern.
 *
 * @param url - URL to fetch, or null/undefined to skip fetching
 * @param options - Optional configuration
 * @returns Fetch result with data, loading, error, and refetch
 *
 * @example
 * ```tsx
 * // Simple usage
 * const { data, loading, error } = useFetch<User[]>('/api/users')
 *
 * // With external state management
 * const { loading, error, refetch } = useFetch<Agent[]>(
 *   rigId ? `/api/rigs/${rigId}/agents` : null,
 *   {
 *     onSuccess: (data) => setAgents(data),
 *     onError: (msg) => console.error(msg),
 *   }
 * )
 *
 * // Conditional fetching
 * const { data } = useFetch<Profile>(
 *   `/api/profile/${userId}`,
 *   { enabled: isLoggedIn }
 * )
 * ```
 */
export function useFetch<T>(
  url: string | null | undefined,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    enabled = true,
    initialData,
    onSuccess,
    onError,
    errorPrefix = 'Failed to fetch',
    clearOnError = false,
  } = options

  const [data, setData] = useState<T | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!url) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`${errorPrefix}: ${response.statusText}`)
      }

      const result: T = await response.json()

      if (mountedRef.current) {
        setData(result)
        onSuccess?.(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = extractErrorMessage(err, errorPrefix)
        setError(message)
        onError?.(message)
        if (clearOnError) {
          setData(initialData ?? null)
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url, errorPrefix, onSuccess, onError, clearOnError, initialData])

  // Fetch on mount and when url changes (if enabled)
  useEffect(() => {
    if (enabled && url) {
      fetchData()
    }
  }, [enabled, url, fetchData])

  // Reset data when url becomes null/undefined
  useEffect(() => {
    if (!url) {
      setData(initialData ?? null)
      setError(null)
    }
  }, [url, initialData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
