import { useMemo } from 'react'
import type { Agent, Rig, Issue, AgentState } from '@/types'
import { useDataStore, selectConnected } from '@/stores/data-store'
import { StatusDot } from '@/components/ui/StatusDot'
import { isTownWorkType } from '@/lib/agent-bead-config'
import { cn } from '@/lib/class-utils'
import { getAgentRoleIcon } from '@/lib/agent-utils'
import { useRigStore } from '@/stores/rig-store'
import { useUIStore } from '@/stores/ui-store'

interface TownDashboardV2Props {
  /** Key to trigger refresh */
  refreshKey?: number
}

/**
 * Worker counts breakdown
 */
interface WorkerCounts {
  total: number
  active: number  // has hook_bead
  idle: number    // no hook_bead, not stuck
  stuck: number   // state is 'stuck'
}

/**
 * Stats for a single rig
 */
interface RigStats {
  rigId: string
  rigName: string
  witnessStatus: AgentState | null
  workerCounts: WorkerCounts
  activeConvoys: number
  openWork: number
}

/**
 * Get effective agent state - infer working if has hooked bead
 */
function getEffectiveState(agent: Agent): AgentState {
  if (agent.state && agent.state !== 'idle') {
    return agent.state
  }
  if (agent.hook_bead) {
    return 'working'
  }
  return 'idle'
}

/**
 * Compute worker counts from agents array
 */
function computeWorkerCounts(agents: Agent[]): WorkerCounts {
  const workers = agents.filter(
    (a) => a.role_type === 'polecat' || a.role_type === 'crew'
  )

  const counts: WorkerCounts = {
    total: workers.length,
    active: 0,
    idle: 0,
    stuck: 0,
  }

  workers.forEach((worker) => {
    const state = getEffectiveState(worker)
    if (state === 'stuck') {
      counts.stuck++
    } else if (worker.hook_bead) {
      counts.active++
    } else {
      counts.idle++
    }
  })

  return counts
}

/**
 * Check if an issue is a workflow infrastructure bead (wisp, event, agent, patrol).
 * These are filtered out from "real work" counts in the Town Dashboard.
 *
 * Infrastructure beads are identified by:
 * - ID containing '-wisp-' (workflow step beads)
 * - Issue type 'event' (session lifecycle events)
 * - Issue type 'agent' (agent lifecycle beads)
 * - Issue type 'molecule' (workflow containers)
 * - Title containing 'Patrol' (patrol molecules like Deacon Patrol, Witness Patrol)
 * - Title starting with 'mol-' (molecule definition beads)
 */
function isWorkflowInfrastructure(issue: Issue): boolean {
  // Wisp beads (workflow steps)
  if (issue.id.includes('-wisp-')) {
    return true
  }
  // Event beads (session start/end, etc.)
  if (issue.issue_type === 'event') {
    return true
  }
  // Agent beads (polecat lifecycle)
  if (issue.issue_type === 'agent') {
    return true
  }
  // Molecule beads (workflow containers) - patrol molecules etc.
  if (issue.issue_type === 'molecule') {
    return true
  }
  // Message beads (mail)
  if (issue.issue_type === 'message') {
    return true
  }
  // Patrol molecules (Deacon Patrol, Witness Patrol, Refinery Patrol, etc.)
  if (issue.title.toLowerCase().includes('patrol')) {
    return true
  }
  // Molecule definition beads (mol-*)
  if (issue.title.toLowerCase().startsWith('mol-')) {
    return true
  }
  return false
}

/**
 * Filter issues to only "real work" - excludes workflow infrastructure.
 */
function filterToRealWork(issues: Issue[]): Issue[] {
  return issues.filter((issue) => !isWorkflowInfrastructure(issue))
}

/**
 * InfrastructureBar - Shows Mayor and Deacon status only
 */
