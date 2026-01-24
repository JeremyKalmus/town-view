/**
 * Service Data Flow Visualization Stories
 *
 * These stories serve as living documentation showing how data moves
 * through the service layer modules:
 * - Event Store: Event emission, persistence, and subscription
 * - Agent Registry: Heartbeat-based state machine transitions
 * - Telemetry Collector: Multi-source data aggregation
 * - Query Service: Caching behavior and data flow
 */
import type { Meta, StoryObj } from '@storybook/react'
import { useState, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES - Mirroring backend service types for visualization
// ============================================================================

interface Event {
  id: number
  type: string
  source: string
  rig: string
  payload: Record<string, unknown>
  timestamp: string
}

interface EventFilter {
  type?: string
  source?: string
  rig?: string
}

type AgentStatus = 'starting' | 'running' | 'idle' | 'working' | 'stuck' | 'stopping' | 'stopped'

interface AgentState {
  id: string
  name: string
  role: string
  status: AgentStatus
  currentBead?: string
  lastHeartbeat: string
  missedHeartbeats: number
}

interface TokenUsage {
  agentId: string
  beadId: string
  inputTokens: number
  outputTokens: number
  model: string
  timestamp: string
}

interface GitChange {
  agentId: string
  beadId: string
  commitSha: string
  filesChanged: number
  insertions: number
  deletions: number
  timestamp: string
}

interface TestRun {
  agentId: string
  beadId: string
  total: number
  passed: number
  failed: number
  timestamp: string
}

interface TelemetrySummary {
  totalTokens: { input: number; output: number }
  totalCommits: number
  totalTests: { passed: number; failed: number }
  byAgent: Record<string, { tokens: number; commits: number }>
}

interface CacheEntry {
  key: string
  data: unknown
  timestamp: number
  ttl: number
  hits: number
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockEvents: Event[] = [
  { id: 1, type: 'agent.registered', source: 'registry', rig: 'townview', payload: { agentId: 'obsidian' }, timestamp: '2026-01-24T10:00:00Z' },
  { id: 2, type: 'agent.heartbeat', source: 'registry', rig: 'townview', payload: { agentId: 'obsidian', status: 'working' }, timestamp: '2026-01-24T10:00:30Z' },
  { id: 3, type: 'bead.updated', source: 'beads', rig: 'townview', payload: { beadId: 'to-abc123', status: 'in_progress' }, timestamp: '2026-01-24T10:01:00Z' },
  { id: 4, type: 'telemetry.tokens', source: 'telemetry', rig: 'townview', payload: { agentId: 'obsidian', tokens: 1500 }, timestamp: '2026-01-24T10:01:30Z' },
  { id: 5, type: 'agent.heartbeat', source: 'registry', rig: 'townview', payload: { agentId: 'obsidian', status: 'working' }, timestamp: '2026-01-24T10:02:00Z' },
]

const mockAgentStates: AgentState[] = [
  { id: 'obsidian', name: 'obsidian', role: 'polecat', status: 'working', currentBead: 'to-abc123', lastHeartbeat: '2026-01-24T10:02:00Z', missedHeartbeats: 0 },
  { id: 'witness', name: 'witness', role: 'witness', status: 'idle', lastHeartbeat: '2026-01-24T10:01:45Z', missedHeartbeats: 0 },
  { id: 'refinery', name: 'refinery', role: 'refinery', status: 'idle', lastHeartbeat: '2026-01-24T10:01:30Z', missedHeartbeats: 0 },
]

const mockTokenUsage: TokenUsage[] = [
  { agentId: 'obsidian', beadId: 'to-abc123', inputTokens: 500, outputTokens: 200, model: 'claude-3-opus', timestamp: '2026-01-24T10:00:00Z' },
  { agentId: 'obsidian', beadId: 'to-abc123', inputTokens: 800, outputTokens: 350, model: 'claude-3-opus', timestamp: '2026-01-24T10:05:00Z' },
  { agentId: 'furiosa', beadId: 'to-def456', inputTokens: 600, outputTokens: 250, model: 'claude-3-sonnet', timestamp: '2026-01-24T10:03:00Z' },
]

const mockGitChanges: GitChange[] = [
  { agentId: 'obsidian', beadId: 'to-abc123', commitSha: 'abc1234', filesChanged: 3, insertions: 150, deletions: 20, timestamp: '2026-01-24T10:10:00Z' },
  { agentId: 'furiosa', beadId: 'to-def456', commitSha: 'def5678', filesChanged: 2, insertions: 80, deletions: 10, timestamp: '2026-01-24T10:12:00Z' },
]

const mockTestRuns: TestRun[] = [
  { agentId: 'obsidian', beadId: 'to-abc123', total: 25, passed: 24, failed: 1, timestamp: '2026-01-24T10:15:00Z' },
  { agentId: 'furiosa', beadId: 'to-def456', total: 18, passed: 18, failed: 0, timestamp: '2026-01-24T10:16:00Z' },
]

// ============================================================================
// AC-1: EVENT STORE DATA FLOW
// ============================================================================

function EventFlowStep({
  step,
  label,
  description,
  isActive,
  isComplete
}: {
  step: number
  label: string
  description: string
  isActive: boolean
  isComplete: boolean
}) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
      isActive ? 'border-status-in-progress bg-status-in-progress/10' :
      isComplete ? 'border-status-closed bg-status-closed/10' :
      'border-border bg-bg-secondary'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isActive ? 'bg-status-in-progress text-bg-primary' :
          isComplete ? 'bg-status-closed text-bg-primary' :
          'bg-bg-tertiary text-text-muted'
        }`}>
          {isComplete ? '✓' : step}
        </div>
        <span className="font-semibold text-text-primary">{label}</span>
      </div>
      <p className="text-sm text-text-secondary ml-11">{description}</p>
    </div>
  )
}

function EventCard({ event, isNew }: { event: Event; isNew?: boolean }) {
  return (
    <div className={`p-3 rounded border transition-all duration-500 ${
      isNew ? 'border-status-in-progress bg-status-in-progress/5 animate-pulse' : 'border-border bg-bg-secondary'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="mono text-xs text-accent-primary">#{event.id}</span>
        <span className="mono text-xs text-text-muted">{event.timestamp.split('T')[1].slice(0, 8)}</span>
      </div>
      <div className="font-medium text-text-primary text-sm">{event.type}</div>
      <div className="text-xs text-text-muted mt-1">
        source: {event.source} | rig: {event.rig}
      </div>
    </div>
  )
}

