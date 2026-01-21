/**
 * API service for Town View issue operations.
 * Communicates with the backend which executes bd CLI commands.
 */

import type { Issue, IssueUpdate } from '@/types'

export interface ApiError {
  message: string
  status: number
}

export interface UpdateResult {
  success: boolean
  issue?: Issue
  error?: ApiError
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

/**
 * Fetch a single issue by ID.
 */
export async function getIssue(rigId: string, issueId: string): Promise<Issue | null> {
  try {
    const response = await fetch(`/api/rigs/${rigId}/issues/${issueId}`)
    if (!response.ok) {
      return null
    }
    return response.json()
  } catch {
    return null
  }
}
