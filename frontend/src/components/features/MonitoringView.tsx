import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import type { Rig, Agent } from '@/types'
import { useDataStore, selectAgentsByRig, selectConnected, selectLastUpdated } from '@/stores/data-store'
import { getAgents } from '@/services'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import { SkeletonAgentGrid, ErrorState } from '@/components/ui/Skeleton'
import { AgentPeekPanel, ActiveConvoysPanel, TestRegressionsPanel, TokenBurnRateWidget } from './monitoring'
import { AgentCard } from './AgentCard'
import { TestSuiteList } from './TestSuiteList'
import { useTestSuiteStatus, isRegression } from '@/hooks/useTestSuiteStatus'

interface MonitoringViewProps {
  rig: Rig
  refreshKey?: number
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
}

// Threshold for stuck detection (15 minutes in milliseconds)
const STUCK_THRESHOLD_MS = 15 * 60 * 1000

// Monitoring view tabs
type MonitoringTab = 'agents' | 'tests'

// Role display order
const ROLE_ORDER = ['witness', 'refinery', 'crew', 'polecat'] as const

// Role labels and icons
const ROLE_CONFIG: Record<string, { label: string; icon: string; description: string }> = {
  witness: { label: 'WITNESS', icon: '👁', description: 'Monitors polecat health' },
  refinery: { label: 'REFINERY', icon: '🔧', description: 'Processes merge queue' },
  crew: { label: 'CREW', icon: '👤', description: 'Human-managed workers' },
  polecat: { label: 'POLECATS', icon: '🐱', description: 'Transient workers' },
}

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
 * MonitoringView - Agent-centric view showing what each agent is doing
 * Organized by role type: witness → refinery → crew → polecats
 */
