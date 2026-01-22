import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { AgentPeekPanel } from './AgentPeekPanel'
import type { Agent, Issue } from '@/types'

// Mock agent data for stories
const mockAgents: Agent[] = [
  {
    id: 'townview/polecats/dementus',
    name: 'dementus',
    role_type: 'polecat',
    rig: 'townview',
    state: 'working',
    hook_bead: 'to-123',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/witness',
    name: 'witness',
    role_type: 'witness',
    rig: 'townview',
    state: 'working',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/refinery',
    name: 'refinery',
    role_type: 'refinery',
    rig: 'townview',
    state: 'idle',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/crew/jeremy',
    name: 'jeremy',
    role_type: 'crew',
    rig: 'townview',
    state: 'working',
    hook_bead: 'to-456',
    updated_at: new Date().toISOString(),
  },
]

// Since AgentPeekPanel uses hooks internally, we create a wrapper
// that lets us control the panel state in stories
function AgentPeekPanelWrapper({
  initialOpen = false,
  ...props
}: Omit<React.ComponentProps<typeof AgentPeekPanel>, 'isOpen' | 'onClose'> & {
  initialOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const agentName = props.agent?.name || 'Agent'

  return (
    <div className="p-6">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-accent-chrome text-bg-primary rounded-md hover:bg-accent-chrome/90 transition-colors"
      >
        Open Panel: {agentName}
      </button>
      <AgentPeekPanel
        {...props}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}

const meta: Meta<typeof AgentPeekPanel> = {
  title: 'Features/Monitoring/AgentPeekPanel',
  component: AgentPeekPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AgentPeekPanel>

export const Default: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[0]}
    />
  ),
}

export const Closed: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={false}
      rigId="townview"
      agent={mockAgents[0]}
    />
  ),
}

export const WitnessAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[1]}
    />
  ),
}

export const RefineryAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[2]}
    />
  ),
}

export const CrewAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[3]}
    />
  ),
}

export const WithoutActivity: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[2]}
    />
  ),
}

// Interactive story showing all controls
export const Interactive: Story = {
  render: () => {
    return (
      <div className="p-6 space-y-4">
        <h2 className="section-header mb-4">AGENT PANELS</h2>
        <p className="text-text-secondary text-sm mb-4">
          Click any button to open the panel for that agent.
          Each panel has Work, Mail, and Lifecycle tabs.
        </p>
        <div className="flex flex-wrap gap-3">
          {mockAgents.map((agent) => (
            <AgentPeekPanelWrapper
              key={agent.id}
              initialOpen={false}
              rigId={agent.rig}
              agent={agent}
            />
          ))}
        </div>
      </div>
    )
  },
}

// ============================================================================
// WORK vs EVENTS - Showing the distinction between the tabs
// ============================================================================

