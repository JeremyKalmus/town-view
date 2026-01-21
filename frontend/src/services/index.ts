/**
 * Services barrel export.
 */

export { updateIssue, getIssue } from './api'
export type { ApiError, UpdateResult } from './api'

export {
  cachedFetch,
  getCache,
  setCache,
  removeCache,
  clearAllCache,
  cleanupExpiredCache,
  hasCachedData,
  getCacheTimestamp,
} from './cache'
export type { CachedFetchOptions, CachedFetchResult } from './cache'