export function MonitoringView({ rig, refreshKey = 0 }: MonitoringViewProps) {
  // Data store (WebSocket-fed)
  const wsAgents = useDataStore(selectAgentsByRig(rig.id))
  const wsConnected = useDataStore(selectConnected)
  const wsLastUpdated = useDataStore(selectLastUpdated)

  // HTTP fallback state
  const [httpAgents, setHttpAgents] = useState<Agent[]>([])
  const [httpLoading, setHttpLoading] = useState(true)
  const [httpLastUpdated, setHttpLastUpdated] = useState<Date | null>(null)

  // Use WebSocket data when connected and available, otherwise HTTP fallback
  const agents = wsConnected && wsAgents.length > 0 ? wsAgents : httpAgents
  const loading = !wsConnected && httpLoading
  const lastUpdated = wsConnected && wsLastUpdated
    ? new Date(wsLastUpdated)
    : httpLastUpdated

  // Error states
  const [agentsError, setAgentsError] = useState<string | null>(null)

  // Retry counter for manual retry
  const [retryCount, setRetryCount] = useState(0)

  // Agent peek panel state
  const [peekPanelOpen, setPeekPanelOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<MonitoringTab>('agents')

  // Test suite data for regression count
  const { tests: testSuiteTests } = useTestSuiteStatus({ enabled: true })

  // Track if this is the initial load (skip cache on first load to get fresh data)
  const isInitialLoadRef = useRef(true)

  // Reset initial load flag when rig changes
  useEffect(() => {
    isInitialLoadRef.current = true
  }, [rig.id])

  // Fetch agents via HTTP as fallback
  useEffect(() => {
    // Skip HTTP fetch if WebSocket is connected and has data
    if (wsConnected && wsAgents.length > 0) {
      setHttpLoading(false)
      return
    }

    setHttpLoading(true)
    setAgentsError(null)

    const fetchAgentsData = async () => {
      const result = await getAgents(rig.id)

      if (result.data) {
        setHttpAgents(result.data)
        setHttpLastUpdated(new Date())
      } else {
        console.error('Failed to fetch agents:', result.error)
        setAgentsError(result.error || 'Failed to load agents')
        setHttpAgents([])
      }
      setHttpLoading(false)
      // Mark initial load as complete
      isInitialLoadRef.current = false
    }

    fetchAgentsData()
  }, [rig.id, refreshKey, retryCount, wsConnected, wsAgents.length])

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Group agents by role type
  const agentsByRole = useMemo(() => {
    const groups = new Map<string, Agent[]>()

    // Initialize empty groups for each role
    ROLE_ORDER.forEach(role => groups.set(role, []))

    // Group agents
    agents.forEach(agent => {
      const role = agent.role_type || 'polecat'
      const group = groups.get(role) || []
      group.push(agent)
      groups.set(role, group)
    })

    return groups
  }, [agents])

  // Count working agents
  const workingCount = agents.filter(a => a.state === 'working' || a.hook_bead).length
  const stuckCount = agents.filter(a => isAgentStuck(a)).length

  // Count test regressions
  const regressionCount = useMemo(
    () => testSuiteTests.filter(t => isRegression(t)).length,
    [testSuiteTests]
  )

  // Handle agent card click - open peek panel
  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setPeekPanelOpen(true)
  }, [])

  // Handle peek panel close
  const handlePeekPanelClose = useCallback(() => {
    setPeekPanelOpen(false)
    setSelectedAgent(null)
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">MONITORING</h1>
          <p className="text-text-muted text-sm mt-1">
            Agent status by role • {workingCount} working
            {stuckCount > 0 && <span className="text-status-blocked"> • {stuckCount} stuck</span>}
            {regressionCount > 0 && <span className="text-status-in-progress"> • {regressionCount} regression{regressionCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* Token usage widget - compact in header */}
          <TokenBurnRateWidget className="hidden lg:block" />

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 bg-bg-tertiary rounded-lg">
            <button
              onClick={() => setActiveTab('agents')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'agents'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
              )}
            >
              Agents
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'tests'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50',
                regressionCount > 0 && activeTab !== 'tests' && 'text-status-in-progress'
              )}
            >
              Tests
              {regressionCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-status-in-progress/20 text-status-in-progress">
                  {regressionCount}
                </span>
              )}
            </button>
          </div>
          {/* Activity Legend - only show when on agents tab */}
          {activeTab === 'agents' && (
            <div className="flex items-center gap-3 text-xs text-text-muted border-l border-border pl-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-closed" />
                <span>&lt;2m</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>2-10m</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-blocked" />
                <span>&gt;10m</span>
              </span>
            </div>
          )}
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

      {/* Content based on active tab */}
      {activeTab === 'agents' ? (
        <>
          {/* Test Regressions Panel - prominent alert at top if regressions exist */}
          <TestRegressionsPanel className="mb-4" />

          {/* Active Convoys Panel - positioned above agent sections */}
          <ActiveConvoysPanel rigId={rig.id} className="mb-6" />

          {/* Error state */}
          {agentsError && !loading && (
            <ErrorState
              title="Failed to load agents"
              message={agentsError}
              onRetry={handleRetry}
            />
          )}

          {/* Loading state */}
          {loading && <SkeletonAgentGrid count={4} />}

          {/* Agent sections by role */}
          {!loading && !agentsError && (
            <div className="space-y-4">
              {/* Top row: Witness, Refinery, Crew - side by side sections */}
              <div className="flex flex-wrap gap-6">
                {(['witness', 'refinery', 'crew'] as const).map(role => {
                  const roleAgents = agentsByRole.get(role) || []
                  if (roleAgents.length === 0) return null

                  const roleConfig = ROLE_CONFIG[role]
                  const workingInRole = roleAgents.filter(a => a.state === 'working' || a.hook_bead).length

                  return (
                    <CompactRoleSection
                      key={role}
                      label={roleConfig.label}
                      icon={roleConfig.icon}
                      agents={roleAgents}
                      workingCount={workingInRole}
                      onAgentClick={handleAgentClick}
                      allRigAgents={agents}
                    />
                  )
                })}
              </div>

              {/* Polecats row - full width grid */}
              {(() => {
                const polecatAgents = agentsByRole.get('polecat') || []
                if (polecatAgents.length === 0) return null

                const roleConfig = ROLE_CONFIG.polecat
                const workingInRole = polecatAgents.filter(a => a.state === 'working' || a.hook_bead).length

                return (
                  <RoleSection
                    label={roleConfig.label}
                    icon={roleConfig.icon}
                    agents={polecatAgents}
                    workingCount={workingInRole}
                    onAgentClick={handleAgentClick}
                    allRigAgents={agents}
                  />
                )
              })()}
            </div>
          )}
        </>
      ) : (
        /* Tests tab content */
        <div className="space-y-4">
          {/* Test Regressions Panel - prominent in tests tab */}
          <TestRegressionsPanel defaultExpanded={true} />

          <div className="card h-[calc(100vh-260px)]">
            <TestSuiteList />
          </div>
        </div>
      )}

      {/* Agent Peek Panel */}
      <AgentPeekPanel
        isOpen={peekPanelOpen}
        onClose={handlePeekPanelClose}
        rigId={rig.id}
        agent={selectedAgent}
      />
    </div>
  )
}

