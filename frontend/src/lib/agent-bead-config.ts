/**
 * Centralized configuration for agent-to-bead relationships.
 *
 * This module provides a single source of truth for:
 * - Which bead types each agent role works with
 * - How to filter beads for agent-specific views
 * - What information to display on agent cards
 * - Query builders for fetching role-specific data
 */

import type { Issue, Agent, IssueType, IssueStatus, ActivityEvent } from '@/types'

// ============================================================================
// Bead Type Categories (ADR-004)
// ============================================================================

/**
 * Work bead types - what agents are DOING
 * Used for Tab 1 in AgentPeekPanel (Work History, Merge Queue, Patrol Activity)
 */
export const WORK_BEAD_TYPES: IssueType[] = [
  'task',
  'bug',
  'feature',
  'chore',
  'merge-request',
  'molecule',
]

/**
 * Event bead types - what HAPPENED (lifecycle events)
 * Used for Tab 3 in AgentPeekPanel (Events/Lifecycle)
 * Includes: session start/end, wisp, patrol complete, merge events
 */
export const EVENT_BEAD_TYPES: IssueType[] = ['event']

/**
 * Town-level work types - work items visible in Town dashboard
 *
 * Unlike WORK_BEAD_TYPES (which tracks what individual agents DO),
 * TOWN_WORK_TYPES includes coordination beads (epic, convoy) that
 * represent work at the town orchestration level.
 *
 * Key differences from WORK_BEAD_TYPES:
 * - Includes 'epic' (multi-task coordination)
 * - Includes 'convoy' (multi-agent workflows)
 * - Excludes 'merge-request' (operational, not coordination)
 *
 * Used for: Town dashboard active work display
 */
export const TOWN_WORK_TYPES: IssueType[] = [
  'epic',
  'task',
  'bug',
  'feature',
  'chore',
  'convoy',
  'molecule',
]

/**
 * Check if a bead type is a town-level work type
 */
export function isTownWorkType(type: IssueType): boolean {
  return TOWN_WORK_TYPES.includes(type)
}

/**
 * Filter issues to only town-level work beads (includes epics and convoys)
 */
export function filterToTownWork(issues: Issue[]): Issue[] {
  return issues.filter(issue => isTownWorkType(issue.issue_type))
}

/**
 * Check if a bead type is a work type
 */
export function isWorkBeadType(type: IssueType): boolean {
  return WORK_BEAD_TYPES.includes(type)
}

/**
 * Check if a bead type is an event type
 */
export function isEventBeadType(type: IssueType): boolean {
  return EVENT_BEAD_TYPES.includes(type)
}

/**
 * Filter issues to only work beads (excludes events)
 */
export function filterToWorkBeads(issues: Issue[]): Issue[] {
  return issues.filter(issue => isWorkBeadType(issue.issue_type))
}

/**
 * Filter issues to only event beads
 */
export function filterToEventBeads(issues: Issue[]): Issue[] {
  return issues.filter(issue => isEventBeadType(issue.issue_type))
}

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface AgentViewConfig {
  /** Agent role type */
  role: string
  /** Display configuration */
  display: {
    icon: string
    label: string
    colorClass: string
    /** What to show as the primary metric */
    primaryMetric: 'hooked_work' | 'queue_size' | 'monitored_count' | 'active_work'
  }
  /** Bead types this agent works with */
  worksWith: IssueType[]
  /** Bead types this agent produces */
  produces: IssueType[]
  /** Bead types this agent monitors */
  monitors: IssueType[]
  /** Issue statuses relevant for this agent's view */
  relevantStatuses: IssueStatus[]
  /** Sections to show on the agent's detail card */
  cardSections: AgentCardSection[]
}

export type AgentCardSection =
  | 'hooked_bead'      // Current work on hook
  | 'work_queue'       // Pending work items
  | 'merge_queue'      // MRs waiting to merge (refinery)
  | 'monitored_agents' // Agents being watched (witness)
  | 'recent_activity'  // Recent events
  | 'convoy_progress'  // Convoy status (mayor, crew)
  | 'patrol_status'    // Patrol cycle info (witness, deacon)