function SubscriberBox({
  filter,
  events,
  isReceiving
}: {
  filter: EventFilter
  events: Event[]
  isReceiving: boolean
}) {
  const filterLabel = filter.type || filter.source || 'all'
  return (
    <div className={`p-3 rounded border ${
      isReceiving ? 'border-status-in-progress' : 'border-border'
    } bg-bg-secondary`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📡</span>
        <span className="text-sm font-medium text-text-primary">
          Subscriber ({filterLabel})
        </span>
        {isReceiving && (
          <span className="text-xs text-status-in-progress animate-pulse">receiving...</span>
        )}
      </div>
      <div className="text-xs mono text-text-muted">
        {events.length} events received
      </div>
    </div>
  )
}

function EventStoreDataFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [events, setEvents] = useState<Event[]>([])
  const [subscribers, setSubscribers] = useState<{ filter: EventFilter; events: Event[] }[]>([
    { filter: { type: 'agent.heartbeat' }, events: [] },
    { filter: { source: 'beads' }, events: [] },
    { filter: {}, events: [] },
  ])
  const [isAnimating, setIsAnimating] = useState(false)
  const [newEventId, setNewEventId] = useState<number | null>(null)

  const emitEvent = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)

    const nextEvent = mockEvents[events.length % mockEvents.length]
    const eventWithNewId = { ...nextEvent, id: events.length + 1 }

    // Step 1: Emit
    setCurrentStep(1)

    setTimeout(() => {
      // Step 2: Persist
      setCurrentStep(2)
      setEvents(prev => [...prev, eventWithNewId])
      setNewEventId(eventWithNewId.id)

      setTimeout(() => {
        // Step 3: Notify
        setCurrentStep(3)
        setSubscribers(prev => prev.map(sub => {
          const matches =
            (!sub.filter.type || sub.filter.type === eventWithNewId.type) &&
            (!sub.filter.source || sub.filter.source === eventWithNewId.source)

          if (matches) {
            return { ...sub, events: [...sub.events, eventWithNewId] }
          }
          return sub
        }))

        setTimeout(() => {
          setCurrentStep(0)
          setNewEventId(null)
          setIsAnimating(false)
        }, 1000)
      }, 800)
    }, 800)
  }, [events.length, isAnimating])

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          EVENT STORE DATA FLOW
        </h1>
        <p className="text-text-secondary">
          Visualizes how events flow through the Event Store service:
          Emit → Persist to SQLite → Notify matching subscribers
        </p>
      </div>

      {/* Flow Steps */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <EventFlowStep
          step={1}
          label="Emit"
          description="Event created with type, source, rig, and payload"
          isActive={currentStep === 1}
          isComplete={currentStep > 1}
        />
        <EventFlowStep
          step={2}
          label="Persist"
          description="Stored in SQLite with auto-increment ID and timestamp"
          isActive={currentStep === 2}
          isComplete={currentStep > 2}
        />
        <EventFlowStep
          step={3}
          label="Notify"
          description="Broadcast to subscribers matching their filters"
          isActive={currentStep === 3}
          isComplete={false}
        />
      </div>

      {/* Controls */}
      <div className="mb-6">
        <button
          onClick={emitEvent}
          disabled={isAnimating}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isAnimating
              ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              : 'bg-accent-primary text-bg-primary hover:bg-accent-primary/80'
          }`}
        >
          {isAnimating ? 'Processing...' : 'Emit Event'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Event Log */}
        <div>
          <h3 className="section-header mb-3">PERSISTED EVENTS</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-text-muted text-sm p-4 text-center border border-dashed border-border rounded">
                No events yet. Click &quot;Emit Event&quot; to start.
              </div>
            ) : (
              events.slice().reverse().map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  isNew={event.id === newEventId}
                />
              ))
            )}
          </div>
        </div>

        {/* Subscribers */}
        <div>
          <h3 className="section-header mb-3">SUBSCRIBERS</h3>
          <div className="space-y-3">
            {subscribers.map((sub, idx) => (
              <SubscriberBox
                key={idx}
                filter={sub.filter}
                events={sub.events}
                isReceiving={currentStep === 3 && sub.events.length > 0 &&
                  sub.events[sub.events.length - 1].id === newEventId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Schema Reference */}
      <div className="mt-6 p-4 bg-bg-secondary rounded border border-border">
        <h4 className="text-sm font-semibold text-text-primary mb-2">SQLite Schema</h4>
        <pre className="text-xs mono text-text-muted overflow-x-auto">
{`CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  rig TEXT NOT NULL,
  payload TEXT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Indexes: timestamp, type, source, rig
