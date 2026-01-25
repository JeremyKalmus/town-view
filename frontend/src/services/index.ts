/**
 * Services barrel export.
 * All API functions return fresh data - no caching.
 */

export {
  // Rig operations
  getRigs,
  // Agent operations
  getAgents,
  getAgentMail,
  getAgentMailByName,
  // Issue operations
  getIssues,
  getIssue,
  updateIssue,
  // Dependency operations
  getDependencies,
  getIssueDependencies,
  // Comment operations
  getComments,
  // History operations
  getHistory,
} from './api'

export type { ApiError, ApiResult, UpdateResult } from './api'