// ============================================================================
// Agent View Configurations
// ============================================================================

export const AGENT_VIEW_CONFIGS: Record<string, AgentViewConfig> = {
  polecat: {
    role: 'polecat',
    display: {
      icon: '🏎',
      label: 'Polecat',
      colorClass: 'text-status-in-progress',
      primaryMetric: 'hooked_work',
    },
    worksWith: ['task', 'bug', 'feature', 'chore'],
    produces: ['merge-request', 'event'],
    monitors: [],
    relevantStatuses: ['open', 'in_progress'],
    cardSections: ['hooked_bead', 'recent_activity'],
  },

  crew: {
    role: 'crew',
    display: {
      icon: '👥',
      label: 'Crew',
      colorClass: 'text-accent-primary',
      primaryMetric: 'hooked_work',
    },
    worksWith: ['task', 'bug', 'feature', 'epic', 'chore', 'convoy'],
    produces: ['task', 'bug', 'feature', 'merge-request', 'event'],
    monitors: [],
    relevantStatuses: ['open', 'in_progress', 'blocked'],
    cardSections: ['hooked_bead', 'work_queue', 'convoy_progress', 'recent_activity'],
  },

  witness: {
    role: 'witness',
    display: {
      icon: '👁',
      label: 'Witness',
      colorClass: 'text-accent-secondary',
      primaryMetric: 'monitored_count',
    },
    // Witness runs patrol molecules (epic type with mol-witness-patrol title)
    // and monitors polecats/refinery health
    worksWith: ['molecule', 'epic', 'task'],
    produces: ['event'],
    monitors: ['agent', 'merge-request'],
    relevantStatuses: ['open', 'in_progress', 'blocked', 'closed'],
    cardSections: ['patrol_status', 'monitored_agents', 'recent_activity'],
  },

  refinery: {
    role: 'refinery',
    display: {
      icon: '⚙',
      label: 'Refinery',
      colorClass: 'text-status-open',
      primaryMetric: 'queue_size',
    },
    // Refinery creates 'task' beads with "Merge: *" titles for merge queue
    worksWith: ['task', 'merge-request'],
    produces: ['event'],
    monitors: ['merge-request'],
    relevantStatuses: ['open', 'in_progress', 'closed'],
    cardSections: ['merge_queue', 'recent_activity'],
  },

  mayor: {
    role: 'mayor',
    display: {
      icon: '🏛',
      label: 'Mayor',
      colorClass: 'text-accent-tertiary',
      primaryMetric: 'active_work',
    },
    worksWith: ['convoy', 'epic'],
    produces: ['convoy', 'task'],
    monitors: ['convoy', 'epic'],
    relevantStatuses: ['open', 'in_progress'],
    cardSections: ['hooked_bead', 'convoy_progress', 'recent_activity'],
  },

  deacon: {
    role: 'deacon',
    display: {
      icon: '📋',
      label: 'Deacon',
      colorClass: 'text-text-secondary',
      primaryMetric: 'monitored_count',
    },
    worksWith: ['molecule'],
    produces: ['event'],
    monitors: ['agent', 'rig'],
    relevantStatuses: ['open', 'in_progress'],
    cardSections: ['patrol_status', 'monitored_agents', 'recent_activity'],
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the view configuration for an agent role.
 */
export function getAgentViewConfig(role: string): AgentViewConfig {
  return AGENT_VIEW_CONFIGS[role] || AGENT_VIEW_CONFIGS.crew // Default to crew config
}

/**
 * Filter issues to only those relevant for a specific agent role.
 */
export function filterIssuesForRole(issues: Issue[], role: string): Issue[] {
  const config = getAgentViewConfig(role)
  const relevantTypes = new Set([...config.worksWith, ...config.monitors])
  const relevantStatuses = new Set(config.relevantStatuses)

  return issues.filter(issue =>
    relevantTypes.has(issue.issue_type) &&
    relevantStatuses.has(issue.status)
  )
}

/**
 * Get issues that an agent is actively working on (assigned to them).
 */
export function getAgentWorkload(issues: Issue[], agent: Agent): Issue[] {
  const config = getAgentViewConfig(agent.role_type)
  const workTypes = new Set(config.worksWith)

  return issues.filter(issue =>
    issue.assignee === agent.name ||
    issue.assignee === agent.id ||
    issue.assignee?.endsWith(`/${agent.name}`)
  ).filter(issue => workTypes.has(issue.issue_type))
}

/**
 * Get issues in the queue for a specific agent role (unassigned work they could take).
 */
export function getQueueForRole(issues: Issue[], role: string): Issue[] {
  const config = getAgentViewConfig(role)
  const workTypes = new Set(config.worksWith)

  return issues.filter(issue =>
    workTypes.has(issue.issue_type) &&
    issue.status === 'open' &&
    !issue.assignee
  )
}

/**
 * Get merge requests in the queue (for refinery view).
 * Includes both merge-request type AND task beads with "Merge:" prefix.
 */
export function getMergeQueue(issues: Issue[]): Issue[] {
  return issues.filter(issue =>
    // Traditional merge-request type
    (issue.issue_type === 'merge-request' &&
     (issue.status === 'open' || issue.status === 'in_progress')) ||
    // Task beads with "Merge:" prefix (refinery creates these)
    (issue.issue_type === 'task' && issue.title.startsWith('Merge:'))
  )
}

/**
 * Filter beads specifically for refinery display.
 * Shows merge queue tasks (task beads with "Merge:" prefix) and merge requests.
 */
export function filterRefineryBeads(issues: Issue[]): Issue[] {
  return issues.filter(issue => {
    // Task beads with "Merge:" prefix
    if (issue.issue_type === 'task' && issue.title.startsWith('Merge:')) {
      return true
    }
    // Also include any merge-request types
    if (issue.issue_type === 'merge-request') {
      return true
    }
    // Check for gt:merge-request label (refinery creates these)
    const labels = issue.labels || []
    if (labels.includes('gt:merge-request')) {
      return true
    }
    return false
  })
}

/**
 * Filter beads specifically for witness display.
 * Shows patrol molecules, digests, and health-check related beads.
 */
export function filterWitnessBeads(issues: Issue[]): Issue[] {
  return issues.filter(issue => {
    const title = issue.title.toLowerCase()

    // Witness patrol molecules and digests
    if (title.includes('mol-witness-patrol') ||
        title.includes('witness-patrol') ||
        title.includes('patrol') ||
        title.includes('health-check') ||
        title.startsWith('digest:')) {
      return true
    }
    // Molecule type beads
    if (issue.issue_type === 'molecule') {
      return true
    }
    // Epic type with witness assignee (patrol wisps are epics)
    if (issue.issue_type === 'epic' && issue.assignee?.includes('witness')) {
      return true
    }
    // Agent type beads (monitoring results)
    if (issue.issue_type === 'agent') {
      return true
    }
    // Check labels for patrol/health indicators
    const labels = issue.labels || []
    if (labels.some(l => ['patrol', 'health-check', 'stuck', 'alert', 'wisp'].includes(l))) {
      return true
    }
    return false
  })
}

/**
 * Get agents that a witness/deacon should be monitoring.
 */
export function getMonitoredAgents(agents: Agent[], monitorRole: 'witness' | 'deacon'): Agent[] {
  if (monitorRole === 'witness') {
    // Witness monitors polecats and refinery within a rig
    return agents.filter(a => a.role_type === 'polecat' || a.role_type === 'refinery')
  }
  if (monitorRole === 'deacon') {
    // Deacon monitors witnesses across rigs
    return agents.filter(a => a.role_type === 'witness')
  }
  return []
}

/**
 * Check if an agent should show a specific card section.
 */
export function shouldShowSection(role: string, section: AgentCardSection): boolean {
  const config = getAgentViewConfig(role)
  return config.cardSections.includes(section)
}

/**
 * Get the primary metric value for an agent.
 */
export function getAgentPrimaryMetric(
  agent: Agent,
  issues: Issue[],
  allAgents: Agent[]
): { label: string; value: number | string } {
  const config = getAgentViewConfig(agent.role_type)

  switch (config.display.primaryMetric) {
    case 'hooked_work':
      return {
        label: 'Hooked',
        value: agent.hook_bead ? '1 bead' : 'None',
      }

    case 'queue_size':
      const queue = getMergeQueue(issues)
      return {
        label: 'Queue',
        value: queue.length,
      }

    case 'monitored_count':
      const monitored = getMonitoredAgents(allAgents, agent.role_type as 'witness' | 'deacon')
      return {
        label: 'Monitoring',
        value: `${monitored.length} agents`,
      }

    case 'active_work':
      const workload = getAgentWorkload(issues, agent)
      return {
        label: 'Active',
        value: workload.length,
      }

    default:
      return { label: 'Status', value: agent.state }
  }
}

// ============================================================================
// Query Builders (for API calls)
// ============================================================================

export interface IssueQueryParams {
  types?: IssueType[]
  statuses?: IssueStatus[]
  assignee?: string
  unassigned?: boolean
}

/**
 * Build query params for fetching issues relevant to an agent role.
 */
export function buildQueryForRole(role: string, agentId?: string): IssueQueryParams {
  const config = getAgentViewConfig(role)

  return {
    types: [...config.worksWith, ...config.monitors],
    statuses: config.relevantStatuses,
    assignee: agentId,
  }
}

/**
 * Build query params for an agent's work queue.
 */
export function buildQueueQuery(role: string): IssueQueryParams {
  const config = getAgentViewConfig(role)

  return {
    types: config.worksWith,
    statuses: ['open'],
    unassigned: true,
  }
}

// ============================================================================
// Activity Filtering (for agent-specific activity history)
// ============================================================================

/**
 * Get activity events for a specific agent.
 * Matches by actor field OR title (for events where actor is empty but title contains agent name).
 */
export function getAgentActivity(
  events: ActivityEvent[],
  agent: Agent,
  limit = 50
): ActivityEvent[] {
  // Match agent by various possible formats:
  // - "agentName" (simple)
  // - "rig/role/agentName" (full path)
  // - "rig/polecats/agentName" (polecat format)
  // - "rig/crew/agentName" (crew format)
  // - "gt-rig-role-agentName" (session format in titles)
  const agentPatterns = [
    agent.name.toLowerCase(),
    agent.id.toLowerCase(),
    `${agent.rig}/${agent.role_type}/${agent.name}`.toLowerCase(),
    `${agent.rig}/polecats/${agent.name}`.toLowerCase(),
    `${agent.rig}/crew/${agent.name}`.toLowerCase(),
    `gt-${agent.rig}-crew-${agent.name}`.toLowerCase(),
    `gt-${agent.rig}-${agent.name}`.toLowerCase(),
  ]

  return events
    .filter(event => {
      const actor = (event.actor || '').toLowerCase()
      const title = (event.title || '').toLowerCase()

      // Check if actor matches any pattern
      const actorMatch = actor && agentPatterns.some(pattern =>
        actor === pattern ||
        actor.endsWith(`/${pattern}`) ||
        actor.includes(pattern)
      )

      // Also check title for agent references (when actor is empty)
      const titleMatch = !actor && agentPatterns.some(pattern =>
        title.includes(pattern)
      )

      return actorMatch || titleMatch
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

/**
 * Get the most recent activity for an agent (for card preview).
 */
export function getAgentLastActivity(
  events: ActivityEvent[],
  agent: Agent
): ActivityEvent | undefined {
  const agentEvents = getAgentActivity(events, agent, 1)
  return agentEvents[0]
}