// WORK BEADS - What agents are DOING (Tab 1)
const workBeads: Issue[] = [
  // Polecat/Crew work
  {
    id: 'gt-task-001',
    title: 'Implement user authentication flow',
    description: 'Add OAuth2 support for GitHub and Google login',
    issue_type: 'task',
    status: 'in_progress',
    priority: 1,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    assignee: 'townview/crew/jeremy',
    created_by: 'human',
    labels: ['auth', 'high-priority'],
    dependency_count: 0,
    dependent_count: 2,
  },
  {
    id: 'gt-bug-042',
    title: 'Fix session timeout not triggering',
    description: 'Users report session not expiring after 30 minutes idle',
    issue_type: 'bug',
    status: 'open',
    priority: 0,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_by: 'witness',
    labels: ['bug', 'session'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-feature-012',
    title: 'Add dark mode support',
    description: 'Implement theme switching with system preference detection',
    issue_type: 'feature',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    assignee: 'townview/polecats/wolf-7',
    created_by: 'mayor',
    close_reason: 'Implemented with CSS variables and localStorage persistence',
    labels: ['ui', 'theme'],
    dependency_count: 0,
    dependent_count: 0,
  },

  // Refinery work (merge-requests)
  {
    id: 'gt-mr-089',
    title: 'feat: Add monitoring dashboard',
    description: 'PR from wolf-7 implementing the new monitoring view',
    issue_type: 'merge-request',
    status: 'in_progress',
    priority: 1,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    assignee: 'townview/refinery',
    created_by: 'townview/polecats/wolf-7',
    labels: ['ready-to-merge'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-mr-090',
    title: 'fix: Resolve cache invalidation issue',
    description: 'Fixes the stale data bug on first page load',
    issue_type: 'merge-request',
    status: 'open',
    priority: 1,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_by: 'townview/crew/jeremy',
    labels: ['bug-fix'],
    dependency_count: 0,
    dependent_count: 0,
  },

  // Witness work (molecules/wisps)
  {
    id: 'gt-mol-patrol-003',
    title: 'Patrol Cycle #47',
    description: 'Checking polecat health and refinery status',
    issue_type: 'molecule',
    status: 'in_progress',
    priority: 1,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    assignee: 'townview/witness',
    created_by: 'witness',
    labels: ['patrol'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-mol-patrol-002',
    title: 'Patrol Cycle #46',
    description: 'Health check completed - all polecats healthy',
    issue_type: 'molecule',
    status: 'closed',
    priority: 1,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    assignee: 'townview/witness',
    created_by: 'witness',
    close_reason: 'All 3 polecats healthy, refinery clear, no stuck agents',
    labels: ['patrol'],
    dependency_count: 0,
    dependent_count: 0,
  },
]

// EVENT BEADS - What HAPPENED (lifecycle events) (Tab 3)
const eventBeads: Issue[] = [
  // Session lifecycle
  {
    id: 'gt-ev-session-start-789',
    title: 'Session started: wolf-7',
    description: 'Polecat wolf-7 spawned for task gt-task-001',
    issue_type: 'event',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_by: 'witness',
    labels: ['session', 'spawn'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-ev-session-end-788',
    title: 'Session ended: wolf-6',
    description: 'Polecat wolf-6 completed work and exited cleanly',
    issue_type: 'event',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    created_by: 'witness',
    labels: ['session', 'exit'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-ev-wisp-456',
    title: 'Wisp: wolf-7 context cycling',
    description: 'Agent wolf-7 approaching context limit, preparing handoff',
    issue_type: 'event',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_by: 'wolf-7',
    labels: ['wisp', 'handoff'],
    dependency_count: 0,
    dependent_count: 0,
  },

  // Patrol events
  {
    id: 'gt-ev-patrol-complete-047',
    title: 'Patrol completed: cycle #46',
    description: 'Witness completed patrol cycle. Found: 3 healthy polecats, 0 stuck, refinery clear',
    issue_type: 'event',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_by: 'witness',
    labels: ['patrol', 'health-check'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-ev-patrol-alert-045',
    title: 'Patrol alert: polecat stuck',
    description: 'Agent wolf-5 stuck on gt-task-099 for >15 minutes. Nudging.',
    issue_type: 'event',
    status: 'closed',
    priority: 0,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_by: 'witness',
    labels: ['patrol', 'alert', 'stuck'],
    dependency_count: 0,
    dependent_count: 0,
  },

  // Merge events
  {
    id: 'gt-ev-merge-success-089',
    title: 'Merge successful: gt-mr-088',
    description: 'PR "feat: Add sidebar navigation" merged to main',
    issue_type: 'event',
    status: 'closed',
    priority: 2,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    created_by: 'refinery',
    labels: ['merge', 'success'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-ev-merge-conflict-087',
    title: 'Merge conflict: gt-mr-087',
    description: 'PR "fix: Update auth flow" has conflicts with main. Notifying author.',
    issue_type: 'event',
    status: 'closed',
    priority: 1,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_by: 'refinery',
    labels: ['merge', 'conflict'],
    dependency_count: 0,
    dependent_count: 0,
  },
]

// ============================================================================
// Display Components (for Storybook visualization)
// ============================================================================

function BeadCard({ bead, showType = true }: { bead: Issue; showType?: boolean }) {
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'task': return '📋'
      case 'bug': return '🐛'
      case 'feature': return '✨'
      case 'merge-request': return '⎇'
      case 'molecule': return '🧬'
      case 'event': return '📝'
      case 'chore': return '🔧'
      default: return '•'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'open': return 'border-l-status-open'
      case 'in_progress': return 'border-l-status-in-progress'
      case 'blocked': return 'border-l-status-blocked'
      case 'closed': return 'border-l-status-closed'
      default: return 'border-l-text-muted'
    }
  }

  return (
    <div className={`p-3 bg-bg-secondary rounded border-l-4 ${getStatusColor(bead.status)}`}>
      <div className="flex items-start gap-2">
        {showType && <span className="text-lg">{getTypeIcon(bead.issue_type)}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary font-medium truncate">{bead.title}</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            <span className="font-mono">{bead.id}</span>
            <span className="mx-2">•</span>
            <span className="capitalize">{bead.status.replace('_', ' ')}</span>
          </div>
          {bead.description && (
            <div className="text-xs text-text-secondary mt-2 line-clamp-2">{bead.description}</div>
          )}
          {bead.labels && bead.labels.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {bead.labels.map(label => (
                <span key={label} className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, description, children }: {
  title: string
  icon: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-base font-bold text-text-primary">{title}</h3>
      </div>
      <p className="text-sm text-text-muted mb-3">{description}</p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Work vs Events Stories
// ============================================================================

/**
 * Shows the separation between WORK items (what agents do) and EVENT beads (what happened)
 */
export const WorkVsEvents: Story = {
  render: () => (
    <div className="p-6 bg-bg-primary min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Bead Type Separation</h1>
      <p className="text-text-secondary mb-8">
        Tab 1 shows WORK (what the agent is doing). Tab 3 shows EVENTS (lifecycle/status changes).
      </p>

      <div className="grid grid-cols-2 gap-8">
        {/* COLUMN 1: Work Items */}
        <div className="border border-border rounded-lg p-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-accent-primary mb-1">TAB 1: WORK</h2>
            <p className="text-sm text-text-muted">Active tasks, MRs, molecules - what they&apos;re DOING</p>
          </div>

          <Section
            title="Polecat/Crew: Work History"
            icon="📋"
            description="Tasks, bugs, features they've worked on"
          >
            {workBeads.filter(b => ['task', 'bug', 'feature', 'chore'].includes(b.issue_type)).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>

          <Section
            title="Refinery: Merge Queue"
            icon="⎇"
            description="PRs being processed"
          >
            {workBeads.filter(b => b.issue_type === 'merge-request').map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>

          <Section
            title="Witness: Patrol Activity"
            icon="🧬"
            description="Active patrol molecules/wisps"
          >
            {workBeads.filter(b => b.issue_type === 'molecule').map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>
        </div>

        {/* COLUMN 2: Events */}
        <div className="border border-border rounded-lg p-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-accent-secondary mb-1">TAB 3: EVENTS</h2>
            <p className="text-sm text-text-muted">Lifecycle events - what HAPPENED</p>
          </div>

          <Section
            title="Session Events"
            icon="🚀"
            description="Agent spawn/exit, context cycling (wisp)"
          >
            {eventBeads.filter(b => b.labels?.some(l => ['session', 'spawn', 'exit', 'wisp', 'handoff'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>

          <Section
            title="Patrol Events"
            icon="👁"
            description="Health checks, alerts, stuck detection"
          >
            {eventBeads.filter(b => b.labels?.some(l => ['patrol', 'health-check', 'alert'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>

          <Section
            title="Merge Events"
            icon="✓"
            description="Merge success/failure, conflicts"
          >
            {eventBeads.filter(b => b.labels?.some(l => ['merge'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </Section>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-bg-secondary rounded-lg">
        <h3 className="text-lg font-bold text-text-primary mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-accent-primary mb-1">Work Types (Tab 1)</h4>
            <ul className="text-text-secondary list-disc list-inside">
              <li><code className="text-accent-chrome">task</code> - Work items to complete</li>
              <li><code className="text-accent-chrome">bug</code> - Issues to fix</li>
              <li><code className="text-accent-chrome">feature</code> - New functionality</li>
              <li><code className="text-accent-chrome">merge-request</code> - PRs to process</li>
              <li><code className="text-accent-chrome">molecule</code> - Patrol cycles/wisps</li>
              <li><code className="text-accent-chrome">chore</code> - Maintenance work</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-accent-secondary mb-1">Event Types (Tab 3)</h4>
            <ul className="text-text-secondary list-disc list-inside">
              <li><code className="text-accent-tertiary">event</code> with <code>session</code> label - Spawn/exit</li>
              <li><code className="text-accent-tertiary">event</code> with <code>wisp</code> label - Context cycling</li>
              <li><code className="text-accent-tertiary">event</code> with <code>patrol</code> label - Health checks</li>
              <li><code className="text-accent-tertiary">event</code> with <code>merge</code> label - Merge results</li>
              <li><code className="text-accent-tertiary">event</code> with <code>alert</code> label - Stuck detection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),
}

/**
 * Shows what each agent role sees in their Work tab
 */
export const RoleSpecificWorkTabs: Story = {
  render: () => (
    <div className="p-6 bg-bg-primary min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Role-Specific Work Tabs</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Polecat/Crew */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <span className="text-2xl">🏎</span>
            <div>
              <h2 className="font-bold text-text-primary">Polecat / Crew</h2>
              <p className="text-xs text-text-muted">Tab: &quot;Work History&quot;</p>
            </div>
          </div>
          <div className="space-y-2">
            {workBeads.filter(b => ['task', 'bug', 'feature'].includes(b.issue_type)).map(bead => (
              <BeadCard key={bead.id} bead={bead} showType={true} />
            ))}
          </div>
          <div className="mt-4 text-xs text-text-muted">
            Types: task, bug, feature, chore
          </div>
        </div>

        {/* Refinery */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <span className="text-2xl">⚙</span>
            <div>
              <h2 className="font-bold text-text-primary">Refinery</h2>
              <p className="text-xs text-text-muted">Tab: &quot;Merge Queue&quot;</p>
            </div>
          </div>
          <div className="space-y-2">
            {workBeads.filter(b => b.issue_type === 'merge-request').map(bead => (
              <BeadCard key={bead.id} bead={bead} showType={true} />
            ))}
          </div>
          <div className="mt-4 text-xs text-text-muted">
            Types: merge-request
          </div>
        </div>

        {/* Witness */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <span className="text-2xl">👁</span>
            <div>
              <h2 className="font-bold text-text-primary">Witness</h2>
              <p className="text-xs text-text-muted">Tab: &quot;Patrol Activity&quot;</p>
            </div>
          </div>
          <div className="space-y-2">
            {workBeads.filter(b => b.issue_type === 'molecule').map(bead => (
              <BeadCard key={bead.id} bead={bead} showType={true} />
            ))}
          </div>
          <div className="mt-4 text-xs text-text-muted">
            Types: molecule
          </div>
        </div>
      </div>
    </div>
  ),
}

/**
 * Shows what the Events tab looks like with lifecycle events
 */
export const EventsTabBreakdown: Story = {
  render: () => (
    <div className="p-6 bg-bg-primary min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Events Tab (Lifecycle Events)</h1>
      <p className="text-text-secondary mb-6">
        All agents share the same Events tab structure, but filtered to their activity
      </p>

      <div className="space-y-6">
        {/* Session Events */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-status-closed/20 flex items-center justify-center">🚀</span>
            <h2 className="font-bold text-text-primary">Session Lifecycle</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Agent spawn, exit, context cycling (wisp), handoff
          </p>
          <div className="space-y-2">
            {eventBeads.filter(b => b.labels?.some(l => ['session', 'spawn', 'exit', 'wisp', 'handoff'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </div>
        </div>

        {/* Patrol Events */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">👁</span>
            <h2 className="font-bold text-text-primary">Patrol / Health Checks</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Witness patrol results, stuck agent detection, nudges
          </p>
          <div className="space-y-2">
            {eventBeads.filter(b => b.labels?.some(l => ['patrol', 'health-check', 'alert', 'stuck'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </div>
        </div>

        {/* Merge Events */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center">⎇</span>
            <h2 className="font-bold text-text-primary">Merge Outcomes</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Successful merges, conflicts, CI failures
          </p>
          <div className="space-y-2">
            {eventBeads.filter(b => b.labels?.some(l => ['merge', 'success', 'conflict'].includes(l))).map(bead => (
              <BeadCard key={bead.id} bead={bead} />
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
}
