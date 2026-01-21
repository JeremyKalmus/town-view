import { useEffect, useState, useCallback } from 'react'
import type { Agent, Rig, ActivityEvent } from '@/types'
import { cachedFetch } from '@/services/cache'
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
 */
function mailToActivityEvents(messages: MailMessage[]): ActivityEvent[] {
  return messages.map((msg) => ({
    id: msg.id,
    issue_id: '', // Mail doesn't have issue_id
    issue_type: 'event' as const,
    title: msg.subject,
    event_type: 'mail',
    old_value: null,
    new_value: msg.body.slice(0, 100) + (msg.body.length > 100 ? '...' : ''),
    actor: msg.from,
    timestamp: msg.timestamp,
  }))
}

/**
 * TownDashboard - The HQ view showing town-wide operations center.
 * Displays:
 * - Infrastructure health (Mayor, Deacon, Refinery)
 * - Rig health grid (all rigs overview)
 * - Activity stream (mail/events)
 */
export function TownDashboard({ refreshKey = 0 }: TownDashboardProps) {
  const [infrastructureAgents, setInfrastructureAgents] = useState<Agent[]>([])
  const [infrastructureLoading, setInfrastructureLoading] = useState(true)
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null)

  const [mailMessages, setMailMessages] = useState<MailMessage[]>([])
  const [mailLoading, setMailLoading] = useState(true)
  const [mailError, setMailError] = useState<string | null>(null)

  const [retryCount, setRetryCount] = useState(0)

  // Fetch infrastructure agents from all rigs
  useEffect(() => {
    setInfrastructureLoading(true)
    setInfrastructureError(null)

    const fetchInfrastructureAgents = async () => {
      try {
        // First get all rigs
        const rigsResult = await cachedFetch<Rig[]>('/api/rigs', {
          cacheTTL: 2 * 60 * 1000,
          returnStaleOnError: true,
        })

        if (!rigsResult.data) {
          setInfrastructureError(rigsResult.error || 'Failed to load rigs')
          setInfrastructureLoading(false)
          return
        }

        // Fetch agents from all rigs in parallel
        const agentPromises = rigsResult.data.map(async (rig) => {
          const result = await cachedFetch<Agent[]>(`/api/rigs/${rig.id}/agents`, {
            cacheTTL: 2 * 60 * 1000,
            returnStaleOnError: true,
          })
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

        setInfrastructureAgents(infraAgents)
        setInfrastructureLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load infrastructure agents'
        setInfrastructureError(message)
        setInfrastructureLoading(false)
      }
    }

    fetchInfrastructureAgents()
  }, [refreshKey, retryCount])

  // Fetch town-level mail
  useEffect(() => {
    setMailLoading(true)
    setMailError(null)

    const fetchMail = async () => {
      try {
        const response = await fetch('/api/mail?limit=50')
        if (!response.ok) {
          throw new Error(`Failed to fetch mail: ${response.statusText}`)
        }
        const messages: MailMessage[] = await response.json()
        setMailMessages(messages)
        setMailLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load mail'
        setMailError(message)
        setMailLoading(false)
      }
    }

    fetchMail()
  }, [refreshKey, retryCount])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Convert mail to activity events
  const activityEvents = mailToActivityEvents(mailMessages)

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