function InfrastructureBar({ agents }: { agents: Agent[] }) {
  const mayor = agents.find((a) => a.role_type === 'mayor')
  const deacon = agents.find((a) => a.role_type === 'deacon')

  const isHealthy = (agent: Agent | undefined): boolean => {
    if (!agent) return false
    const state = getEffectiveState(agent)
    return state !== 'stuck' && state !== 'stopped'
  }

  const allHealthy = isHealthy(mayor) && isHealthy(deacon)

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border">
      <div className="flex items-center gap-6">
        {/* Mayor */}
        <div className="flex items-center gap-2">
          <span className="text-base">{getAgentRoleIcon('mayor')}</span>
          <span className="text-sm font-medium">Mayor</span>
          <StatusDot state={mayor ? getEffectiveState(mayor) : null} size="sm" />
        </div>

        {/* Deacon */}
        <div className="flex items-center gap-2">
          <span className="text-base">{getAgentRoleIcon('deacon')}</span>
          <span className="text-sm font-medium">Deacon</span>
          <StatusDot state={deacon ? getEffectiveState(deacon) : null} size="sm" />
        </div>
      </div>

      {/* Health indicator */}
      <div
        className={cn(
          'flex items-center gap-1 text-sm',
          allHealthy ? 'text-status-closed' : 'text-status-blocked'
        )}
      >
        <span>{allHealthy ? '✓' : '!'}</span>
        <span>{allHealthy ? 'Healthy' : 'Issues'}</span>
      </div>
    </div>
  )
}

/**
 * StatCard - Single stat display
 */
function StatCard({
  label,
  value,
  subValue,
  variant = 'default',
}: {
  label: string
  value: number | string
  subValue?: string
  variant?: 'default' | 'warning' | 'success'
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-bold',
          variant === 'warning' && 'text-status-blocked',
          variant === 'success' && 'text-status-closed'
        )}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-text-muted mt-1">{subValue}</div>
      )}
    </div>
  )
}

/**
 * StatsCards - Row of stat cards
 */
function StatsCards({
  workerCounts,
  convoyCount,
  inProgressCount,
  openWorkCount,
}: {
  workerCounts: WorkerCounts
  convoyCount: number
  inProgressCount: number
  openWorkCount: number
}) {
  const workerSubValue = `${workerCounts.active} active, ${workerCounts.idle} idle${workerCounts.stuck > 0 ? `, ${workerCounts.stuck} stuck` : ''}`

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Workers"
        value={workerCounts.total}
        subValue={workerSubValue}
        variant={workerCounts.stuck > 0 ? 'warning' : 'default'}
      />
      <StatCard label="Convoys" value={convoyCount} />
      <StatCard label="In Progress" value={inProgressCount} />
      <StatCard label="Open Work" value={openWorkCount} />
    </div>
  )
}

/**
 * RigOverviewTable - Table showing per-rig stats
 */
