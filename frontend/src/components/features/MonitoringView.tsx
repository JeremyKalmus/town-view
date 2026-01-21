import { useEffect, useMemo, useState } from 'react'
import type { Rig, Agent, Issue } from '@/types'
import { AgentCard } from './AgentCard'
import { cachedFetch } from '@/services/cache'
import { cn, getAgentRoleIcon } from '@/lib/utils'

interface MonitoringViewProps {
  rig: Rig
  refreshKey?: number
}

// Threshold for stuck detection (15 minutes in milliseconds)
const STUCK_THRESHOLD_MS = 15 * 60 * 1000

/**
 * Check if an agent is stuck (working on same bead for >15min)
 */
function isAgentStuck(agent: Agent): boolean {
  if (!agent.hook_bead) return false
  if (agent.state === 'stuck') return true

  const updatedAt = new Date(agent.updated_at).getTime()
  const now = Date.now()
  const workingDuration = now - updatedAt

  return workingDuration > STUCK_THRESHOLD_MS
}

/**
 * MonitoringView - Displays agent status grid with stuck detection
 * Part of the three-view architecture: Planning | Monitoring | Audit
 */
export function MonitoringView({ rig, refreshKey = 0 }: MonitoringViewProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [issuesLoading, setIssuesLoading] = useState(true)

  // Fetch agents for rig
  useEffect(() => {
    setLoading(true)

    const fetchAgents = async () => {
      const url = `/api/rigs/${rig.id}/agents`
      const result = await cachedFetch<Agent[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        setAgents(result.data)
        if (result.fromCache && result.error) {
          console.warn('[Agents] Using cached data:', result.error)
        }
      } else {
        console.error('Failed to fetch agents:', result.error)
        setAgents([])
      }
      setLoading(false)
    }

    fetchAgents()
  }, [rig.id, refreshKey])

  // Fetch issues for in-flight work section
  useEffect(() => {
    setIssuesLoading(true)

    const fetchIssues = async () => {
      const url = `/api/rigs/${rig.id}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        setIssues(result.data)
      } else {
        setIssues([])
      }
      setIssuesLoading(false)
    }

    fetchIssues()
  }, [rig.id, refreshKey])

  // Separate agents by status for display
  const workingAgents = agents.filter(a => a.state === 'working' || a.hook_bead)
  const stuckAgents = agents.filter(a => isAgentStuck(a))
  const idleAgents = agents.filter(a => !a.hook_bead && a.state !== 'working')

  // Get in-flight work (in_progress issues with assignees)
  const inFlightWork = useMemo(() => {
    return issues
      .filter(issue => issue.status === 'in_progress')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [issues])

  // Create a map of agent names to agent objects for lookup
  const agentsByName = useMemo(() => {
    const map = new Map<string, Agent>()
    agents.forEach(agent => {
      map.set(agent.name, agent)
      // Also map by full path (e.g., "townview/polecats/rictus")
      map.set(agent.id, agent)
    })
    return map
  }, [agents])

  return (
    <div className="p-6">
      {/* Stuck agents section - shown first if any exist */}
      {stuckAgents.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-status-blocked text-lg">⚠</span>
            <h2 className="section-header text-status-blocked">
              STUCK AGENTS ({stuckAgents.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stuckAgents.map((agent) => (
              <AgentCard key={agent.id} agent={{ ...agent, state: 'stuck' }} />
            ))}
          </div>
        </div>
      )}

      {/* In-flight work section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-status-in-progress text-lg">◐</span>
          <h2 className="section-header">
            IN-FLIGHT WORK ({inFlightWork.length})
          </h2>
        </div>
        <div className="card">
          {issuesLoading ? (
            <div className="animate-pulse flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-bg-tertiary rounded" />
              ))}
            </div>
          ) : inFlightWork.length === 0 ? (
            <div className="py-8 text-center text-text-muted">
              No work currently in progress
            </div>
          ) : (
            <div className="divide-y divide-border">
              {inFlightWork.map((issue) => (
                <InFlightWorkRow
                  key={issue.id}
                  issue={issue}
                  agent={issue.assignee ? agentsByName.get(issue.assignee) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Working agents section */}
      <div className="mb-8">
        <h2 className="section-header mb-4">
          WORKING AGENTS ({workingAgents.length})
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-3" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-2" />
                <div className="h-8 bg-bg-tertiary rounded mt-3" />
              </div>
            ))}
          </div>
        ) : workingAgents.length === 0 ? (
          <div className="card">
            <div className="py-8 text-center text-text-muted">
              No agents currently working
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {workingAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Idle agents section */}
      <div>
        <h2 className="section-header mb-4">
          IDLE AGENTS ({idleAgents.length})
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-3" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-2" />
                <div className="h-8 bg-bg-tertiary rounded mt-3" />
              </div>
            ))}
          </div>
        ) : idleAgents.length === 0 ? (
          <div className="card">
            <div className="py-8 text-center text-text-muted">
              No idle agents
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {idleAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface InFlightWorkRowProps {
  issue: Issue
  agent?: Agent
}

/**
 * Row component for in-flight work section showing issue with assigned agent.
 */
function InFlightWorkRow({ issue, agent }: InFlightWorkRowProps) {
  // Extract short agent name from full path (e.g., "townview/polecats/rictus" -> "rictus")
  const agentDisplayName = issue.assignee
    ? issue.assignee.split('/').pop() || issue.assignee
    : null

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-bg-tertiary/50 transition-colors">
      {/* Issue ID */}
      <span className="mono text-xs text-text-muted w-24 flex-shrink-0 truncate">
        {issue.id}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="truncate block text-text-primary">{issue.title}</span>
      </div>

      {/* Assigned agent indicator */}
      {agentDisplayName ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm" title={agent?.role_type}>
            {agent ? getAgentRoleIcon(agent.role_type) : '👤'}
          </span>
          <span className={cn(
            'text-sm font-medium',
            agent?.state === 'working' ? 'text-status-in-progress' : 'text-text-secondary'
          )}>
            {agentDisplayName}
          </span>
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