-- Cleanup: Events older than 30 days auto-deleted`}
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// AC-2: AGENT REGISTRY STATE MACHINE
// ============================================================================

const stateTransitions: Record<AgentStatus, AgentStatus[]> = {
  starting: ['running'],
  running: ['idle', 'working', 'stopping'],
  idle: ['working', 'stuck', 'stopping'],
  working: ['idle', 'stuck', 'stopping'],
  stuck: ['idle', 'working', 'stopping'],
  stopping: ['stopped'],
  stopped: ['starting'],
}

const stateColors: Record<AgentStatus, string> = {
  starting: 'bg-accent-secondary',
  running: 'bg-status-in-progress',
  idle: 'bg-text-muted',
  working: 'bg-status-closed',
  stuck: 'bg-status-blocked',
  stopping: 'bg-status-in-progress',
  stopped: 'bg-text-muted',
}

function StateNode({
  status,
  isActive,
  onClick,
  canTransitionTo
}: {
  status: AgentStatus
  isActive: boolean
  onClick: () => void
  canTransitionTo: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canTransitionTo && !isActive}
      className={`p-3 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-accent-primary ring-2 ring-accent-primary/30 scale-110'
          : canTransitionTo
            ? 'border-border hover:border-accent-primary/50 cursor-pointer'
            : 'border-border opacity-50 cursor-not-allowed'
      }`}
    >
      <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${stateColors[status]}`} />
      <div className="text-sm font-medium text-text-primary capitalize">{status}</div>
    </button>
  )
}