function RigOverviewTable({
  rigStats,
  onRigClick,
}: {
  rigStats: RigStats[]
  onRigClick: (rigId: string) => void
}) {
  if (rigStats.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted">
        No rigs discovered
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">
                Rig
              </th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                Witness
              </th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                Workers
              </th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                Convoys
              </th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                Open Work
              </th>
            </tr>
          </thead>
          <tbody>
            {rigStats.map((rig) => {
              const hasStuck = rig.workerCounts.stuck > 0

              return (
                <tr
                  key={rig.rigId}
                  onClick={() => onRigClick(rig.rigId)}
                  className={cn(
                    'border-b border-border last:border-0 cursor-pointer transition-colors',
                    'hover:bg-bg-tertiary',
                    hasStuck && 'bg-status-blocked/10 hover:bg-status-blocked/20'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{rig.rigName}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusDot state={rig.witnessStatus} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">
                      {rig.workerCounts.total}
                      {rig.workerCounts.stuck > 0 && (
                        <span className="ml-1 text-status-blocked">
                          ({rig.workerCounts.stuck} stuck)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">{rig.activeConvoys}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'text-sm',
                        rig.openWork > 0 ? 'text-status-open' : 'text-text-muted'
                      )}
                    >
                      {rig.openWork}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3 p-2">
        {rigStats.map((rig) => {
          const hasStuck = rig.workerCounts.stuck > 0

          return (
            <div
              key={rig.rigId}
              onClick={() => onRigClick(rig.rigId)}
              className={cn(
                'p-4 rounded-lg border border-border cursor-pointer transition-colors',
                'hover:bg-bg-tertiary',
                hasStuck && 'bg-status-blocked/10 border-status-blocked/30'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="font-medium">{rig.rigName}</div>
                <span
                  className={cn(
                    'text-sm px-2 py-0.5 rounded',
                    rig.openWork > 0
                      ? 'bg-status-open/20 text-status-open'
                      : 'bg-bg-tertiary text-text-muted'
                  )}
                >
                  {rig.openWork} open
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-text-muted">W:</span>
                  <StatusDot state={rig.witnessStatus} size="sm" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted">Workers:</span>
                  <span>{rig.workerCounts.total}</span>
                  {rig.workerCounts.stuck > 0 && (
                    <span className="text-status-blocked">
                      ({rig.workerCounts.stuck} stuck)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted">Convoys:</span>
                  <span>{rig.activeConvoys}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * InFlightItem - Single in-flight work item
 */
function InFlightItem({ issue }: { issue: Issue }) {
  const typeIcon = issue.issue_type === 'convoy' ? '🚚' : '🧬'
  const progress = issue.convoy?.progress

  return (
    <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border/50">
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0">{typeIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{issue.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                issue.status === 'in_progress'
                  ? 'bg-status-in-progress/20 text-status-in-progress'
                  : 'bg-status-open/20 text-status-open'
              )}
            >
              {issue.status}
            </span>
            {progress && (
              <span className="text-xs text-text-muted">
                {progress.completed}/{progress.total}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * InFlightPanel - Sidebar showing active convoys and molecules
 */
function InFlightPanel({ issues }: { issues: Issue[] }) {
  // Filter to only open/in_progress convoy and molecule types
  const inFlightItems = issues.filter(
    (issue) =>
      (issue.issue_type === 'convoy' || issue.issue_type === 'molecule') &&
      (issue.status === 'open' || issue.status === 'in_progress')
  )

  return (
    <div className="card overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          IN FLIGHT
        </h3>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
        {inFlightItems.length === 0 ? (
          <div className="text-sm text-text-muted text-center py-4">
            No active work in flight
          </div>
        ) : (
          inFlightItems.map((issue) => (
            <InFlightItem key={issue.id} issue={issue} />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * TownDashboardV2 - Work-focused Town Operations Center
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ TOWN OPERATIONS                                                 │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ [Infrastructure Bar] Mayor ● Deacon ●             ✓ Healthy     │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ [Stats Cards] Workers | Convoys | In Progress | Open Work       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ RIG OVERVIEW (table)                  │ IN FLIGHT (sidebar)     │
 * │ Rig | Witness | Workers | Convoys | Work                        │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function TownDashboardV2({ refreshKey = 0 }: TownDashboardV2Props) {
  // Data store (WebSocket-fed)
  const wsRigs = useDataStore((state) => state.rigs)
  const wsAgents = useDataStore((state) => state.agents)
  const wsIssues = useDataStore((state) => state.issues)
  const wsConnected = useDataStore(selectConnected)

  const { setSelectedRig } = useRigStore()
  const { setViewMode } = useUIStore()

  // Aggregate all agents across rigs
  const allAgents = useMemo(() => {
    const agents: Agent[] = []
    for (const rigId of Object.keys(wsAgents)) {
      agents.push(...wsAgents[rigId])
    }
    return agents
  }, [wsAgents])

  // Aggregate all issues across rigs
  const allIssues = useMemo(() => {
    const issues: Issue[] = []
    for (const rigId of Object.keys(wsIssues)) {
      issues.push(...wsIssues[rigId])
    }
    return issues
  }, [wsIssues])

  // Filter to town work types only (includes all town work for convoys, in-flight, etc.)
  const townWorkIssues = useMemo(() => {
    return allIssues.filter((issue) => isTownWorkType(issue.issue_type))
  }, [allIssues])

  // Filter to "real work" only - excludes wisps, events, agents, molecules
  // Used for Open Work and In Progress KPIs
  const realWorkIssues = useMemo(() => {
    return filterToRealWork(townWorkIssues)
  }, [townWorkIssues])

  // Compute total worker counts
  const totalWorkerCounts = useMemo(() => {
    return computeWorkerCounts(allAgents)
  }, [allAgents])

  // Count active convoys (open or in_progress)
  const convoyCount = useMemo(() => {
    return townWorkIssues.filter(
      (issue) =>
        issue.issue_type === 'convoy' &&
        (issue.status === 'open' || issue.status === 'in_progress')
    ).length
  }, [townWorkIssues])

  // Count in-progress work (real work only, excludes wisps/events/agents)
  const inProgressCount = useMemo(() => {
    return realWorkIssues.filter((issue) => issue.status === 'in_progress').length
  }, [realWorkIssues])

  // Count open work (real work only, excludes wisps/events/agents)
  const openWorkCount = useMemo(() => {
    return realWorkIssues.filter((issue) => issue.status === 'open').length
  }, [realWorkIssues])

  // Compute per-rig stats
  const rigStats = useMemo((): RigStats[] => {
    return wsRigs.map((rig) => {
      const rigAgents = wsAgents[rig.id] || []
      const rigIssues = wsIssues[rig.id] || []
      const witness = rigAgents.find((a) => a.role_type === 'witness')

      const rigTownWork = rigIssues.filter((issue) => isTownWorkType(issue.issue_type))
      const rigRealWork = filterToRealWork(rigTownWork)

      return {
        rigId: rig.id,
        rigName: rig.name,
        witnessStatus: witness ? getEffectiveState(witness) : null,
        workerCounts: computeWorkerCounts(rigAgents),
        activeConvoys: rigTownWork.filter(
          (issue) =>
            issue.issue_type === 'convoy' &&
            (issue.status === 'open' || issue.status === 'in_progress')
        ).length,
        // Open work uses filtered "real work" to exclude wisps/events/agents
        openWork: rigRealWork.filter((issue) => issue.status === 'open').length,
      }
    })
  }, [wsRigs, wsAgents, wsIssues])

  // Handle rig click - navigate to planning view
  const handleRigClick = (rigId: string) => {
    const rig = wsRigs.find((r) => r.id === rigId)
    if (rig) {
      setSelectedRig(rig)
      setViewMode('planning')
    }
  }

  // Show loading state when not connected
  if (!wsConnected && allAgents.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 h-full">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">
            TOWN OPERATIONS
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Connecting to data stream...
          </p>
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-14 bg-bg-tertiary rounded-lg" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-bg-tertiary rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-bg-tertiary rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full">
      {/* Main content area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">
            TOWN OPERATIONS
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Work-focused view of all rigs and active operations
          </p>
        </div>

        {/* Infrastructure Bar - Mayor & Deacon only */}
        <InfrastructureBar agents={allAgents} />

        {/* Stats Cards */}
        <StatsCards
          workerCounts={totalWorkerCounts}
          convoyCount={convoyCount}
          inProgressCount={inProgressCount}
          openWorkCount={openWorkCount}
        />

        {/* Rig Overview Table */}
        <div>
          <h2 className="section-header mb-4">RIG OVERVIEW</h2>
          <RigOverviewTable rigStats={rigStats} onRigClick={handleRigClick} />
        </div>
      </div>

      {/* In-Flight Sidebar */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="sticky top-6">
          <InFlightPanel issues={townWorkIssues} />
        </div>
      </div>
    </div>
  )
}

/**
 * Helper function to check if a rig is the HQ rig.
 */
export function isHQRig(rig: Rig | null | undefined): boolean {
  if (!rig) return false
  return rig.id === 'hq' || rig.name === 'HQ (Town)' || rig.name.toLowerCase() === 'hq'
}
