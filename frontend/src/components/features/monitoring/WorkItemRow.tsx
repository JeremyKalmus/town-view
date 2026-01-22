import { getAgentRoleIcon } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'
import type { Issue, Agent, MoleculeProgress } from '@/types'
import { HealthBadge, type HealthStatus } from './HealthBadge'
import { ProgressIndicator } from './ProgressIndicator'
import { BlockingContext } from './BlockingContext'

export interface WorkItemRowProps {
  /** The issue/work item to display */
  issue: Issue
  /** Optional agent assigned to this work item */
  agent?: Agent
  /** Duration in milliseconds for health status calculation */
  durationMs?: number
  /** Override health status (otherwise computed from durationMs) */
  healthStatus?: HealthStatus
  /** Optional molecule progress for step tracking */
  progress?: MoleculeProgress | null
  /** Issues that are blocking this work item (for blocked status display) */
  blockers?: Issue[]
  /** Whether this row was recently updated (triggers flash animation) */
  isUpdated?: boolean
  /** Click handler - typically opens AgentPeekPanel for working agents */
  onClick?: () => void
  /** Click handler for navigating to a blocking issue */
  onBlockerClick?: (blockerId: string) => void
}

/**
 * WorkItemRow - Enhanced work item display combining health, progress, and blocking context.
 * Used in MonitoringView to show in-flight work with full status visibility.
 *
 * Composes:
 * - HealthBadge: Duration-based health status indicator
 * - ProgressIndicator: Molecule step progress display
 * - BlockingContext: Shows what issues are blocking this work
 */
export function WorkItemRow({
  issue,
  agent,
  durationMs,
  healthStatus,
  progress,
  blockers,
  isUpdated = false,
  onClick,
  onBlockerClick,
}: WorkItemRowProps) {
  // Extract short agent name from full path (e.g., "townview/polecats/rictus" -> "rictus")
  const agentDisplayName = issue.assignee
    ? issue.assignee.split('/').pop() || issue.assignee
    : null

  // Determine if this row is clickable (has an onClick and agent is working)
  const isClickable = onClick && agent?.state === 'working'

  // Show health badge when we have duration data
  const showHealthBadge = durationMs !== undefined || healthStatus !== undefined

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 px-4 transition-colors',
        isUpdated && 'animate-flash-update',
        isClickable
          ? 'hover:bg-bg-tertiary/50 cursor-pointer'
          : 'hover:bg-bg-tertiary/30'
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {/* Health badge - shows duration-based status indicator */}
      {showHealthBadge && (
        <div className="flex-shrink-0">
          <HealthBadge
            durationMs={durationMs}
            status={healthStatus}
            showDuration
          />
        </div>
      )}

      {/* Issue ID */}
      <span className="mono text-xs text-text-muted w-24 flex-shrink-0 truncate">
        {issue.id}
      </span>

      {/* Title and progress combined */}
      <div className="flex-1 min-w-0">
        <span className="truncate block text-text-primary">{issue.title}</span>

        {/* Progress indicator - shown below title when progress exists */}
        {progress && (
          <div className="mt-1">
            <ProgressIndicator progress={progress} compact />
          </div>
        )}
      </div>

      {/* Blocking context - compact inline display when blocked */}
      {issue.status === 'blocked' && blockers && blockers.length > 0 && (
        <div className="flex-shrink-0">
          <BlockingContext
            blockers={blockers}
            compact
            onBlockerClick={onBlockerClick}
          />
        </div>
      )}

      {/* Assigned agent indicator */}
      {agentDisplayName ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm" title={agent?.role_type}>
            {agent ? getAgentRoleIcon(agent.role_type) : '👤'}
          </span>
          <span
            className={cn(
              'text-sm font-medium',
              agent?.state === 'working'
                ? 'text-status-in-progress'
                : agent?.state === 'stuck'
                  ? 'text-status-blocked'
                  : 'text-text-secondary'
            )}
          >
            {agentDisplayName}
          </span>
          {/* Visual indicator for clickable working agents */}
          {isClickable && (
            <span className="text-text-muted text-xs">→</span>
          )}
        </div>
      ) : (
        <span className="text-xs text-text-muted italic flex-shrink-0">
          Unassigned
        </span>
      )}

      {/* Type badge */}
      <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0">
        {issue.issue_type}
      </span>
    </div>
  )
}

export default WorkItemRow
