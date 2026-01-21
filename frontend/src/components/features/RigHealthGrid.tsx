import { useEffect, useState, useCallback } from 'react'
import type { Rig, Agent, AgentState } from '@/types'
import { cachedFetch } from '@/services/cache'
import { useRigStore } from '@/stores/rig-store'
import { useUIStore } from '@/stores/ui-store'
import { cn, getAgentStateIcon } from '@/lib/utils'

interface RigHealthGridProps {
  /** Key to trigger refresh */
  refreshKey?: number
  /** Mock rigs data for storybook */
  mockRigs?: Rig[]
  /** Mock agents data for storybook, keyed by rig ID */
  mockAgents?: Record<string, Agent[]>
  /** Mock loading state for storybook */
  mockLoading?: boolean
  /** Mock error state for storybook */
  mockError?: string | null
  /** Callback when a rig row is clicked (optional override for storybook) */
  onRigClick?: (rig: Rig) => void
}

/** Per-rig health summary aggregated from agents */
interface RigHealthSummary {
  rigId: string
  witnessStatus: AgentState | null
  refineryStatus: AgentState | null
  workerCount: number
  stuckCount: number
  openIssues: number
}

/**
 * HealthDot component - small colored dot indicator for agent health
 */
function HealthDot({ state }: { state: AgentState | null }) {
  if (!state) {
    return <span className="health-dot health-dot-none" title="No agent" />
  }

  const stateClass = {
    idle: 'health-dot-idle',
    working: 'health-dot-working',
    stuck: 'health-dot-stuck',
    paused: 'health-dot-paused',
  }[state] || 'health-dot-idle'

  return (
    <span
      className={cn('health-dot', stateClass)}
      title={state}
    >
      {getAgentStateIcon(state)}
    </span>
  )
}

/**
 * RigHealthGrid displays all rigs in a tabular overview
 * with per-rig agent health status.
 */