interface RoleSectionProps {
  label: string
  icon: string
  agents: Agent[]
  workingCount: number
  onAgentClick: (agent: Agent) => void
  /** All agents in the rig (for contextual status) */
  allRigAgents: Agent[]
}

/**
 * Compact section for singleton roles (witness, refinery, crew) - header above, cards below
 */
function CompactRoleSection({
  label,
  icon,
  agents,
  workingCount,
  onAgentClick,
  allRigAgents,
}: RoleSectionProps) {
  // Sort: stuck first, then working, then idle
  const sortedAgents = [...agents].sort((a, b) => {
    const stateOrder = { stuck: 0, working: 1, idle: 2, paused: 3 }
    const aState = isAgentStuck(a) ? 'stuck' : (a.hook_bead ? 'working' : a.state || 'idle')
    const bState = isAgentStuck(b) ? 'stuck' : (b.hook_bead ? 'working' : b.state || 'idle')
    return (stateOrder[aState as keyof typeof stateOrder] ?? 2) - (stateOrder[bState as keyof typeof stateOrder] ?? 2)
  })

  return (
    <div className="min-w-[280px] flex-1">
      {/* Role header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">{label}</h2>
        <span className="text-xs text-text-muted">
          {workingCount}/{agents.length}
        </span>
      </div>

      {/* Agent cards - responsive grid */}
      <div className="grid grid-cols-1 gap-3">
        {sortedAgents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => onAgentClick(agent)}
            rigAgents={allRigAgents}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Section component for a role type showing all agents of that role in a grid
 */
function RoleSection({
  label,
  icon,
  agents,
  workingCount,
  onAgentClick,
  allRigAgents,
}: RoleSectionProps) {
  // Sort: stuck first, then working, then idle
  const sortedAgents = [...agents].sort((a, b) => {
    const stateOrder = { stuck: 0, working: 1, idle: 2, paused: 3 }
    const aState = isAgentStuck(a) ? 'stuck' : (a.hook_bead ? 'working' : a.state || 'idle')
    const bState = isAgentStuck(b) ? 'stuck' : (b.hook_bead ? 'working' : b.state || 'idle')
    return (stateOrder[aState as keyof typeof stateOrder] ?? 2) - (stateOrder[bState as keyof typeof stateOrder] ?? 2)
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</h2>
        <span className="text-xs text-text-muted">
          {workingCount}/{agents.length}
        </span>
      </div>

      {/* Agent cards - use bigger AgentCard in grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedAgents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => onAgentClick(agent)}
            rigAgents={allRigAgents}
          />
        ))}
      </div>
    </div>
  )
}
