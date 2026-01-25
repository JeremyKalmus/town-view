/**
 * API service for Town View operations.
 * Communicates with the backend which executes bd CLI commands.
 * All functions return fresh data from the API - no caching.
 */

import type {
  Issue,
  IssueUpdate,
  Rig,
  Agent,
  Dependency,
  Comment,
  HistoryEntry,
  IssueDependencies,
  Mail,
} from '@/types'

export interface ApiError {
  message: string
  status: number
}

export interface ApiResult<T> {
  data: T | null
  error: string | null
}

export interface UpdateResult {
  success: boolean
  issue?: Issue
  error?: ApiError
}

/**
 * Generic fetch wrapper that always returns fresh data.
 * No caching, no fallbacks - direct API calls only.
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      return {
        data: null,
        error: `Fetch failed: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as T
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

// =============================================================================
// Rig Operations
// =============================================================================

/**
 * Fetch all rigs.
 */
export async function getRigs(): Promise<ApiResult<Rig[]>> {
  return apiFetch<Rig[]>('/api/rigs')
}

// =============================================================================
// Agent Operations
// =============================================================================

/**
 * Fetch agents for a rig.
 */
export async function getAgents(rigId: string): Promise<ApiResult<Agent[]>> {
  return apiFetch<Agent[]>(`/api/rigs/${rigId}/agents`)
}

/**
 * Fetch mail for an agent by agent ID.
 */
export async function getAgentMail(agentId: string): Promise<ApiResult<Mail[]>> {
  return apiFetch<Mail[]>(`/api/agents/${agentId}/mail`)
}

/**
 * Fetch mail for an agent by rig and agent name.
 */
export async function getAgentMailByName(
  rigId: string,
  agentName: string,
  limit?: number
): Promise<ApiResult<Mail[]>> {
  const url = new URL(`/api/rigs/${rigId}/agents/${agentName}/mail`, window.location.origin)
  if (limit) url.searchParams.set('limit', limit.toString())
  return apiFetch<Mail[]>(url.toString())
}

// =============================================================================
// Issue Operations
// =============================================================================

/**
 * Fetch issues for a rig with optional filters.
 */
export async function getIssues(
  rigId: string,
  params?: {
    status?: string
    type?: string
    types?: string  // Comma-separated list of types
    assignee?: string
    all?: boolean  // Fetch all issues including closed
  }
): Promise<ApiResult<Issue[]>> {
  const url = new URL(`/api/rigs/${rigId}/issues`, window.location.origin)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.type) url.searchParams.set('type', params.type)
  if (params?.types) url.searchParams.set('types', params.types)
  if (params?.assignee) url.searchParams.set('assignee', params.assignee)
  if (params?.all) url.searchParams.set('all', 'true')
  return apiFetch<Issue[]>(url.toString())
}

/**
 * Fetch a single issue by ID.
 */
export async function getIssue(rigId: string, issueId: string): Promise<Issue | null> {
  const result = await apiFetch<Issue>(`/api/rigs/${rigId}/issues/${issueId}`)
  return result.data
}

/**
 * Update an issue via the bd CLI backend.
 * Sends a PATCH request which triggers `bd update` command execution.
 */
export async function updateIssue(
  rigId: string,
  issueId: string,
  update: IssueUpdate
): Promise<UpdateResult> {
  try {
    const response = await fetch(`/api/rigs/${rigId}/issues/${issueId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: {
          message: errorText || `Failed to update issue: ${response.statusText}`,
          status: response.status,
        },
      }
    }

    const issue = await response.json()
    return {
      success: true,
      issue,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred'
    return {
      success: false,
      error: {
        message,
        status: 0,
      },
    }
  }
}

// =============================================================================
// Dependency Operations
// =============================================================================

/**
 * Fetch all dependencies for a rig.
 */
export async function getDependencies(rigId: string): Promise<ApiResult<Dependency[]>> {
  return apiFetch<Dependency[]>(`/api/rigs/${rigId}/dependencies`)
}

/**
 * Fetch dependencies for a specific issue.
 */
export async function getIssueDependencies(
  rigId: string,
  issueId: string
): Promise<ApiResult<IssueDependencies>> {
  return apiFetch<IssueDependencies>(`/api/rigs/${rigId}/issues/${issueId}/dependencies`)
}

// =============================================================================
// Comment Operations
// =============================================================================

/**
 * Fetch comments for an issue.
 */
export async function getComments(rigId: string, issueId: string): Promise<ApiResult<Comment[]>> {
  return apiFetch<Comment[]>(`/api/rigs/${rigId}/issues/${issueId}/comments`)
}

// =============================================================================
// History Operations
// =============================================================================

/**
 * Fetch history for an issue.
 */
export async function getHistory(
  rigId: string,
  issueId: string
): Promise<ApiResult<HistoryEntry[]>> {
  return apiFetch<HistoryEntry[]>(`/api/rigs/${rigId}/issues/${issueId}/history`)
}
