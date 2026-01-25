import { useEffect, useState, useCallback, useMemo } from 'react'
import type { Agent, Rig, ActivityEvent } from '@/types'
import { useDataStore, selectConnected, selectMail, selectActivity } from '@/stores/data-store'
import { getRigs, getAgents } from '@/services'
import { RigHealthGrid } from './RigHealthGrid'
import { InfrastructureHealth } from './monitoring/InfrastructureHealth'
import { ActivityFeed } from './monitoring/ActivityFeed'
import { SkeletonAgentGrid } from '@/components/ui/Skeleton'

interface TownDashboardProps {
  /** Key to trigger refresh */
  refreshKey?: number
}

interface MailMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  timestamp: string
  read: boolean
}

/**
 * Convert mail messages to activity events for display in ActivityFeed.
 * Accepts both MailMessage (HTTP) and Mail (WebSocket) types.
 */
function mailToActivityEvents(messages: Array<MailMessage | { id: string; from: string; subject: string; body?: string; timestamp: string }>): ActivityEvent[] {
  return messages.map((msg) => {
    const body = msg.body || ''
    return {
      id: msg.id,
      issue_id: '', // Mail doesn't have issue_id
      issue_type: 'event' as const,
      title: msg.subject,
      event_type: 'mail',
      old_value: null,
      new_value: body.slice(0, 100) + (body.length > 100 ? '...' : ''),
      actor: msg.from,
      timestamp: msg.timestamp,
    }
  })
}

/**
 * TownDashboard - The HQ view showing town-wide operations center.
 * Displays:
 * - Infrastructure health (Mayor, Deacon, Refinery)
 * - Rig health grid (all rigs overview)
 * - Activity stream (mail/events)
 */
export function TownDashboard({ refreshKey = 0 }: TownDashboardProps) {
  // Data store (WebSocket-fed)
  const wsAgents = useDataStore((state) => state.agents)
  const wsMail = useDataStore(selectMail)
  const wsActivity = useDataStore(selectActivity)
  const wsConnected = useDataStore(selectConnected)

  // HTTP fallback state
  const [httpInfrastructureAgents, setHttpInfrastructureAgents] = useState<Agent[]>([])
  const [httpLoading, setHttpLoading] = useState(true)
  const [httpError, setHttpError] = useState<string | null>(null)

  const [httpMailMessages, setHttpMailMessages] = useState<MailMessage[]>([])
  const [httpMailLoading, setHttpMailLoading] = useState(true)
  const [httpMailError, setHttpMailError] = useState<string | null>(null)

  const [retryCount, setRetryCount] = useState(0)

  // Derive infrastructure agents from WebSocket data
  const wsInfrastructureAgents = useMemo(() => {
    const allAgents: Agent[] = []
    for (const rigId of Object.keys(wsAgents)) {
      allAgents.push(...wsAgents[rigId])
    }
    return allAgents.filter(
      (agent) =>
        agent.role_type === 'mayor' ||
        agent.role_type === 'deacon' ||
        agent.role_type === 'refinery'
    )
  }, [wsAgents])

  // Use WebSocket data when connected, otherwise HTTP fallback
  const hasWsAgents = wsConnected && wsInfrastructureAgents.length > 0
  const infrastructureAgents = hasWsAgents ? wsInfrastructureAgents : httpInfrastructureAgents
  const infrastructureLoading = !wsConnected && httpLoading
  const infrastructureError = !wsConnected ? httpError : null

  const hasWsMail = wsConnected && wsMail.length > 0
  const mailMessages = hasWsMail ? wsMail : httpMailMessages
  const mailLoading = !wsConnected && httpMailLoading
  const mailError = !wsConnected ? httpMailError : null

  // Fetch infrastructure agents from all rigs via HTTP as fallback
  useEffect(() => {
    // Skip HTTP fetch if WebSocket is connected and has data
    if (wsConnected && wsInfrastructureAgents.length > 0) {
      setHttpLoading(false)
      return
    }

    setHttpLoading(true)
    setHttpError(null)

    const fetchInfrastructureAgents = async () => {
      try {
        // First get all rigs
        const rigsResult = await getRigs()

        if (!rigsResult.data) {
          setHttpError(rigsResult.error || 'Failed to load rigs')
          setHttpLoading(false)
          return
        }

        // Fetch agents from all rigs in parallel
        const agentPromises = rigsResult.data.map(async (rig) => {
          const result = await getAgents(rig.id)
          return result.data || []
        })

        const allAgentsArrays = await Promise.all(agentPromises)
        const allAgents = allAgentsArrays.flat()

        // Filter to infrastructure roles only (mayor, deacon, refinery)
        const infraAgents = allAgents.filter(
          (agent) =>
            agent.role_type === 'mayor' ||
            agent.role_type === 'deacon' ||
            agent.role_type === 'refinery'
        )

        setHttpInfrastructureAgents(infraAgents)
        setHttpLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load infrastructure agents'
        setHttpError(message)
        setHttpLoading(false)
      }
    }

    fetchInfrastructureAgents()
  }, [refreshKey, retryCount, wsConnected, wsInfrastructureAgents.length])

  // Fetch town-level mail via HTTP as fallback
  useEffect(() => {
    // Skip HTTP fetch if WebSocket is connected and has data
    if (wsConnected && wsMail.length > 0) {
      setHttpMailLoading(false)
      return
    }

    setHttpMailLoading(true)
    setHttpMailError(null)

    const fetchMail = async () => {
      try {
        const response = await fetch('/api/mail?limit=50')
        if (!response.ok) {
          throw new Error(`Failed to fetch mail: ${response.statusText}`)
        }
        const messages: MailMessage[] = await response.json()
        setHttpMailMessages(messages)
        setHttpMailLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load mail'
        setHttpMailError(message)
        setHttpMailLoading(false)
      }
    }

    fetchMail()
  }, [refreshKey, retryCount, wsConnected, wsMail.length])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Use WebSocket activity when available, otherwise convert mail to activity events
  const activityEvents = useMemo(() => {
    if (wsConnected && wsActivity.length > 0) {
      return wsActivity
    }
    return mailToActivityEvents(mailMessages)
  }, [wsConnected, wsActivity, mailMessages])

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full">
      {/* Main content area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">
            TOWN OPERATIONS CENTER
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Overview of all rigs and infrastructure health
          </p>
        </div>

        {/* Infrastructure Health Section */}
        <div>
          <h2 className="section-header mb-4">INFRASTRUCTURE HEALTH</h2>
          {infrastructureLoading ? (
            <div className="card p-4">
              <SkeletonAgentGrid count={3} />
            </div>
          ) : infrastructureError ? (
            <div className="card-accent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-status-blocked">
                    Failed to load infrastructure
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">{infrastructureError}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="btn-secondary text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4">
              <InfrastructureHealth agents={infrastructureAgents} />
            </div>
          )}
        </div>

        {/* Rig Health Grid Section */}
        <div>
          <RigHealthGrid refreshKey={refreshKey} />
        </div>
      </div>

      {/* Activity Sidebar */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="sticky top-6">
          <h2 className="section-header mb-4">ACTIVITY STREAM</h2>
          <div className="card overflow-hidden">
            {mailLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : mailError ? (
              <div className="p-4">
                <div className="text-center">
                  <p className="text-sm text-status-blocked mb-2">{mailError}</p>
                  <button
                    onClick={handleRetry}
                    className="text-sm text-accent-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : activityEvents.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                No recent activity
              </div>
            ) : (
              <ActivityFeed
                events={activityEvents}
                className="max-h-[calc(100vh-200px)] p-2"
              />
            )}
          </div>
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