function AgentRegistryStateMachine() {
  const [agents, setAgents] = useState<AgentState[]>(mockAgentStates)
  const [selectedAgent, setSelectedAgent] = useState<string>('obsidian')
  const [transitionLog, setTransitionLog] = useState<{ from: AgentStatus; to: AgentStatus; time: string }[]>([])

  const currentAgent = agents.find(a => a.id === selectedAgent)!
  const validTransitions = stateTransitions[currentAgent.status]

  const transitionTo = (newStatus: AgentStatus) => {
    if (!validTransitions.includes(newStatus)) return

    const now = new Date().toISOString()
    setTransitionLog(prev => [
      { from: currentAgent.status, to: newStatus, time: now },
      ...prev,
    ].slice(0, 10))

    setAgents(prev => prev.map(a =>
      a.id === selectedAgent
        ? { ...a, status: newStatus, lastHeartbeat: now }
        : a
    ))
  }

  const simulateHeartbeat = () => {
    const now = new Date().toISOString()
    setAgents(prev => prev.map(a =>
      a.id === selectedAgent
        ? { ...a, lastHeartbeat: now, missedHeartbeats: 0 }
        : a
    ))
  }

  const simulateMissedHeartbeat = () => {
    setAgents(prev => prev.map(a => {
      if (a.id === selectedAgent) {
        const newMissed = a.missedHeartbeats + 1
        return {
          ...a,
          missedHeartbeats: newMissed,
          status: newMissed >= 3 ? 'stuck' : a.status
        }
      }
      return a
    }))
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          AGENT REGISTRY STATE MACHINE
        </h1>
        <p className="text-text-secondary">
          Visualizes heartbeat-based agent state transitions. Click valid states to transition.
          Missed heartbeats automatically trigger stuck state after threshold.
        </p>
      </div>

      {/* Agent Selector */}
      <div className="mb-6 flex gap-3">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={`px-4 py-2 rounded border transition-all ${
              selectedAgent === agent.id
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-border text-text-secondary hover:border-text-muted'
            }`}
          >
            <span className="mr-2">🤖</span>
            {agent.name}
            <span className={`ml-2 inline-block w-2 h-2 rounded-full ${stateColors[agent.status]}`} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* State Machine Diagram */}
        <div>
          <h3 className="section-header mb-4">STATE MACHINE</h3>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(stateTransitions) as AgentStatus[]).map(status => (
              <StateNode
                key={status}
                status={status}
                isActive={currentAgent.status === status}
                onClick={() => transitionTo(status)}
                canTransitionTo={validTransitions.includes(status)}
              />
            ))}
          </div>

          {/* Valid Transitions */}
          <div className="mt-4 p-3 bg-bg-secondary rounded border border-border">
            <div className="text-xs text-text-muted mb-2">Valid transitions from {currentAgent.status}:</div>
            <div className="flex flex-wrap gap-2">
              {validTransitions.map(t => (
                <span key={t} className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-primary capitalize">
                  → {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Details & Controls */}
        <div>
          <h3 className="section-header mb-4">AGENT STATE</h3>
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">ID:</span>
                <span className="ml-2 mono text-text-primary">{currentAgent.id}</span>
              </div>
              <div>
                <span className="text-text-muted">Role:</span>
                <span className="ml-2 text-text-primary">{currentAgent.role}</span>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${stateColors[currentAgent.status]} text-bg-primary capitalize`}>
                  {currentAgent.status}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Bead:</span>
                <span className="ml-2 mono text-accent-primary text-xs">
                  {currentAgent.currentBead || 'none'}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Last Heartbeat:</span>
                <span className="ml-2 mono text-text-primary text-xs">
                  {currentAgent.lastHeartbeat.split('T')[1].slice(0, 8)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Missed:</span>
                <span className={`ml-2 font-bold ${
                  currentAgent.missedHeartbeats >= 3 ? 'text-status-blocked' :
                  currentAgent.missedHeartbeats > 0 ? 'text-status-in-progress' : 'text-text-primary'
                }`}>
                  {currentAgent.missedHeartbeats}
                </span>
              </div>
            </div>
          </div>

          {/* Heartbeat Controls */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={simulateHeartbeat}
              className="px-4 py-2 bg-status-closed text-bg-primary rounded font-medium hover:bg-status-closed/80 transition-colors"
            >
              💓 Send Heartbeat
            </button>
            <button
              onClick={simulateMissedHeartbeat}
              className="px-4 py-2 bg-status-blocked text-bg-primary rounded font-medium hover:bg-status-blocked/80 transition-colors"
            >
              💔 Miss Heartbeat
            </button>
          </div>

          {/* Transition Log */}
          <h4 className="text-sm font-semibold text-text-primary mb-2">Transition Log</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {transitionLog.length === 0 ? (
              <div className="text-text-muted text-xs">No transitions yet</div>
            ) : (
              transitionLog.map((t, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2">
                  <span className="mono text-text-muted">{t.time.split('T')[1].slice(0, 8)}</span>
                  <span className="capitalize text-text-secondary">{t.from}</span>
                  <span className="text-accent-primary">→</span>
                  <span className="capitalize text-text-primary">{t.to}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monitoring Rules */}
      <div className="mt-6 p-4 bg-bg-secondary rounded border border-border">
        <h4 className="text-sm font-semibold text-text-primary mb-2">Monitoring Rules</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• Background monitor checks every 10 seconds</li>
          <li>• Agent marked &quot;stuck&quot; after 3 missed heartbeats</li>
          <li>• Auto-deregistered after 5 minutes without heartbeat</li>
          <li>• Events emitted on status changes (registered, updated, deregistered)</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// AC-3: TELEMETRY AGGREGATION
// ============================================================================

function TelemetryCard({
  title,
  icon,
  children,
  highlight
}: {
  title: string
  icon: string
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className={`card p-4 ${highlight ? 'ring-2 ring-accent-primary/30' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h4 className="font-semibold text-text-primary">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value, subValue }: { label: string; value: string | number; subValue?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-text-primary">{value}</span>
        {subValue && <span className="text-xs text-text-muted ml-2">{subValue}</span>}
      </div>
    </div>
  )
}

function TelemetryAggregation() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>(mockTokenUsage)
  const [gitChanges, setGitChanges] = useState<GitChange[]>(mockGitChanges)
  const [testRuns, setTestRuns] = useState<TestRun[]>(mockTestRuns)
  const [selectedView, setSelectedView] = useState<'raw' | 'summary'>('summary')
  const [highlightSource, setHighlightSource] = useState<string | null>(null)

  // Calculate aggregates
  const summary: TelemetrySummary = {
    totalTokens: {
      input: tokenUsage.reduce((sum, t) => sum + t.inputTokens, 0),
      output: tokenUsage.reduce((sum, t) => sum + t.outputTokens, 0),
    },
    totalCommits: gitChanges.length,
    totalTests: {
      passed: testRuns.reduce((sum, t) => sum + t.passed, 0),
      failed: testRuns.reduce((sum, t) => sum + t.failed, 0),
    },
    byAgent: tokenUsage.reduce((acc, t) => {
      if (!acc[t.agentId]) acc[t.agentId] = { tokens: 0, commits: 0 }
      acc[t.agentId].tokens += t.inputTokens + t.outputTokens
      return acc
    }, {} as Record<string, { tokens: number; commits: number }>),
  }

  // Add commits to byAgent
  gitChanges.forEach(g => {
    if (!summary.byAgent[g.agentId]) summary.byAgent[g.agentId] = { tokens: 0, commits: 0 }
    summary.byAgent[g.agentId].commits++
  })

  const addTokenUsage = () => {
    const agents = ['obsidian', 'furiosa', 'toast']
    const models = ['claude-3-opus', 'claude-3-sonnet']
    const newUsage: TokenUsage = {
      agentId: agents[Math.floor(Math.random() * agents.length)],
      beadId: `to-${Math.random().toString(36).slice(2, 8)}`,
      inputTokens: Math.floor(Math.random() * 1000) + 200,
      outputTokens: Math.floor(Math.random() * 500) + 100,
      model: models[Math.floor(Math.random() * models.length)],
      timestamp: new Date().toISOString(),
    }
    setTokenUsage(prev => [...prev, newUsage])
    setHighlightSource('tokens')
    setTimeout(() => setHighlightSource(null), 1000)
  }

  const addGitChange = () => {
    const agents = ['obsidian', 'furiosa']
    const newChange: GitChange = {
      agentId: agents[Math.floor(Math.random() * agents.length)],
      beadId: `to-${Math.random().toString(36).slice(2, 8)}`,
      commitSha: Math.random().toString(36).slice(2, 9),
      filesChanged: Math.floor(Math.random() * 5) + 1,
      insertions: Math.floor(Math.random() * 200) + 10,
      deletions: Math.floor(Math.random() * 50),
      timestamp: new Date().toISOString(),
    }
    setGitChanges(prev => [...prev, newChange])
    setHighlightSource('git')
    setTimeout(() => setHighlightSource(null), 1000)
  }

  const addTestRun = () => {
    const agents = ['obsidian', 'furiosa']
    const total = Math.floor(Math.random() * 30) + 10
    const passed = Math.floor(total * (0.8 + Math.random() * 0.2))
    const newRun: TestRun = {
      agentId: agents[Math.floor(Math.random() * agents.length)],
      beadId: `to-${Math.random().toString(36).slice(2, 8)}`,
      total,
      passed,
      failed: total - passed,
      timestamp: new Date().toISOString(),
    }
    setTestRuns(prev => [...prev, newRun])
    setHighlightSource('tests')
    setTimeout(() => setHighlightSource(null), 1000)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          TELEMETRY AGGREGATION
        </h1>
        <p className="text-text-secondary">
          Shows how telemetry data from multiple sources (tokens, git, tests) flows into
          the collector and gets aggregated by agent and bead.
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSelectedView('summary')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedView === 'summary'
              ? 'bg-accent-primary text-bg-primary'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
          }`}
        >
          Aggregated View
        </button>
        <button
          onClick={() => setSelectedView('raw')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedView === 'raw'
              ? 'bg-accent-primary text-bg-primary'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
          }`}
        >
          Raw Data
        </button>
      </div>

      {/* Data Ingest Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={addTokenUsage}
          className="px-3 py-1.5 bg-status-in-progress/20 text-status-in-progress rounded text-sm hover:bg-status-in-progress/30 transition-colors"
        >
          + Add Token Usage
        </button>
        <button
          onClick={addGitChange}
          className="px-3 py-1.5 bg-status-closed/20 text-status-closed rounded text-sm hover:bg-status-closed/30 transition-colors"
        >
          + Add Git Change
        </button>
        <button
          onClick={addTestRun}
          className="px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded text-sm hover:bg-accent-primary/30 transition-colors"
        >
          + Add Test Run
        </button>
      </div>

      {selectedView === 'summary' ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Token Summary */}
          <TelemetryCard title="Token Usage" icon="🎟️" highlight={highlightSource === 'tokens'}>
            <DataRow label="Input Tokens" value={summary.totalTokens.input.toLocaleString()} />
            <DataRow label="Output Tokens" value={summary.totalTokens.output.toLocaleString()} />
            <DataRow
              label="Total"
              value={(summary.totalTokens.input + summary.totalTokens.output).toLocaleString()}
              subValue={`~$${((summary.totalTokens.input * 0.015 + summary.totalTokens.output * 0.075) / 1000).toFixed(2)}`}
            />
          </TelemetryCard>

          {/* Git Summary */}
          <TelemetryCard title="Git Changes" icon="📝" highlight={highlightSource === 'git'}>
            <DataRow label="Total Commits" value={summary.totalCommits} />
            <DataRow
              label="Lines Changed"
              value={gitChanges.reduce((sum, g) => sum + g.insertions + g.deletions, 0).toLocaleString()}
            />
            <DataRow
              label="Files Changed"
              value={gitChanges.reduce((sum, g) => sum + g.filesChanged, 0)}
            />
          </TelemetryCard>

          {/* Test Summary */}
          <TelemetryCard title="Test Results" icon="🧪" highlight={highlightSource === 'tests'}>
            <DataRow label="Total Runs" value={testRuns.length} />
            <DataRow label="Passed" value={summary.totalTests.passed} />
            <DataRow
              label="Failed"
              value={summary.totalTests.failed}
              subValue={summary.totalTests.failed > 0 ? '⚠️' : '✓'}
            />
          </TelemetryCard>

          {/* By Agent Breakdown */}
          <div className="col-span-3">
            <h3 className="section-header mb-3">BY AGENT</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(summary.byAgent).map(([agentId, data]) => (
                <div key={agentId} className="card p-3">
                  <div className="font-medium text-text-primary mb-2">🤖 {agentId}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-muted">Tokens:</span>
                      <span className="ml-2 text-text-primary">{data.tokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Commits:</span>
                      <span className="ml-2 text-text-primary">{data.commits}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Raw Token Data */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Token Usage ({tokenUsage.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tokenUsage.slice().reverse().map((t, idx) => (
                <div key={idx} className="p-2 bg-bg-secondary rounded text-xs">
                  <div className="mono text-accent-primary">{t.agentId}</div>
                  <div className="text-text-muted">
                    {t.inputTokens}in + {t.outputTokens}out ({t.model})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Git Data */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Git Changes ({gitChanges.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {gitChanges.slice().reverse().map((g, idx) => (
                <div key={idx} className="p-2 bg-bg-secondary rounded text-xs">
                  <div className="mono text-accent-primary">{g.agentId}</div>
                  <div className="text-text-muted">
                    {g.commitSha.slice(0, 7)}: +{g.insertions}/-{g.deletions}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Test Data */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Test Runs ({testRuns.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {testRuns.slice().reverse().map((t, idx) => (
                <div key={idx} className="p-2 bg-bg-secondary rounded text-xs">
                  <div className="mono text-accent-primary">{t.agentId}</div>
                  <div className="text-text-muted">
                    {t.passed}/{t.total} passed ({t.failed > 0 ? `${t.failed} failed` : 'all green'})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Flow Diagram */}
      <div className="mt-6 p-4 bg-bg-secondary rounded border border-border">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Aggregation Flow</h4>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">📥</div>
            <div className="text-text-muted">Ingest</div>
          </div>
          <div className="text-accent-primary">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">💾</div>
            <div className="text-text-muted">Store (SQLite)</div>
          </div>
          <div className="text-accent-primary">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">🔍</div>
            <div className="text-text-muted">Query + Filter</div>
          </div>
          <div className="text-accent-primary">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-text-muted">Aggregate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AC-4: QUERY SERVICE CACHE BEHAVIOR
// ============================================================================

function QueryServiceCache() {
  const [cache, setCache] = useState<CacheEntry[]>([])
  const [queryLog, setQueryLog] = useState<{ key: string; hit: boolean; time: string }[]>([])
  const [stats, setStats] = useState({ hits: 0, misses: 0 })

  const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  const simulateQuery = (key: string) => {
    const now = Date.now()
    const existing = cache.find(c => c.key === key)

    if (existing && now - existing.timestamp < existing.ttl) {
      // Cache hit
      setCache(prev => prev.map(c =>
        c.key === key ? { ...c, hits: c.hits + 1 } : c
      ))
      setQueryLog(prev => [{ key, hit: true, time: new Date().toISOString() }, ...prev].slice(0, 15))
      setStats(prev => ({ ...prev, hits: prev.hits + 1 }))
    } else {
      // Cache miss - fetch and store
      const newEntry: CacheEntry = {
        key,
        data: { fetched: true, timestamp: now },
        timestamp: now,
        ttl: DEFAULT_TTL,
        hits: 0,
      }
      setCache(prev => {
        const filtered = prev.filter(c => c.key !== key)
        return [...filtered, newEntry]
      })
      setQueryLog(prev => [{ key, hit: false, time: new Date().toISOString() }, ...prev].slice(0, 15))
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }))
    }
  }

  const invalidateCache = (key: string) => {
    setCache(prev => prev.filter(c => c.key !== key))
  }

  const clearCache = () => {
    setCache([])
    setStats({ hits: 0, misses: 0 })
    setQueryLog([])
  }

  const queryKeys = [
    'snapshot:townview',
    'agents:townview',
    'issues:townview',
    'mail:inbox',
    'activity:recent',
  ]

  // Simulate TTL expiry
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCache(prev => prev.filter(c => now - c.timestamp < c.ttl))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const hitRate = stats.hits + stats.misses > 0
    ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
    : '0'

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          QUERY SERVICE CACHE BEHAVIOR
        </h1>
        <p className="text-text-secondary">
          Demonstrates the caching layer behavior: TTL-based expiry, cache hits vs misses,
          and how the frontend cache service improves performance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-status-closed">{stats.hits}</div>
          <div className="text-sm text-text-muted">Cache Hits</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-status-blocked">{stats.misses}</div>
          <div className="text-sm text-text-muted">Cache Misses</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-accent-primary">{hitRate}%</div>
          <div className="text-sm text-text-muted">Hit Rate</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{cache.length}</div>
          <div className="text-sm text-text-muted">Cached Items</div>
        </div>
      </div>

      {/* Query Buttons */}
      <div className="mb-6">
        <h3 className="section-header mb-3">SIMULATE QUERIES</h3>
        <div className="flex flex-wrap gap-2">
          {queryKeys.map(key => (
            <button
              key={key}
              onClick={() => simulateQuery(key)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                cache.some(c => c.key === key)
                  ? 'bg-status-closed/20 text-status-closed hover:bg-status-closed/30'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <button
          onClick={clearCache}
          className="mt-3 px-3 py-1.5 bg-status-blocked/20 text-status-blocked rounded text-sm hover:bg-status-blocked/30 transition-colors"
        >
          Clear All Cache
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cache Contents */}
        <div>
          <h3 className="section-header mb-3">CACHE CONTENTS</h3>
          {cache.length === 0 ? (
            <div className="text-text-muted text-sm p-4 text-center border border-dashed border-border rounded">
              Cache is empty. Run some queries to populate.
            </div>
          ) : (
            <div className="space-y-2">
              {cache.map(entry => {
                const age = Date.now() - entry.timestamp
                const ttlPercent = Math.max(0, 100 - (age / entry.ttl) * 100)

                return (
                  <div key={entry.key} className="card p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="mono text-sm text-accent-primary">{entry.key}</span>
                      <button
                        onClick={() => invalidateCache(entry.key)}
                        className="text-xs text-status-blocked hover:underline"
                      >
                        invalidate
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>Hits: {entry.hits}</span>
                      <span>Age: {Math.floor(age / 1000)}s</span>
                    </div>
                    {/* TTL Progress Bar */}
                    <div className="mt-2 h-1 bg-bg-tertiary rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          ttlPercent > 50 ? 'bg-status-closed' :
                          ttlPercent > 20 ? 'bg-status-in-progress' :
                          'bg-status-blocked'
                        }`}
                        style={{ width: `${ttlPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Query Log */}
        <div>
          <h3 className="section-header mb-3">QUERY LOG</h3>
          {queryLog.length === 0 ? (
            <div className="text-text-muted text-sm p-4 text-center border border-dashed border-border rounded">
              No queries yet.
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {queryLog.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm py-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    log.hit
                      ? 'bg-status-closed/20 text-status-closed'
                      : 'bg-status-blocked/20 text-status-blocked'
                  }`}>
                    {log.hit ? 'HIT' : 'MISS'}
                  </span>
                  <span className="mono text-text-primary">{log.key}</span>
                  <span className="mono text-xs text-text-muted ml-auto">
                    {log.time.split('T')[1].slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cache Strategy */}
      <div className="mt-6 p-4 bg-bg-secondary rounded border border-border">
        <h4 className="text-sm font-semibold text-text-primary mb-2">Cache Strategy</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• <strong>TTL:</strong> 5 minutes default (configurable per key)</li>
          <li>• <strong>Storage:</strong> localStorage with JSON serialization</li>
          <li>• <strong>Invalidation:</strong> On write operations or explicit clear</li>
          <li>• <strong>Flow:</strong> Query → Check cache → Hit? Return cached : Fetch → Store → Return</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// STORYBOOK METADATA
// ============================================================================

const meta: Meta = {
  title: 'Reference/Service Data Flow',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj

export const EventStoreFlow: Story = {
  name: 'AC-1: Event Store Data Flow',
  render: () => <EventStoreDataFlow />,
}

export const RegistryStateMachine: Story = {
  name: 'AC-2: Agent Registry State Machine',
  render: () => <AgentRegistryStateMachine />,
}

export const TelemetryAggregationView: Story = {
  name: 'AC-3: Telemetry Aggregation',
  render: () => <TelemetryAggregation />,
}

export const QueryCacheBehavior: Story = {
  name: 'AC-4: Query Service Cache',
  render: () => <QueryServiceCache />,
}
