/**
 * AgentPeekPanel - Slide-out panel showing agent details.
 * Tabs: Work History (beads worked on), Mail (sent/received), Activity (event history)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCw, Mail, Activity, FileText, Terminal, Users, GitMerge } from 'lucide-react'
import { SlideOutPanel } from '@/components/layout/SlideOutPanel'
import { cachedFetch } from '@/services/cache'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import type { Agent, Issue, Mail as MailType } from '@/types'
import {
  getAgentViewConfig,
  filterToWorkBeads,
  filterToEventBeads,
  filterRefineryBeads,
  filterWitnessBeads,
} from '@/lib/agent-bead-config'

type PanelTab = 'mail' | 'beads' | 'activity'

interface AgentPeekPanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose: () => void
  /** ID of the rig containing the agent */
  rigId: string
  /** The agent to display */
  agent: Agent | null
}

export function AgentPeekPanel({
  isOpen,
  onClose,
  rigId,
  agent,
}: AgentPeekPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('beads')

  // Role-specific beads state
  const [roleBeads, setRoleBeads] = useState<Issue[]>([])
  const [beadsLoading, setBeadsLoading] = useState(false)

  // Mail state
  const [mailMessages, setMailMessages] = useState<MailType[]>([])
  const [mailLoading, setMailLoading] = useState(false)

  // Get role config for display
  const roleConfig = agent ? getAgentViewConfig(agent.role_type) : null

  // Helper to check if a field matches the agent
  const matchesAgent = (field: string | undefined, agentPatterns: string[]): boolean => {
    if (!field) return false
    const fieldLower = field.toLowerCase()
    return agentPatterns.some(pattern =>
      fieldLower === pattern ||
      fieldLower.endsWith(`/${pattern}`) ||
      fieldLower.includes(pattern)
    )
  }

  // Separate work beads from event beads (ADR-004)
  // Apply role-specific filtering for refinery (merge tasks) and witness (patrol beads)
  // For other roles, filter to work created by or assigned to this agent
  const workBeads = useMemo(() => {
    if (!agent) return []

    // Apply role-specific filters (these show rig-wide data, not agent-specific)
    if (agent.role_type === 'refinery') {
      return filterRefineryBeads(roleBeads)
    }
    if (agent.role_type === 'witness') {
      return filterWitnessBeads(roleBeads)
    }

    // For crew/polecat: filter to work created by or assigned to this agent
    const baseWorkBeads = filterToWorkBeads(roleBeads)

    const agentPatterns = [
      agent.id.toLowerCase(),
      agent.name.toLowerCase(),
      `${agent.role_type}/${agent.name}`.toLowerCase(),
      `crew/${agent.name}`.toLowerCase(),
      `polecats/${agent.name}`.toLowerCase(),
    ]

    return baseWorkBeads.filter(bead =>
      matchesAgent(bead.created_by, agentPatterns) ||
      matchesAgent(bead.assignee, agentPatterns)
    )
  }, [roleBeads, agent])

  // Filter event beads to only those created BY this agent
  const eventBeads = useMemo(() => {
    if (!agent) return []

    const events = filterToEventBeads(roleBeads)

    // Filter to events created by this agent
    // Match by various possible formats: full path, name, or partial path
    const agentPatterns = [
      agent.id.toLowerCase(),                    // "townview/witness"
      agent.name.toLowerCase(),                  // "witness"
      `${agent.role_type}/${agent.name}`.toLowerCase(), // "witness/witness"
    ]

    return events.filter(event => {
      const createdBy = (event.created_by || '').toLowerCase()
      if (!createdBy) return false

      return agentPatterns.some(pattern =>
        createdBy === pattern ||
        createdBy.endsWith(`/${pattern}`) ||
        createdBy.includes(pattern)
      )
    })
  }, [roleBeads, agent])

  // Fetch role-specific beads (molecules for witness, MRs for refinery, etc.)
  const fetchRoleBeads = useCallback(async () => {
    if (!agent || !roleConfig) return

    setBeadsLoading(true)
    try {
      // Build type filter from role config (worksWith + monitors + produces)
      const allTypes = new Set([
        ...roleConfig.worksWith,
        ...roleConfig.monitors,
        ...roleConfig.produces,
      ])
      const typeFilter = Array.from(allTypes).join(',')

      const url = `/api/rigs/${rigId}/issues?all=true&types=${typeFilter}`

      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        // Sort by updated_at descending - take more items to ensure we capture
        // work beads that might be older than recent events
        const sorted = result.data
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 100) // Increased limit to capture patrol/merge beads
        setRoleBeads(sorted)
      }
    } catch (err) {
      console.error('Failed to fetch role beads:', err)
    } finally {
      setBeadsLoading(false)
    }
  }, [rigId, agent, roleConfig])

  // Fetch mail for this agent
  const fetchMail = useCallback(async () => {
    if (!agent) return

    setMailLoading(true)
    try {
      const url = `/api/rigs/${rigId}/agents/${agent.name}/mail?limit=10`

      const result = await cachedFetch<MailType[]>(url, {
        cacheTTL: 30 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        setMailMessages(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch mail:', err)
    } finally {
      setMailLoading(false)
    }
  }, [rigId, agent])

  // Fetch data when panel opens
  useEffect(() => {
    if (isOpen && agent) {
      fetchRoleBeads()
      fetchMail()
    } else if (!isOpen) {
      setRoleBeads([])
      setMailMessages([])
    }
  }, [isOpen, agent, fetchRoleBeads, fetchMail])

  const title = agent?.name ? `Agent: ${agent.name}` : 'Agent Details'

  // Build terminal command hint
  const terminalCommand = agent ? `gt peek ${rigId}/${agent.role_type === 'witness' || agent.role_type === 'refinery' ? agent.role_type : (agent.role_type === 'crew' ? `crew/${agent.name}` : `polecats/${agent.name}`)}` : ''

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="w-[600px] max-w-[90vw]"
    >
      <div className="flex flex-col h-full">
        {/* Agent info header */}
        {agent && (
          <div className="px-4 py-3 bg-bg-tertiary border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded capitalize',
                  agent.state === 'working' ? 'bg-status-in-progress/20 text-status-in-progress' :
                  agent.state === 'stuck' ? 'bg-status-blocked/20 text-status-blocked' :
                  'bg-bg-secondary text-text-muted'
                )}>
                  {agent.state || 'idle'}
                </span>
                {agent.hook_bead && (
                  <span className="ml-2 text-xs text-text-muted">
                    Working on: <span className="mono">{agent.hook_bead}</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-text-muted">
                {formatRelativeTime(agent.updated_at)}
              </span>
            </div>

            {/* Terminal command hint */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Terminal className="w-3 h-3 text-text-muted" />
              <span className="text-text-muted">Terminal:</span>
              <code className="px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary font-mono text-[11px]">
                {terminalCommand}
              </code>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-border bg-bg-secondary">
          <button
            onClick={() => setActiveTab('beads')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              'border-b-2 -mb-[2px]',
              activeTab === 'beads'
                ? 'border-accent-chrome text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
            )}
          >
            {getRoleIcon(agent?.role_type)}
            {getRoleTabLabel(agent?.role_type)}
            {workBeads.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                {workBeads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('mail')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              'border-b-2 -mb-[2px]',
              activeTab === 'mail'
                ? 'border-accent-chrome text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
            )}
          >
            <Mail className="w-4 h-4" />
            Mail
            {mailMessages.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                {mailMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              'border-b-2 -mb-[2px]',
              activeTab === 'activity'
                ? 'border-accent-chrome text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
            )}
          >
            <Activity className="w-4 h-4" />
            Lifecycle
            {eventBeads.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                {eventBeads.length}
              </span>
            )}
          </button>
        </div>

        {/* Work Beads tab (excludes events) */}
        {activeTab === 'beads' && (
          <div className="flex-1 overflow-auto p-4">
            {beadsLoading ? (
              <div className="flex items-center justify-center h-32 text-text-muted">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading {getRoleTabLabel(agent?.role_type).toLowerCase()}...
              </div>
            ) : workBeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                {getRoleIcon(agent?.role_type, 'w-8 h-8 mb-2 opacity-50')}
                <span>No {getRoleTabLabel(agent?.role_type).toLowerCase()} found</span>
                <span className="text-xs mt-1 text-center max-w-xs">
                  {getRoleEmptyMessage(agent?.role_type)}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Group work beads by type for better readability */}
                {groupBeadsByType(workBeads).map(({ type, beads }) => (
                  <div key={type} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        {type}s ({beads.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {beads.map((issue) => (
                        <RoleBeadRow key={issue.id} issue={issue} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mail tab */}
        {activeTab === 'mail' && (
          <div className="flex-1 overflow-auto p-4">
            {mailLoading ? (
              <div className="flex items-center justify-center h-32 text-text-muted">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading mail...
              </div>
            ) : mailMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                <Mail className="w-8 h-8 mb-2 opacity-50" />
                <span>No mail for this agent</span>
                <span className="text-xs mt-1">
                  Check with: <code className="px-1 bg-bg-tertiary rounded">gt mail inbox {rigId}/{agent?.name}</code>
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {mailMessages.map((mail) => (
                  <MailRow key={mail.id} mail={mail} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lifecycle Events tab (event type beads only) */}
        {activeTab === 'activity' && (
          <div className="flex-1 overflow-auto p-4">
            {beadsLoading ? (
              <div className="flex items-center justify-center h-32 text-text-muted">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading lifecycle events...
              </div>
            ) : eventBeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <span>No lifecycle events found</span>
                <span className="text-xs mt-1 text-center max-w-xs">
                  Events include session start/end, context cycling (wisp), patrol completions, and merge results
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Group events by label category for better readability */}
                {groupEventsByCategory(eventBeads).map(({ category, beads }) => (
                  <div key={category} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getEventCategoryIcon(category)}</span>
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        {category} ({beads.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {beads.map((issue) => (
                        <RoleBeadRow key={issue.id} issue={issue} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SlideOutPanel>
  )
}

// ============================================================================
// Helper functions for role-specific display
// ============================================================================

function getRoleIcon(roleType: string | undefined, className = 'w-4 h-4') {
  switch (roleType) {
    case 'witness':
      return <Users className={className} />
    case 'refinery':
      return <GitMerge className={className} />
    default:
      return <FileText className={className} />
  }
}

function getRoleTabLabel(roleType: string | undefined): string {
  switch (roleType) {
    case 'witness':
      return 'Patrol Activity'
    case 'refinery':
      return 'Merge Queue'
    case 'deacon':
      return 'Infrastructure'
    case 'mayor':
      return 'Convoys'
    default:
      return 'Work History'
  }
}

function getRoleEmptyMessage(roleType: string | undefined): string {
  switch (roleType) {
    case 'witness':
      return 'Witness monitors polecats and refinery health. Check patrol logs with: gt peek witness'
    case 'refinery':
      return 'Refinery processes the merge queue. No pending merge requests.'
    case 'deacon':
      return 'Deacon monitors rig infrastructure and agent health.'
    case 'mayor':
      return 'Mayor coordinates convoys and epics across rigs.'
    default:
      return 'No recent activity found.'
  }
}

function groupBeadsByType(beads: Issue[]): Array<{ type: string; beads: Issue[] }> {
  const groups = new Map<string, Issue[]>()

  // Define display order for work beads
  const typeOrder = ['molecule', 'merge-request', 'agent', 'convoy', 'task', 'bug', 'feature', 'epic', 'chore']

  for (const bead of beads) {
    const type = bead.issue_type
    if (!groups.has(type)) {
      groups.set(type, [])
    }
    groups.get(type)!.push(bead)
  }

  // Sort by defined order
  return typeOrder
    .filter(type => groups.has(type))
    .map(type => ({ type, beads: groups.get(type)! }))
}

/**
 * Group event beads by category based on labels
 */
function groupEventsByCategory(events: Issue[]): Array<{ category: string; beads: Issue[] }> {
  const groups = new Map<string, Issue[]>()

  // Category detection based on labels
  const categoryOrder = ['session', 'wisp', 'patrol', 'merge', 'other']

  for (const event of events) {
    const labels = event.labels || []
    let category = 'other'

    if (labels.some(l => ['session', 'spawn', 'exit'].includes(l))) {
      category = 'session'
    } else if (labels.some(l => ['wisp', 'handoff', 'context'].includes(l))) {
      category = 'wisp'
    } else if (labels.some(l => ['patrol', 'health-check', 'alert', 'stuck'].includes(l))) {
      category = 'patrol'
    } else if (labels.some(l => ['merge', 'success', 'conflict', 'ci'].includes(l))) {
      category = 'merge'
    }

    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(event)
  }

  // Sort by defined order, filter empty groups
  return categoryOrder
    .filter(cat => groups.has(cat) && groups.get(cat)!.length > 0)
    .map(cat => ({ category: getCategoryLabel(cat), beads: groups.get(cat)! }))
}

/**
 * Get display label for event category
 */
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'session': return 'Session Lifecycle'
    case 'wisp': return 'Context Cycling'
    case 'patrol': return 'Patrol Events'
    case 'merge': return 'Merge Events'
    default: return 'Other Events'
  }
}

/**
 * Get icon for event category
 */
function getEventCategoryIcon(category: string): string {
  if (category.includes('Session')) return '🚀'
  if (category.includes('Context')) return '🔄'
  if (category.includes('Patrol')) return '👁'
  if (category.includes('Merge')) return '⎇'
  return '📝'
}

// ============================================================================
// Row Components
// ============================================================================

/**
 * Row component for displaying a role-specific bead with expandable details
 */
function RoleBeadRow({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false)

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'open': return '○'
      case 'in_progress': return '◐'
      case 'blocked': return '⊗'
      case 'closed': return '✓'
      case 'deferred': return '◑'
      default: return '•'
    }
  }

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'open': return 'text-status-open'
      case 'in_progress': return 'text-status-in-progress'
      case 'blocked': return 'text-status-blocked'
      case 'closed': return 'text-status-closed'
      case 'deferred': return 'text-status-deferred'
      default: return 'text-text-muted'
    }
  }

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'molecule': return '🧬'
      case 'merge-request': return '⎇'
      case 'event': return '📝'
      case 'agent': return '🤖'
      case 'convoy': return '🚂'
      case 'task': return '📋'
      case 'bug': return '🐛'
      case 'epic': return '🎯'
      default: return '•'
    }
  }

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-md bg-bg-secondary border border-border cursor-pointer transition-colors',
        'hover:bg-bg-tertiary/50'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0" title={issue.issue_type}>
          {getTypeIcon(issue.issue_type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', getStatusClass(issue.status))}>
              {getStatusIcon(issue.status)}
            </span>
            <span className={cn(
              'text-sm text-text-primary',
              expanded ? '' : 'truncate'
            )} title={issue.title}>
              {issue.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="mono text-xs text-text-muted">{issue.id}</span>
            {issue.assignee && (
              <span className="text-xs text-text-muted truncate max-w-[150px]">
                → {issue.assignee.split('/').pop()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-muted">
            {formatRelativeTime(issue.updated_at)}
          </span>
          <span className="text-text-muted text-sm">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {/* Description */}
          {issue.description && (
            <div>
              <div className="text-xs text-text-muted mb-1">Description</div>
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed bg-bg-tertiary/50 p-2 rounded">
                {issue.description}
              </pre>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Status: </span>
              <span className={cn('capitalize', getStatusClass(issue.status))}>
                {issue.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Priority: </span>
              <span className="text-text-primary">P{issue.priority}</span>
            </div>
            {issue.created_by && (
              <div>
                <span className="text-text-muted">Created by: </span>
                <span className="text-text-primary">{issue.created_by.split('/').pop()}</span>
              </div>
            )}
            {issue.assignee && (
              <div>
                <span className="text-text-muted">Assignee: </span>
                <span className="text-text-primary">{issue.assignee.split('/').pop()}</span>
              </div>
            )}
            <div>
              <span className="text-text-muted">Created: </span>
              <span className="text-text-primary">{formatRelativeTime(issue.created_at)}</span>
            </div>
            <div>
              <span className="text-text-muted">Updated: </span>
              <span className="text-text-primary">{formatRelativeTime(issue.updated_at)}</span>
            </div>
          </div>

          {/* Close reason if closed */}
          {issue.status === 'closed' && issue.close_reason && (
            <div>
              <div className="text-xs text-text-muted mb-1">Close Reason</div>
              <div className="text-sm text-status-closed bg-status-closed/10 p-2 rounded">
                {issue.close_reason}
              </div>
            </div>
          )}

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-text-muted">Labels:</span>
              {issue.labels.map(label => (
                <span
                  key={label}
                  className="text-xs px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Row component for displaying a mail message with expandable body
 */
function MailRow({ mail }: { mail: MailType }) {
  const [expanded, setExpanded] = useState(false)
  const [fullMail, setFullMail] = useState<MailType | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }

    // If we already have the body, just expand
    if (mail.body || fullMail?.body) {
      setExpanded(true)
      return
    }

    // Fetch full mail content
    setLoading(true)
    try {
      const response = await fetch(`/api/mail/${mail.id}`)
      if (response.ok) {
        const data = await response.json()
        setFullMail(data)
      }
    } catch (err) {
      console.error('Failed to fetch mail:', err)
    } finally {
      setLoading(false)
      setExpanded(true)
    }
  }

  const body = fullMail?.body || mail.body

  return (
    <div
      className={cn(
        'px-3 py-3 rounded-md border cursor-pointer transition-colors',
        mail.read ? 'bg-bg-secondary border-border' : 'bg-bg-tertiary border-accent-chrome/30',
        'hover:bg-bg-tertiary/80'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <Mail className={cn(
          'w-4 h-4 mt-0.5 flex-shrink-0',
          mail.read ? 'text-text-muted' : 'text-accent-chrome'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              'text-sm',
              expanded ? '' : 'truncate',
              mail.read ? 'text-text-secondary' : 'text-text-primary font-medium'
            )}>
              {mail.subject}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-text-muted" />}
              <span className="text-xs text-text-muted">
                {formatRelativeTime(mail.timestamp)}
              </span>
              <span className="text-text-muted text-sm">
                {expanded ? '▼' : '▶'}
              </span>
            </div>
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            From: {mail.from}
            {mail.to && <span className="ml-2">To: {mail.to}</span>}
          </div>

          {/* Preview when collapsed */}
          {!expanded && (mail.preview || mail.body) && (
            <div className="text-xs text-text-secondary mt-1 line-clamp-2">
              {mail.preview || mail.body?.slice(0, 150)}
            </div>
          )}

          {/* Full body when expanded */}
          {expanded && body && (
            <div className="mt-3 pt-3 border-t border-border">
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                {body}
              </pre>
            </div>
          )}

          {expanded && !body && !loading && (
            <div className="mt-3 pt-3 border-t border-border text-xs text-text-muted italic">
              No message body
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


