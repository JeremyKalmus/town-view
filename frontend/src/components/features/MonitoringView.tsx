import { useEffect, useState } from 'react'
import type { Rig, Agent } from '@/types'
import { AgentCard } from './AgentCard'
import { cachedFetch } from '@/services/cache'

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
  const [loading, setLoading] = useState(true)

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

  // Separate agents by status for display
  const workingAgents = agents.filter(a => a.state === 'working' || a.hook_bead)
  const stuckAgents = agents.filter(a => isAgentStuck(a))
  const idleAgents = agents.filter(a => !a.hook_bead && a.state !== 'working')

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
