import type { Meta, StoryObj } from '@storybook/react'
import { useState, useEffect, useCallback } from 'react'

/**
 * Service Layer Data Flow Visualization
 *
 * Living documentation showing how data moves through the Townview service layer:
 * - Event Store: Foundation for all state changes
 * - Agent Registry: Single source of truth for agent state
 * - Telemetry Collector: Operational metrics (tokens, git, tests)
 * - Query Service: Fast data access with caching
 */

// ============================================================================
// MOCK DATA TYPES (matching Go implementations)
// ============================================================================

interface Event {
  id: number
  type: string
  source: string
  rig: string
  payload: Record<string, unknown>
  timestamp: string
}

interface AgentState {
  id: string
  rig: string
  role: 'witness' | 'refinery' | 'crew' | 'polecat' | 'deacon' | 'mayor'
  name: string
  status: 'starting' | 'running' | 'idle' | 'working' | 'stuck' | 'stopping' | 'stopped'
  current_bead?: string
  last_heartbeat: string
  missed_heartbeats: number
  started_at: string
}

interface TokenUsage {
  agent_id: string
  bead_id?: string
  timestamp: string
  input_tokens: number
  output_tokens: number
  model: string
}

interface CacheEntry {
  key: string
  ttl: number
  expires_at: string
  hit_count: number
  data_type: string
}

// ============================================================================
// EVENT STORE DATA FLOW
// ============================================================================

