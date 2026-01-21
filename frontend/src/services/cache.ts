/**
 * API Response Cache Service
 * Caches fetch responses in localStorage with TTL support.
 * Returns cached data when offline.
 */

import { useConnectivityStore } from '@/stores/connectivity-store'

const CACHE_PREFIX = 'townview_cache_'
const CACHE_META_KEY = 'townview_cache_meta'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheMeta {
  keys: string[]
  lastCleanup: number
}

/**
 * Get cache metadata
 */
function getCacheMeta(): CacheMeta {
  try {
    const meta = localStorage.getItem(CACHE_META_KEY)
    if (meta) {
      return JSON.parse(meta)
    }
  } catch {
    // Ignore parse errors
  }
  return { keys: [], lastCleanup: Date.now() }
}

/**
 * Save cache metadata
 */
function saveCacheMeta(meta: CacheMeta): void {
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta))
  } catch {
    // Storage might be full, try cleanup
    cleanupExpiredCache()
  }
}

/**
 * Generate cache key from URL
 */
function getCacheKey(url: string): string {
  return CACHE_PREFIX + btoa(url).replace(/[=+/]/g, '_')
}

/**
 * Get cached data for a URL
 */
export function getCache<T>(url: string): T | null {
  try {
    const key = getCacheKey(url)
    const cached = localStorage.getItem(key)

    if (!cached) {
      return null
    }

    const entry: CacheEntry<T> = JSON.parse(cached)
    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.ttl

    // For offline mode, return even expired cache
    const { status } = useConnectivityStore.getState()
    if (status === 'offline' || !isExpired) {
      return entry.data
    }

    // Cache expired and online - return null to trigger fresh fetch
    return null
  } catch {
    return null
  }
}

/**
 * Set cached data for a URL
 */
export function setCache<T>(url: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const key = getCacheKey(url)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }

    localStorage.setItem(key, JSON.stringify(entry))

    // Track the key in metadata
    const meta = getCacheMeta()
    if (!meta.keys.includes(key)) {
      meta.keys.push(key)
      saveCacheMeta(meta)
    }

    // Update connectivity store
    useConnectivityStore.getState().setHasCachedData(true)
  } catch (e) {
    // Storage might be full, try cleanup
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      cleanupExpiredCache()
      // Retry once after cleanup
      try {
        const key = getCacheKey(url)
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
        }
        localStorage.setItem(key, JSON.stringify(entry))
      } catch {
        // Give up if still failing
        console.warn('[Cache] Failed to save cache even after cleanup')
      }
    }
  }
}

/**
 * Remove cached data for a URL
 */
export function removeCache(url: string): void {
  try {
    const key = getCacheKey(url)
    localStorage.removeItem(key)

    const meta = getCacheMeta()
    meta.keys = meta.keys.filter((k) => k !== key)
    saveCacheMeta(meta)
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  try {
    const meta = getCacheMeta()
    for (const key of meta.keys) {
      localStorage.removeItem(key)
    }
    localStorage.removeItem(CACHE_META_KEY)
    useConnectivityStore.getState().setHasCachedData(false)
  } catch {
    // Ignore errors
  }
}

/**
 * Cleanup expired cache entries
 */
export function cleanupExpiredCache(): void {
  try {
    const meta = getCacheMeta()
    const now = Date.now()
    const validKeys: string[] = []

    for (const key of meta.keys) {
      const cached = localStorage.getItem(key)
      if (!cached) {
        continue
      }

      try {
        const entry = JSON.parse(cached) as CacheEntry<unknown>
        if (now - entry.timestamp <= entry.ttl) {
          validKeys.push(key)
        } else {
          localStorage.removeItem(key)
        }
      } catch {
        localStorage.removeItem(key)
      }
    }

    meta.keys = validKeys
    meta.lastCleanup = now
    saveCacheMeta(meta)

    // Update hasCachedData based on remaining keys
    useConnectivityStore.getState().setHasCachedData(validKeys.length > 0)
  } catch {
    // Ignore errors
  }
}

/**
 * Check if there is any cached data
 */
export function hasCachedData(): boolean {
  const meta = getCacheMeta()
  return meta.keys.length > 0
}

// Expose cache clearing globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { clearTownViewCache: () => void }).clearTownViewCache = clearAllCache
}

/**
 * Get the timestamp of cached data for a URL
 */
export function getCacheTimestamp(url: string): number | null {
  try {
    const key = getCacheKey(url)
    const cached = localStorage.getItem(key)
    if (!cached) {
      return null
    }
    const entry = JSON.parse(cached) as CacheEntry<unknown>
    return entry.timestamp
  } catch {
    return null
  }
}

export interface CachedFetchOptions extends RequestInit {
  /** Cache TTL in milliseconds */
  cacheTTL?: number
  /** Skip cache and always fetch fresh */
  skipCache?: boolean
  /** Return stale cache on error */
  returnStaleOnError?: boolean
}

export interface CachedFetchResult<T> {
  data: T | null
  fromCache: boolean
  error: string | null
}

/**
 * Fetch with caching support.
 * Returns cached data when offline or when fetch fails.
 */
export async function cachedFetch<T>(
  url: string,
  options: CachedFetchOptions = {}
): Promise<CachedFetchResult<T>> {
  const {
    cacheTTL = DEFAULT_TTL,
    skipCache = false,
    returnStaleOnError = true,
    ...fetchOptions
  } = options

  const { status } = useConnectivityStore.getState()

  // If offline, return cached data immediately
  if (status === 'offline') {
    const cached = getCache<T>(url)
    if (cached !== null) {
      return { data: cached, fromCache: true, error: null }
    }
    return {
      data: null,
      fromCache: false,
      error: 'Offline and no cached data available',
    }
  }

  // Try to get fresh data if not skipping cache check
  if (!skipCache) {
    const cached = getCache<T>(url)
    if (cached !== null) {
      // Return cached data and trigger background refresh
      return { data: cached, fromCache: true, error: null }
    }
  }

  // Fetch fresh data
  try {
    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      // On error, try to return stale cache
      if (returnStaleOnError) {
        const cached = getCache<T>(url)
        if (cached !== null) {
          return {
            data: cached,
            fromCache: true,
            error: `Fetch failed (${response.status}), using cached data`,
          }
        }
      }
      return {
        data: null,
        fromCache: false,
        error: `Fetch failed: ${response.statusText}`,
      }
    }

    const data = (await response.json()) as T

    // Cache the fresh data
    setCache(url, data, cacheTTL)

    return { data, fromCache: false, error: null }
  } catch (err) {
    // Network error - try to return cached data
    if (returnStaleOnError) {
      const cached = getCache<T>(url)
      if (cached !== null) {
        return {
          data: cached,
          fromCache: true,
          error: err instanceof Error ? err.message : 'Network error',
        }
      }
    }

    return {
      data: null,
      fromCache: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