export function RigHealthGrid({
  refreshKey = 0,
  mockRigs,
  mockAgents,
  mockLoading,
  mockError,
  onRigClick,
}: RigHealthGridProps) {
  const [rigs, setRigs] = useState<Rig[]>(mockRigs || [])
  const [healthMap, setHealthMap] = useState<Map<string, RigHealthSummary>>(new Map())
  const [loading, setLoading] = useState(mockLoading ?? !mockRigs)
  const [error, setError] = useState<string | null>(mockError ?? null)

  const { setSelectedRig } = useRigStore()
  const { setViewMode } = useUIStore()

  // Use mock data mode when mockRigs is provided
  const isMockMode = mockRigs !== undefined

  // Fetch all rigs (skip in mock mode)
  useEffect(() => {
    if (isMockMode) return

    const fetchRigs = async () => {
      setLoading(true)
      setError(null)

      const result = await cachedFetch<Rig[]>('/api/rigs', {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        // Deduplicate rigs by ID
        const uniqueRigs = result.data.filter(
          (rig, index, self) => index === self.findIndex((r) => r.id === rig.id)
        )
        setRigs(uniqueRigs)
        setLoading(false)
      } else if (result.error) {
        setError(result.error)
        setLoading(false)
      }
    }

    fetchRigs()
  }, [refreshKey, isMockMode])

  // Fetch agents for all rigs and compute health summaries
  useEffect(() => {
    if (rigs.length === 0) return

    // In mock mode, use provided agents
    if (isMockMode && mockAgents) {
      const newHealthMap = new Map<string, RigHealthSummary>()

      rigs.forEach((rig) => {
        const agents = mockAgents[rig.id] || []
        const summary = computeHealthSummary(rig, agents)
        newHealthMap.set(rig.id, summary)
      })

      setHealthMap(newHealthMap)
      return
    }

    if (isMockMode) return

    const fetchAllAgents = async () => {
      const newHealthMap = new Map<string, RigHealthSummary>()

      // Fetch agents for each rig in parallel
      const promises = rigs.map(async (rig) => {
        const result = await cachedFetch<Agent[]>(`/api/rigs/${rig.id}/agents`, {
          cacheTTL: 2 * 60 * 1000,
          returnStaleOnError: true,
        })

        const agents = result.data || []
        const summary = computeHealthSummary(rig, agents)
        newHealthMap.set(rig.id, summary)
      })

      await Promise.all(promises)
      setHealthMap(newHealthMap)
    }

    fetchAllAgents()
  }, [rigs, refreshKey, isMockMode, mockAgents])

  // Navigate to rig's Planning view
  const handleRowClick = useCallback(
    (rig: Rig) => {
      if (onRigClick) {
        onRigClick(rig)
        return
      }
      setSelectedRig(rig)
      setViewMode('planning')
    },
    [setSelectedRig, setViewMode, onRigClick]
  )

  // Check if a rig row should be highlighted as unhealthy
  const isRowUnhealthy = (rigId: string): boolean => {
    const health = healthMap.get(rigId)
    if (!health) return false
    return health.stuckCount > 0
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-tertiary rounded w-1/4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-bg-tertiary rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card-accent p-6">
          <h2 className="text-lg font-semibold text-status-blocked mb-2">
            Failed to load rigs
          </h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    )
  }

  if (rigs.length === 0) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <p className="text-text-muted">No rigs discovered</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="section-header">RIG HEALTH OVERVIEW</h2>
      </div>

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
                  Refinery
                </th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                  Workers
                </th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">
                  Open Issues
                </th>
              </tr>
            </thead>
            <tbody>
              {rigs.map((rig) => {
                const health = healthMap.get(rig.id)
                const unhealthy = isRowUnhealthy(rig.id)

                return (
                  <tr
                    key={rig.id}
                    onClick={() => handleRowClick(rig)}
                    className={cn(
                      'border-b border-border last:border-0 cursor-pointer transition-colors',
                      'hover:bg-bg-tertiary',
                      unhealthy && 'bg-status-blocked/10 hover:bg-status-blocked/20'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{rig.name}</div>
                      <div className="text-xs text-text-muted mono">{rig.prefix}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <HealthDot state={health?.witnessStatus ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <HealthDot state={health?.refineryStatus ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm">
                        {health?.workerCount ?? 0}
                        {health && health.stuckCount > 0 && (
                          <span className="ml-1 text-status-blocked">
                            ({health.stuckCount} stuck)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'text-sm',
                          health && health.openIssues > 0
                            ? 'text-status-open'
                            : 'text-text-muted'
                        )}
                      >
                        {health?.openIssues ?? rig.open_count}
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
          {rigs.map((rig) => {
            const health = healthMap.get(rig.id)
            const unhealthy = isRowUnhealthy(rig.id)

            return (
              <div
                key={rig.id}
                onClick={() => handleRowClick(rig)}
                className={cn(
                  'p-4 rounded-lg border border-border cursor-pointer transition-colors',
                  'hover:bg-bg-tertiary',
                  unhealthy && 'bg-status-blocked/10 border-status-blocked/30'
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{rig.name}</div>
                    <div className="text-xs text-text-muted mono">{rig.prefix}</div>
                  </div>
                  <span
                    className={cn(
                      'text-sm px-2 py-0.5 rounded',
                      health && health.openIssues > 0
                        ? 'bg-status-open/20 text-status-open'
                        : 'bg-bg-tertiary text-text-muted'
                    )}
                  >
                    {health?.openIssues ?? rig.open_count} open
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted">W:</span>
                    <HealthDot state={health?.witnessStatus ?? null} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted">R:</span>
                    <HealthDot state={health?.refineryStatus ?? null} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted">Workers:</span>
                    <span>{health?.workerCount ?? 0}</span>
                    {health && health.stuckCount > 0 && (
                      <span className="text-status-blocked">
                        ({health.stuckCount} stuck)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Infer effective agent state.
 * If agent has hooked work but no explicit state (or idle), treat as working.
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
 * Compute health summary for a rig from its agents.
 */
function computeHealthSummary(rig: Rig, agents: Agent[]): RigHealthSummary {
  const witness = agents.find((a) => a.role_type === 'witness')
  const refinery = agents.find((a) => a.role_type === 'refinery')

  const workers = agents.filter(
    (a) => a.role_type === 'polecat' || a.role_type === 'crew'
  )

  const stuckAgents = agents.filter((a) => getEffectiveState(a) === 'stuck')

  return {
    rigId: rig.id,
    witnessStatus: witness ? getEffectiveState(witness) : null,
    refineryStatus: refinery ? getEffectiveState(refinery) : null,
    workerCount: workers.length,
    stuckCount: stuckAgents.length,
    openIssues: rig.open_count,
  }
}

// Export HealthDot for use in stories
export { HealthDot }
export type { RigHealthSummary }