function EventStoreDataFlow() {
  const [events, setEvents] = useState<Event[]>([])
  const [subscribers, setSubscribers] = useState<string[]>(['MonitoringView', 'AuditView'])
  const [newEventType, setNewEventType] = useState('bead.created')
  const [eventIdCounter, setEventIdCounter] = useState(1)

  const emitEvent = useCallback(() => {
    const newEvent: Event = {
      id: eventIdCounter,
      type: newEventType,
      source: 'townview/polecats/alpha',
      rig: 'townview',
      payload: { title: `Event ${eventIdCounter}`, status: 'open' },
      timestamp: new Date().toISOString(),
    }
    setEvents(prev => [newEvent, ...prev].slice(0, 10))
    setEventIdCounter(c => c + 1)
  }, [newEventType, eventIdCounter])

  const eventTypes = [
    'bead.created', 'bead.updated', 'bead.closed',
    'agent.started', 'agent.heartbeat', 'agent.stopped',
    'convoy.created', 'convoy.progress', 'convoy.completed'
  ]

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display text-xl font-bold tracking-wide mb-2">
        EVENT STORE DATA FLOW
      </h2>
      <p className="text-text-primary mb-6 text-sm">
        All state changes flow through the Event Store. Events are persisted to SQLite
        and broadcast to subscribers in real-time. (ADR-010)
      </p>

      {/* Architecture Diagram */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">ARCHITECTURE</div>
        <div className="flex items-center justify-center gap-4 text-sm font-mono">
          <div className="px-3 py-2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
            Agents
          </div>
          <span className="text-text-secondary">→ emit() →</span>
          <div className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
            Event Store
            <div className="text-xs text-text-muted mt-1">SQLite + In-Memory</div>
          </div>
          <span className="text-text-secondary">→ notify →</span>
          <div className="px-3 py-2 bg-green-500/20 text-green-400 rounded border border-green-500/30">
            Subscribers
            <div className="text-xs text-text-muted mt-1">{subscribers.length} active</div>
          </div>
        </div>
      </div>

      {/* Event Emission Controls */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">EMIT EVENT</div>
        <div className="flex gap-3 items-center">
          <select
            value={newEventType}
            onChange={(e) => setNewEventType(e.target.value)}
            className="bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary"
          >
            {eventTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={emitEvent}
            className="px-4 py-2 bg-amber-500 text-bg-primary rounded text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            Emit Event
          </button>
        </div>
      </div>

      {/* Event Stream */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">EVENT STREAM (most recent first)</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-text-muted text-sm py-4 text-center">
              No events yet. Click "Emit Event" to add one.
            </div>
          ) : (
            events.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-2 bg-bg-tertiary rounded text-sm animate-pulse"
                style={{ animationDuration: '0.5s', animationIterationCount: 1 }}
              >
                <span className="font-mono text-amber-400 w-8">#{event.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  event.type.startsWith('bead') ? 'bg-blue-500/20 text-blue-400' :
                  event.type.startsWith('agent') ? 'bg-green-500/20 text-green-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {event.type}
                </span>
                <span className="text-text-muted flex-1 truncate">{event.source}</span>
                <span className="text-text-secondary text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subscribers */}
      <div className="card p-4">
        <div className="text-xs text-text-secondary mb-3">ACTIVE SUBSCRIBERS</div>
        <div className="flex gap-2">
          {subscribers.map(sub => (
            <div key={sub} className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm">
              {sub}
            </div>
          ))}
          <button
            onClick={() => setSubscribers(prev => [...prev, `Subscriber${prev.length + 1}`])}
            className="px-3 py-1 bg-bg-tertiary text-text-muted rounded text-sm hover:bg-bg-tertiary/80"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AGENT REGISTRY STATE MACHINE
// ============================================================================

function AgentRegistryStateMachine() {
  const [agents, setAgents] = useState<AgentState[]>([
    {
      id: 'townview/witness',
      rig: 'townview',
      role: 'witness',
      name: 'witness',
      status: 'running',
      last_heartbeat: new Date().toISOString(),
      missed_heartbeats: 0,
      started_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'townview/polecats/alpha',
      rig: 'townview',
      role: 'polecat',
      name: 'alpha',
      status: 'working',
      current_bead: 'to-2e0s.1',
      last_heartbeat: new Date().toISOString(),
      missed_heartbeats: 0,
      started_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ])

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const statusColors: Record<string, string> = {
    starting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    working: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    stuck: 'bg-red-500/20 text-red-400 border-red-500/30',
    stopping: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    stopped: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }

  const transitions: Record<string, string[]> = {
    starting: ['running', 'stopped'],
    running: ['idle', 'working', 'stopping'],
    idle: ['working', 'stopping'],
    working: ['idle', 'stuck', 'stopping'],
    stuck: ['working', 'stopping'],
    stopping: ['stopped'],
    stopped: ['starting'],
  }

  const transitionAgent = (agentId: string, newStatus: AgentState['status']) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, status: newStatus, last_heartbeat: new Date().toISOString() }
        : a
    ))
  }

  const simulateHeartbeat = (agentId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, last_heartbeat: new Date().toISOString(), missed_heartbeats: 0 }
        : a
    ))
  }

  const simulateMissedBeat = (agentId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, missed_heartbeats: a.missed_heartbeats + 1 }
        : a
    ))
  }

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display text-xl font-bold tracking-wide mb-2">
        AGENT REGISTRY STATE MACHINE
      </h2>
      <p className="text-text-primary mb-6 text-sm">
        Single source of truth for agent state. Heartbeat-based health monitoring
        with automatic stuck/dead detection. (ADR-011)
      </p>

      {/* State Machine Diagram */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">STATE TRANSITIONS</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(transitions).map(([from, tos]) => (
            <div key={from} className="text-xs">
              <span className={`px-2 py-1 rounded ${statusColors[from]}`}>{from}</span>
              <span className="text-text-muted mx-1">→</span>
              {tos.map((to, i) => (
                <span key={to}>
                  <span className={`px-2 py-1 rounded ${statusColors[to]}`}>{to}</span>
                  {i < tos.length - 1 && <span className="text-text-muted">, </span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Agent List */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {agents.map(agent => (
          <div
            key={agent.id}
            className={`card p-4 cursor-pointer transition-all ${
              selectedAgent === agent.id ? 'ring-2 ring-amber-500' : ''
            }`}
            onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-amber-400">{agent.name}</span>
              <span className={`px-2 py-1 rounded text-xs border ${statusColors[agent.status]}`}>
                {agent.status}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Role:</span>
                <span className="text-text-primary">{agent.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Current bead:</span>
                <span className="text-text-primary">{agent.current_bead || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Missed beats:</span>
                <span className={agent.missed_heartbeats > 2 ? 'text-red-400' : 'text-text-primary'}>
                  {agent.missed_heartbeats}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Controls */}
      {selectedAgent && (
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-3">
            CONTROLS FOR {agents.find(a => a.id === selectedAgent)?.name.toUpperCase()}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => simulateHeartbeat(selectedAgent)}
              className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
            >
              Send Heartbeat
            </button>
            <button
              onClick={() => simulateMissedBeat(selectedAgent)}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
            >
              Miss Heartbeat
            </button>
            {transitions[agents.find(a => a.id === selectedAgent)?.status || 'stopped']?.map(newStatus => (
              <button
                key={newStatus}
                onClick={() => transitionAgent(selectedAgent, newStatus as AgentState['status'])}
                className={`px-3 py-1 rounded text-sm ${statusColors[newStatus]}`}
              >
                → {newStatus}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TELEMETRY AGGREGATION
// ============================================================================

function TelemetryAggregation() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([
    { agent_id: 'townview/polecats/alpha', bead_id: 'to-2e0s.1', timestamp: new Date().toISOString(), input_tokens: 15000, output_tokens: 3200, model: 'claude-opus-4-5-20251101' },
    { agent_id: 'townview/polecats/alpha', bead_id: 'to-2e0s.1', timestamp: new Date(Date.now() - 60000).toISOString(), input_tokens: 12000, output_tokens: 2800, model: 'claude-opus-4-5-20251101' },
    { agent_id: 'townview/polecats/beta', bead_id: 'to-2e0s.2', timestamp: new Date(Date.now() - 120000).toISOString(), input_tokens: 8000, output_tokens: 1500, model: 'claude-sonnet-4-20250514' },
  ])

  const totalInput = tokenUsage.reduce((sum, t) => sum + t.input_tokens, 0)
  const totalOutput = tokenUsage.reduce((sum, t) => sum + t.output_tokens, 0)

  // Cost calculation (approximate)
  const costPerMInput = 15  // $15 per million input tokens for Opus
  const costPerMOutput = 75 // $75 per million output tokens for Opus
  const estimatedCost = (totalInput * costPerMInput + totalOutput * costPerMOutput) / 1_000_000

  const byModel = tokenUsage.reduce((acc, t) => {
    if (!acc[t.model]) acc[t.model] = { input: 0, output: 0 }
    acc[t.model].input += t.input_tokens
    acc[t.model].output += t.output_tokens
    return acc
  }, {} as Record<string, { input: number; output: number }>)

  const addUsage = () => {
    const newUsage: TokenUsage = {
      agent_id: `townview/polecats/${['alpha', 'beta', 'gamma'][Math.floor(Math.random() * 3)]}`,
      bead_id: `to-2e0s.${Math.floor(Math.random() * 4) + 1}`,
      timestamp: new Date().toISOString(),
      input_tokens: Math.floor(Math.random() * 20000) + 5000,
      output_tokens: Math.floor(Math.random() * 5000) + 1000,
      model: Math.random() > 0.5 ? 'claude-opus-4-5-20251101' : 'claude-sonnet-4-20250514',
    }
    setTokenUsage(prev => [newUsage, ...prev].slice(0, 20))
  }

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display text-xl font-bold tracking-wide mb-2">
        TELEMETRY AGGREGATION
      </h2>
      <p className="text-text-primary mb-6 text-sm">
        Captures token usage (cost tracking), git changes (audit), and test results (quality).
        Data aggregated by agent, bead, and time range. (ADR-012)
      </p>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">TOTAL INPUT TOKENS</div>
          <div className="text-2xl font-display text-amber-400">
            {(totalInput / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">TOTAL OUTPUT TOKENS</div>
          <div className="text-2xl font-display text-blue-400">
            {(totalOutput / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">ESTIMATED COST</div>
          <div className="text-2xl font-display text-green-400">
            ${estimatedCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* By Model Breakdown */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">TOKEN USAGE BY MODEL</div>
        <div className="space-y-3">
          {Object.entries(byModel).map(([model, usage]) => (
            <div key={model} className="flex items-center gap-4">
              <span className="font-mono text-sm text-text-primary w-48 truncate">{model}</span>
              <div className="flex-1 flex gap-2">
                <div
                  className="h-4 bg-amber-500/50 rounded"
                  style={{ width: `${(usage.input / totalInput) * 100}%` }}
                  title={`Input: ${usage.input.toLocaleString()}`}
                />
                <div
                  className="h-4 bg-blue-500/50 rounded"
                  style={{ width: `${(usage.output / totalOutput) * 50}%` }}
                  title={`Output: ${usage.output.toLocaleString()}`}
                />
              </div>
              <span className="text-xs text-text-secondary w-24 text-right">
                {((usage.input + usage.output) / 1000).toFixed(1)}K total
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500/50 rounded" /> Input
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500/50 rounded" /> Output
          </span>
        </div>
      </div>

      {/* Recent Usage */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-text-secondary">RECENT TOKEN USAGE</div>
          <button
            onClick={addUsage}
            className="px-3 py-1 bg-amber-500 text-bg-primary rounded text-xs hover:bg-amber-400"
          >
            + Simulate Usage
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {tokenUsage.map((usage, i) => (
            <div key={i} className="flex items-center gap-3 text-sm p-2 bg-bg-tertiary rounded">
              <span className="font-mono text-amber-400 w-32 truncate">{usage.agent_id.split('/').pop()}</span>
              <span className="text-text-muted w-20">{usage.bead_id}</span>
              <span className="text-text-primary">
                {(usage.input_tokens / 1000).toFixed(1)}K in / {(usage.output_tokens / 1000).toFixed(1)}K out
              </span>
              <span className="text-text-secondary text-xs ml-auto">
                {new Date(usage.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// QUERY SERVICE CACHE BEHAVIOR
// ============================================================================

function QueryServiceCache() {
  const [cache, setCache] = useState<CacheEntry[]>([
    { key: 'rigs', ttl: 60000, expires_at: new Date(Date.now() + 45000).toISOString(), hit_count: 12, data_type: 'Rig[]' },
    { key: 'agents:townview', ttl: 5000, expires_at: new Date(Date.now() + 3000).toISOString(), hit_count: 45, data_type: 'AgentState[]' },
    { key: 'issues:townview:open', ttl: 30000, expires_at: new Date(Date.now() + 20000).toISOString(), hit_count: 8, data_type: 'Issue[]' },
    { key: 'convoy:to-2e0s', ttl: 10000, expires_at: new Date(Date.now() + 7000).toISOString(), hit_count: 23, data_type: 'ConvoyProgress' },
  ])

  const [queryLog, setQueryLog] = useState<{ key: string; hit: boolean; time: string }[]>([])

  const ttlConfig = {
    rigs: 60000,        // 1 minute
    agents: 5000,       // 5 seconds
    issues: 30000,      // 30 seconds
    convoy: 10000,      // 10 seconds
    dependencies: 60000, // 1 minute
    activity: 300000,   // 5 minutes
  }

  const simulateQuery = (key: string) => {
    const entry = cache.find(c => c.key === key)
    const now = new Date()

    if (entry && new Date(entry.expires_at) > now) {
      // Cache hit
      setCache(prev => prev.map(c =>
        c.key === key ? { ...c, hit_count: c.hit_count + 1 } : c
      ))
      setQueryLog(prev => [{ key, hit: true, time: now.toISOString() }, ...prev].slice(0, 10))
    } else {
      // Cache miss - fetch and cache
      const dataType = key.includes('rigs') ? 'Rig[]' :
                       key.includes('agents') ? 'AgentState[]' :
                       key.includes('issues') ? 'Issue[]' :
                       key.includes('convoy') ? 'ConvoyProgress' : 'unknown'
      const ttl = key.includes('rigs') ? ttlConfig.rigs :
                  key.includes('agents') ? ttlConfig.agents :
                  key.includes('issues') ? ttlConfig.issues :
                  ttlConfig.convoy

      const newEntry: CacheEntry = {
        key,
        ttl,
        expires_at: new Date(Date.now() + ttl).toISOString(),
        hit_count: 1,
        data_type: dataType,
      }
      setCache(prev => {
        const existing = prev.findIndex(c => c.key === key)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = newEntry
          return updated
        }
        return [...prev, newEntry]
      })
      setQueryLog(prev => [{ key, hit: false, time: now.toISOString() }, ...prev].slice(0, 10))
    }
  }

  const invalidateCache = (pattern: string) => {
    setCache(prev => prev.filter(c => !c.key.includes(pattern)))
    setQueryLog(prev => [
      { key: `INVALIDATE: ${pattern}`, hit: false, time: new Date().toISOString() },
      ...prev
    ].slice(0, 10))
  }

  // Auto-expire entries
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCache(prev => prev.map(c => ({
        ...c,
        expires_at: new Date(c.expires_at) < now
          ? new Date(Date.now() + c.ttl).toISOString() // Reset TTL for demo
          : c.expires_at
      })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display text-xl font-bold tracking-wide mb-2">
        QUERY SERVICE CACHE BEHAVIOR
      </h2>
      <p className="text-text-primary mb-6 text-sm">
        Direct SQLite access with in-memory caching. 10-100x faster than CLI shell-outs.
        Cache invalidates on relevant Event Store events. (ADR-013)
      </p>

      {/* TTL Configuration */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">CACHE TTL CONFIGURATION</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {Object.entries(ttlConfig).map(([key, ttl]) => (
            <div key={key} className="flex justify-between">
              <span className="font-mono text-text-muted">{key}:</span>
              <span className="text-text-primary">{ttl / 1000}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cache State */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">ACTIVE CACHE ENTRIES</div>
        <div className="space-y-2">
          {cache.map(entry => {
            const remaining = Math.max(0, (new Date(entry.expires_at).getTime() - Date.now()) / 1000)
            const pct = (remaining / (entry.ttl / 1000)) * 100
            return (
              <div key={entry.key} className="p-2 bg-bg-tertiary rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-amber-400 text-sm">{entry.key}</span>
                  <span className="text-xs text-text-muted">{entry.data_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-bg-secondary rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-16">
                    {remaining.toFixed(1)}s left
                  </span>
                  <span className="text-xs text-text-muted w-16">
                    {entry.hit_count} hits
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Query Controls */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-secondary mb-3">SIMULATE QUERIES</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => simulateQuery('rigs')}
            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30"
          >
            Query Rigs
          </button>
          <button
            onClick={() => simulateQuery('agents:townview')}
            className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
          >
            Query Agents
          </button>
          <button
            onClick={() => simulateQuery('issues:townview:open')}
            className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded text-sm hover:bg-amber-500/30"
          >
            Query Issues
          </button>
          <button
            onClick={() => simulateQuery('convoy:to-2e0s')}
            className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm hover:bg-purple-500/30"
          >
            Query Convoy
          </button>
          <span className="text-text-muted mx-2">|</span>
          <button
            onClick={() => invalidateCache('issues')}
            className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
          >
            Invalidate Issues
          </button>
          <button
            onClick={() => invalidateCache('agents')}
            className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
          >
            Invalidate Agents
          </button>
        </div>
      </div>

      {/* Query Log */}
      <div className="card p-4">
        <div className="text-xs text-text-secondary mb-3">QUERY LOG</div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {queryLog.length === 0 ? (
            <div className="text-text-muted text-sm py-2 text-center">
              No queries yet. Click buttons above to simulate.
            </div>
          ) : (
            queryLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${
                  log.key.startsWith('INVALIDATE') ? 'bg-red-500/20 text-red-400' :
                  log.hit ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {log.key.startsWith('INVALIDATE') ? 'INVALIDATE' : log.hit ? 'HIT' : 'MISS'}
                </span>
                <span className="font-mono text-text-primary">{log.key}</span>
                <span className="text-text-muted ml-auto">
                  {new Date(log.time).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STORYBOOK CONFIGURATION
// ============================================================================

const meta: Meta = {
  title: 'Reference/Service Layer Data Flow',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj

export const EventStoreDataFlowStory: Story = {
  name: 'Event Store Data Flow',
  render: () => <EventStoreDataFlow />,
}

export const AgentRegistryStateMachineStory: Story = {
  name: 'Agent Registry State Machine',
  render: () => <AgentRegistryStateMachine />,
}

export const TelemetryAggregationStory: Story = {
  name: 'Telemetry Aggregation',
  render: () => <TelemetryAggregation />,
}

export const QueryServiceCacheStory: Story = {
  name: 'Query Service Cache',
  render: () => <QueryServiceCache />,
}
