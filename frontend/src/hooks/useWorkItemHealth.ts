/**
 * Hook for calculating work item health based on duration.
 * Returns health status (healthy/concerning/stuck) based on thresholds.
 */

import { useMemo } from 'react'
import type { WorkItemHealth, WorkItemHealthStatus } from '@/types'
import { HEALTH_THRESHOLDS } from '@/stores/monitoring-store'
import { createClassMapper } from '@/lib/class-utils'

export interface UseWorkItemHealthResult {
  /** Health status and duration info */
  health: WorkItemHealth
  /** Whether the item is concerning (>2min) or stuck (>10min) */
  isWarning: boolean
  /** Human-readable duration string */
  durationText: string
}

/**
 * Calculate health status based on how long a work item has been active.
 *
 * @param startedAt - ISO timestamp when work started
 * @returns Health status with duration information
 *
 * @example
 * ```tsx
 * const { health, isWarning, durationText } = useWorkItemHealth(issue.updated_at)
 *
 * // health.status is 'healthy', 'concerning', or 'stuck'
 * // isWarning is true if status is concerning or stuck
 * // durationText is e.g. "5m 30s" or "1h 15m"
 * ```
 */
export function useWorkItemHealth(startedAt: string | undefined): UseWorkItemHealthResult {
  return useMemo(() => {
    if (!startedAt) {
      return {
        health: {
          status: 'healthy' as WorkItemHealthStatus,
          duration_ms: 0,
          started_at: new Date().toISOString(),
        },
        isWarning: false,
        durationText: '0s',
      }
    }

    const startTime = new Date(startedAt).getTime()
    const now = Date.now()
    const durationMs = now - startTime

    let status: WorkItemHealthStatus = 'healthy'
    if (durationMs >= HEALTH_THRESHOLDS.stuck) {
      status = 'stuck'
    } else if (durationMs >= HEALTH_THRESHOLDS.concerning) {
      status = 'concerning'
    }

    const isWarning = status !== 'healthy'

    // Format duration as human-readable
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    let durationText: string
    if (hours > 0) {
      const remainingMinutes = minutes % 60
      durationText = remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60
      durationText = remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    } else {
      durationText = `${seconds}s`
    }

    return {
      health: {
        status,
        duration_ms: durationMs,
        started_at: startedAt,
      },
      isWarning,
      durationText,
    }
  }, [startedAt])
}

/**
 * Get CSS class name for health status color.
 */
export const getHealthColorClass = createClassMapper<WorkItemHealthStatus>(
  {
    stuck: 'text-red-500',
    concerning: 'text-yellow-500',
    healthy: 'text-green-500',
  },
  'text-green-500'
)

/**
 * Get background CSS class name for health status.
 */
export const getHealthBgClass = createClassMapper<WorkItemHealthStatus>(
  {
    stuck: 'bg-red-500/10',
    concerning: 'bg-yellow-500/10',
    healthy: 'bg-green-500/10',
  },
  'bg-green-500/10'
)
