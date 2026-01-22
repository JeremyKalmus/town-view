/**
 * Hook for getting agent-specific view data.
 *
 * Provides filtered issues, queue data, and display configuration
 * based on the agent's role type.
 */

import { useMemo } from 'react'
import type { Agent, Issue } from '@/types'
import {
  getAgentViewConfig,
  filterIssuesForRole,
  getAgentWorkload,
  getQueueForRole,
  getMergeQueue,
  getMonitoredAgents,
  getAgentPrimaryMetric,
  shouldShowSection,
  type AgentViewConfig,
  type AgentCardSection,
} from '@/lib/agent-bead-config'

export interface UseAgentViewResult {
  /** View configuration for this agent's role */
  config: AgentViewConfig

  /** Issues this agent is actively working on */
  workload: Issue[]

  /** Issues in the queue this agent could work on */
  queue: Issue[]

  /** All issues relevant to this agent's role */
  relevantIssues: Issue[]

  /** For witness/deacon: agents they're monitoring */
  monitoredAgents: Agent[]

  /** For refinery: merge requests in queue */
  mergeQueue: Issue[]

  /** Primary metric for display */
  primaryMetric: { label: string; value: number | string }

  /** Check if a card section should be shown */
  showSection: (section: AgentCardSection) => boolean

  /** The hooked issue (if hook_bead matches an issue) */
  hookedIssue: Issue | undefined
}

/**
 * Get view-specific data for an agent based on their role.
 *
 * @param agent - The agent to get view data for
 * @param issues - All issues (will be filtered by role)
 * @param allAgents - All agents (for monitoring relationships)
 */
export function useAgentView(
  agent: Agent | null | undefined,
  issues: Issue[],
  allAgents: Agent[] = []
): UseAgentViewResult | null {
  return useMemo(() => {
    if (!agent) return null

    const config = getAgentViewConfig(agent.role_type)

    // Filter issues relevant to this role
    const relevantIssues = filterIssuesForRole(issues, agent.role_type)

    // Get this agent's specific workload
    const workload = getAgentWorkload(issues, agent)

    // Get available queue items
    const queue = getQueueForRole(issues, agent.role_type)

    // Get merge queue (relevant for refinery)
    const mergeQueue = getMergeQueue(issues)

    // Get monitored agents (relevant for witness/deacon)
    const monitoredAgents = ['witness', 'deacon'].includes(agent.role_type)
      ? getMonitoredAgents(allAgents, agent.role_type as 'witness' | 'deacon')
      : []

    // Calculate primary metric
    const primaryMetric = getAgentPrimaryMetric(agent, issues, allAgents)

    // Find the hooked issue if there's a hook_bead
    const hookedIssue = agent.hook_bead
      ? issues.find(i => i.id === agent.hook_bead)
      : undefined

    // Helper to check sections
    const showSection = (section: AgentCardSection) =>
      shouldShowSection(agent.role_type, section)

    return {
      config,
      workload,
      queue,
      relevantIssues,
      monitoredAgents,
      mergeQueue,
      primaryMetric,
      showSection,
      hookedIssue,
    }
  }, [agent, issues, allAgents])
}

/**
 * Get summary stats for an agent suitable for card display.
 */
export function useAgentCardStats(
  agent: Agent | null | undefined,
  issues: Issue[],
  allAgents: Agent[] = []
) {
  const viewData = useAgentView(agent, issues, allAgents)

  return useMemo(() => {
    if (!viewData || !agent) {
      return {
        isWorking: false,
        workCount: 0,
        queueCount: 0,
        primaryMetric: { label: 'Status', value: 'Unknown' },
      }
    }

    return {
      isWorking: !!agent.hook_bead || agent.state === 'working',
      workCount: viewData.workload.length,
      queueCount: viewData.queue.length,
      primaryMetric: viewData.primaryMetric,
      monitoredCount: viewData.monitoredAgents.length,
      mergeQueueCount: viewData.mergeQueue.length,
    }
  }, [agent, viewData])
}
