import { useEffect, useMemo, useState, useCallback } from 'react'
import type { Rig, Agent, Issue, ActivityEvent, WSMessage, ConvoyProgressEvent } from '@/types'
import { AgentCard } from './AgentCard'
import { cachedFetch } from '@/services/cache'
import { getAgentRoleIcon } from '@/lib/agent-utils'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import { SkeletonAgentGrid, SkeletonWorkList, ErrorState } from '@/components/ui/Skeleton'
import { useMonitoringStore } from '@/stores/monitoring-store'
import {
  WorkItemRow,
  ActivityFeed,
  AgentPeekPanel,
  ConvoyGroupHeader,
} from './monitoring'

interface MonitoringViewProps {
  rig: Rig
  refreshKey?: number
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
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
export function MonitoringView({ rig, refreshKey = 0, updatedIssueIds = new Set() }: MonitoringViewProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Error states
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [issuesError, setIssuesError] = useState<string | null>(null)

  // Retry counter for manual retry
  const [retryCount, setRetryCount] = useState(0)

  // Agent peek panel state
  const [peekPanelOpen, setPeekPanelOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // Monitoring store for progress and activity
  const {
    progressCache,
    activityEvents,
    setActivityEvents,
  } = useMonitoringStore()

  // Handle convoy progress updates from WebSocket
  // Note: General WebSocket updates (issue_changed, etc.) are handled by App.tsx via refreshKey.
  // This callback only handles convoy_progress_changed for instant UI updates without refetching.
  const handleConvoyProgress = useCallback((msg: WSMessage) => {
    if (msg.rig && msg.rig !== rig.id) return
    if (msg.type !== 'convoy_progress_changed') return

    if (msg.payload) {
      const progressEvent = msg.payload as unknown as ConvoyProgressEvent
      setIssues(prevIssues => prevIssues.map(issue => {
        if (issue.convoy?.id === progressEvent.convoy_id) {
          return {
            ...issue,
            convoy: {
              ...issue.convoy,
              progress: {
                completed: progressEvent.closed,
                total: progressEvent.total,
                percentage: progressEvent.total > 0
                  ? Math.round((progressEvent.closed / progressEvent.total) * 100)
                  : 0,
              },
            },
          }
        }
        return issue
      }))
    }
  }, [rig.id])

  // Subscribe to convoy progress updates via App.tsx's shared WebSocket
  // The useEffect registers a listener that App.tsx can call
  useEffect(() => {
    // Store the handler on window for App.tsx to call
    // This is a lightweight approach - no extra WebSocket connection
    const handlers = (window as unknown as { __convoyProgressHandlers?: Array<(msg: WSMessage) => void> }).__convoyProgressHandlers || []
    handlers.push(handleConvoyProgress)
    ;(window as unknown as { __convoyProgressHandlers: Array<(msg: WSMessage) => void> }).__convoyProgressHandlers = handlers

    return () => {
      const idx = handlers.indexOf(handleConvoyProgress)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }, [handleConvoyProgress])

  // Fetch agents for rig
  useEffect(() => {
    setLoading(true)
    setAgentsError(null)

    const fetchAgents = async () => {
      const url = `/api/rigs/${rig.id}/agents`
      const result = await cachedFetch<Agent[]>(url, {
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        setAgents(result.data)
        setLastUpdated(new Date())
        if (result.fromCache && result.error) {
          console.warn('[Agents] Using cached data:', result.error)
        }
      } else {
        console.error('Failed to fetch agents:', result.error)
        setAgentsError(result.error || 'Failed to load agents')
        setAgents([])
      }
      setLoading(false)
    }

    fetchAgents()
  }, [rig.id, refreshKey, retryCount])

  // Fetch issues for in-flight work section (with convoy enrichment)
  useEffect(() => {
    setIssuesLoading(true)
    setIssuesError(null)

    const fetchIssues = async () => {
      const url = `/api/rigs/${rig.id}/issues?all=true&include=convoy`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        setIssues(result.data)
      } else {
        setIssuesError(result.error || 'Failed to load issues')
        setIssues([])
      }
      setIssuesLoading(false)
    }

    fetchIssues()
  }, [rig.id, refreshKey, retryCount])

  // Fetch initial activity events
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch(`/api/rigs/${rig.id}/activity?limit=50`)
        if (response.ok) {
          const events: ActivityEvent[] = await response.json()
          setActivityEvents(events)
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err)
      }
    }

    fetchActivity()
  }, [rig.id, setActivityEvents])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

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

  // Group in-flight work by convoy
  const groupedByConvoy = useMemo(() => {
    const groups = new Map<string | null, Issue[]>()

    inFlightWork.forEach(issue => {
      const convoyId = issue.convoy?.id ?? null
      if (!groups.has(convoyId)) {
        groups.set(convoyId, [])
      }
      groups.get(convoyId)!.push(issue)
    })

    // Sort groups: convoys with most recent activity first, ungrouped (null) last
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
      // Null (ungrouped) always goes last
      if (a[0] === null) return 1
      if (b[0] === null) return -1
      // Sort by most recent updated_at in the group
      const aLatest = Math.max(...a[1].map(i => new Date(i.updated_at).getTime()))
      const bLatest = Math.max(...b[1].map(i => new Date(i.updated_at).getTime()))
      return bLatest - aLatest
    })

    return new Map(sortedEntries)
  }, [inFlightWork])

  // Get recently completed work (closed in last 24 hours)
  const recentlyCompleted = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    return issues
      .filter(issue => {
        if (issue.status !== 'closed') return false
        const closedAt = issue.closed_at ? new Date(issue.closed_at).getTime() : 0
        return closedAt > twentyFourHoursAgo
      })
      .sort((a, b) => {
        const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0
        const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0
        return bTime - aTime // Most recently closed first
      })
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

  // Calculate duration since issue started (for health badge)
  const getIssueDuration = useCallback((issue: Issue): number => {
    const updatedAt = new Date(issue.updated_at).getTime()
    return Date.now() - updatedAt
  }, [])

  // Handle agent card click - open peek panel
  const handleAgentClick = useCallback((agent: Agent) => {
    if (!agent.hook_bead) return
    setSelectedAgent(agent)
    setPeekPanelOpen(true)
  }, [])

  // Handle peek panel close
  const handlePeekPanelClose = useCallback(() => {
    setPeekPanelOpen(false)
    setSelectedAgent(null)
  }, [])

  // Handle work item click - also opens peek panel for assigned agent
  const handleWorkItemClick = useCallback((issue: Issue) => {
    if (!issue.assignee) return
    const agent = agentsByName.get(issue.assignee)
    if (agent && agent.state === 'working') {
      setSelectedAgent(agent)
      setPeekPanelOpen(true)
    }
  }, [agentsByName])

  // Handle activity event click - navigate to issue
  const handleActivityClick = useCallback((event: ActivityEvent) => {
    // Could navigate to issue or open panel here
    console.log('Activity clicked:', event.issue_id)
  }, [])

  return (
    <div className="p-6">
      {/* Real-time status header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">MONITORING</h1>
          <p className="text-text-muted text-sm mt-1">
            Real-time agent status and work tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-closed animate-pulse" />
            <span className="text-text-muted">Live</span>
          </span>
          {lastUpdated && (
            <span className="text-text-muted">
              · Updated {formatRelativeTime(lastUpdated.toISOString())}
            </span>
          )}
        </div>
      </div>

      {/* Error state - show if agents failed to load */}
      {agentsError && !loading && (
        <ErrorState
          title="Failed to load agents"
          message={agentsError}
          onRetry={handleRetry}
        />
      )}

      {/* Stuck agents section - shown first if any exist */}
      {!agentsError && stuckAgents.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-status-blocked text-lg">⚠</span>
            <h2 className="section-header text-status-blocked">
              STUCK AGENTS ({stuckAgents.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stuckAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={{ ...agent, state: 'stuck' }}
                onClick={agent.hook_bead ? () => handleAgentClick(agent) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* In-flight work section - grouped by convoy */}
      {!agentsError && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-status-in-progress text-lg">◐</span>
            <h2 className="section-header">
              IN-FLIGHT WORK ({inFlightWork.length})
            </h2>
          </div>
          {issuesLoading ? (
            <div className="card">
              <SkeletonWorkList count={3} />
            </div>
          ) : issuesError ? (
            <div className="card">
              <div className="py-8 text-center text-status-blocked text-sm">
                {issuesError}
              </div>
            </div>
          ) : inFlightWork.length === 0 ? (
            <div className="card">
              <div className="py-8 text-center text-text-muted">
                No work currently in progress
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(groupedByConvoy.entries()).map(([convoyId, issues]) => {
                if (convoyId !== null) {
                  // Convoy group - use ConvoyGroupHeader
                  const convoy = issues[0].convoy!
                  return (
                    <ConvoyGroupHeader
                      key={convoyId}
                      convoyId={convoyId}
                      title={convoy.title}
                      progress={convoy.progress}
                      itemCount={issues.length}
                    >
                      <div className="divide-y divide-border">
                        {issues.map((issue) => {
                          const agent = issue.assignee ? agentsByName.get(issue.assignee) : undefined
                          const progress = progressCache.get(issue.id)
                          return (
                            <WorkItemRow
                              key={issue.id}
                              issue={issue}
                              agent={agent}
                              durationMs={getIssueDuration(issue)}
                              progress={progress}
                              isUpdated={updatedIssueIds.has(issue.id)}
                              onClick={agent?.state === 'working' ? () => handleWorkItemClick(issue) : undefined}
                            />
                          )
                        })}
                      </div>
                    </ConvoyGroupHeader>
                  )
                } else {
                  // Ungrouped work section
                  return (
                    <div key="ungrouped" className="rounded-lg border border-border bg-bg-secondary">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                        <span className="text-text-muted text-sm">──</span>
                        <span className="text-text-muted text-sm font-medium">Ungrouped Work</span>
                        <span className="text-text-muted text-xs">({issues.length})</span>
                      </div>
                      <div className="divide-y divide-border">
                        {issues.map((issue) => {
                          const agent = issue.assignee ? agentsByName.get(issue.assignee) : undefined
                          const progress = progressCache.get(issue.id)
                          return (
                            <WorkItemRow
                              key={issue.id}
                              issue={issue}
                              agent={agent}
                              durationMs={getIssueDuration(issue)}
                              progress={progress}
                              isUpdated={updatedIssueIds.has(issue.id)}
                              onClick={agent?.state === 'working' ? () => handleWorkItemClick(issue) : undefined}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Feed section */}
      {!agentsError && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-accent-primary text-lg">↻</span>
            <h2 className="section-header">
              RECENT ACTIVITY ({activityEvents.length})
            </h2>
          </div>
          <div className="card max-h-[300px] overflow-hidden">
            <ActivityFeed
              events={activityEvents}
              onEventClick={handleActivityClick}
              className="max-h-[280px] p-2"
            />
          </div>
        </div>
      )}

      {/* Recently completed section */}
      {!agentsError && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-status-closed text-lg">✓</span>
            <h2 className="section-header">
              RECENTLY COMPLETED ({recentlyCompleted.length})
            </h2>
            <span className="text-xs text-text-muted">(last 24h)</span>
          </div>
          <div className="card">
            {issuesLoading ? (
              <SkeletonWorkList count={3} />
            ) : issuesError ? (
              <div className="py-8 text-center text-status-blocked text-sm">
                {issuesError}
              </div>
            ) : recentlyCompleted.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                No work completed in the last 24 hours
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentlyCompleted.map((issue) => (
                  <RecentlyCompletedRow
                    key={issue.id}
                    issue={issue}
                    agent={issue.assignee ? agentsByName.get(issue.assignee) : undefined}
                    isUpdated={updatedIssueIds.has(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Working agents section */}
      {!agentsError && (
        <div className="mb-8">
          <h2 className="section-header mb-4">
            WORKING AGENTS ({workingAgents.length})
          </h2>
          {loading ? (
            <SkeletonAgentGrid count={4} />
          ) : workingAgents.length === 0 ? (
            <div className="card">
              <div className="py-8 text-center text-text-muted">
                No agents currently working
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {workingAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={agent.hook_bead ? () => handleAgentClick(agent) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idle agents section */}
      {!agentsError && (
        <div>
          <h2 className="section-header mb-4">
            IDLE AGENTS ({idleAgents.length})
          </h2>
          {loading ? (
            <SkeletonAgentGrid count={2} />
          ) : idleAgents.length === 0 ? (
            <div className="card">
              <div className="py-8 text-center text-text-muted">
                No idle agents
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {idleAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={agent.hook_bead ? () => handleAgentClick(agent) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agent Peek Panel */}
      <AgentPeekPanel
        isOpen={peekPanelOpen}
        onClose={handlePeekPanelClose}
        rigId={rig.id}
        agentId={selectedAgent?.id || ''}
        agentName={selectedAgent?.name}
      />
    </div>
  )
}

interface RecentlyCompletedRowProps {
  issue: Issue
  agent?: Agent
  isUpdated?: boolean
}

/**
 * Row component for recently completed section showing closed issue with completion time.
 */
function RecentlyCompletedRow({ issue, agent, isUpdated = false }: RecentlyCompletedRowProps) {
  // Extract short agent name from full path
  const agentDisplayName = issue.assignee
    ? issue.assignee.split('/').pop() || issue.assignee
    : null

  return (
    <div className={cn(
      "flex items-center gap-3 py-3 px-4 hover:bg-bg-tertiary/50 transition-colors",
      isUpdated && "animate-flash-update"
    )}>
      {/* Status icon */}
      <span className="text-status-closed text-lg flex-shrink-0">✓</span>

      {/* Issue ID */}
      <span className="mono text-xs text-text-muted w-24 flex-shrink-0 truncate">
        {issue.id}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="truncate block text-text-primary">{issue.title}</span>
      </div>

      {/* Completed by agent indicator */}
      {agentDisplayName ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm" title={agent?.role_type}>
            {agent ? getAgentRoleIcon(agent.role_type) : '👤'}
          </span>
          <span className="text-sm text-text-secondary">
            {agentDisplayName}
          </span>
        </div>
      ) : (
        <span className="text-xs text-text-muted italic flex-shrink-0">
          Unassigned
        </span>
      )}

      {/* Time since completion */}
      <span className="text-xs text-text-muted flex-shrink-0 w-16 text-right">
        {issue.closed_at ? formatRelativeTime(issue.closed_at) : '—'}
      </span>
    </div>
  )
}
