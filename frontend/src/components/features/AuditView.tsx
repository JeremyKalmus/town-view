import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRigStore } from '@/stores/rig-store'
import { useDataStore, selectAgentsByRig, selectIssuesByRig, selectConnected } from '@/stores/data-store'
import { getAgents } from '@/services'
import { useTestSuiteStatus, getDisplayStatus, isRegression } from '@/hooks/useTestSuiteStatus'
import { useFetch } from '@/hooks/useFetch'
import { cn } from '@/lib/class-utils'
import { getAgentRoleIcon, getAgentStateClass, getAgentStateBgClass } from '@/lib/agent-utils'
import { formatRelativeTime } from '@/lib/status-utils'
import { Search, User, GitCommit, TestTube, Coins, LayoutDashboard, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react'
import type { Agent, Issue, TestStatus } from '@/types'

// Tab types for the audit view
type AuditTab = 'overview' | 'git' | 'tests' | 'tokens'

// Token summary types from API
interface TokenModelSummary {
  input: number
  output: number
  cost_usd?: number
}

interface TokenSummary {
  total_input: number
  total_output: number
  total_cost_usd?: number
  by_model: Record<string, TokenModelSummary>
  by_agent: Record<string, TokenModelSummary>
}

// Git change from API
interface GitChange {
  timestamp: string
  commit_sha: string
  files_changed: number
  insertions: number
  deletions: number
  agent_id?: string
  bead_id?: string
}

interface AuditViewProps {
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
}

/**
 * AuditView - Redesigned view for auditing agent work and telemetry
 * Features: Agent selector sidebar, tab navigation, bead search
 */
export function AuditView(_props: AuditViewProps) {
  const { selectedRig } = useRigStore()

  // Data store (WebSocket-fed)
  const wsAgents = useDataStore(selectAgentsByRig(selectedRig?.id || ''))
  const wsIssues = useDataStore(selectIssuesByRig(selectedRig?.id || ''))
  const wsConnected = useDataStore(selectConnected)

  // HTTP fallback state for agents
  const [httpAgents, setHttpAgents] = useState<Agent[]>([])
  const [httpLoading, setHttpLoading] = useState(true)

  // Use WebSocket data when connected and available, otherwise HTTP fallback
  const agents = wsConnected && wsAgents.length > 0 ? wsAgents : httpAgents
  const issues = wsIssues

  // UI state
  const [activeTab, setActiveTab] = useState<AuditTab>('overview')
  const [beadSearch, setBeadSearch] = useState('')

  // Test suite data
  const { tests: testSuiteTests, loading: testsLoading } = useTestSuiteStatus({ enabled: true })

  // Token summary data
  const { data: tokenSummary, loading: tokensLoading } = useFetch<TokenSummary>(
    '/api/telemetry/tokens/summary',
    { enabled: !!selectedRig }
  )

  // Fetch agents via HTTP as fallback
  useEffect(() => {
    if (!selectedRig) {
      setHttpAgents([])
      setHttpLoading(false)
      return
    }

    // Skip HTTP fetch if WebSocket is connected and has data
    if (wsConnected && wsAgents.length > 0) {
      setHttpLoading(false)
      return
    }

    setHttpLoading(true)

    const fetchAgents = async () => {
      const result = await getAgents(selectedRig.id)
      if (result.data) {
        setHttpAgents(result.data)
      } else {
        setHttpAgents([])
      }
      setHttpLoading(false)
    }

    fetchAgents()
  }, [selectedRig?.id, wsConnected, wsAgents.length])

  // All tests (no agent filtering since sidebar removed)
  const filteredTests = testSuiteTests

  // Test metrics
  const testMetrics = useMemo(() => {
    const passing = filteredTests.filter(t => t.current_status === 'passed').length
    const failing = filteredTests.filter(t => t.current_status === 'failed').length
    const regressions = filteredTests.filter(t => isRegression(t)).length
    return { passing, failing, regressions, total: filteredTests.length }
  }, [filteredTests])

  // Filter issues (beads) by search
  const filteredBeads = useMemo(() => {
    if (!beadSearch.trim()) return []
    const search = beadSearch.toLowerCase()
    return issues.filter(issue =>
      issue.id.toLowerCase().includes(search) ||
      issue.title.toLowerCase().includes(search)
    ).slice(0, 10)
  }, [issues, beadSearch])

  // Handle bead selection
  const handleBeadSelect = useCallback((bead: Issue) => {
    setBeadSearch(bead.id)
    // Could navigate to bead-specific view
  }, [])

  if (!selectedRig) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted">Select a rig from the sidebar to view audit data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with bead search */}
      <div className="p-4 border-b border-border bg-bg-secondary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide">AUDIT</h1>
            <p className="text-text-muted text-sm mt-1">
              Review agent telemetry and work history
            </p>
          </div>
        </div>

        {/* Bead search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search beads by ID or title..."
            value={beadSearch}
            onChange={(e) => setBeadSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-rust focus:border-transparent"
          />
          {/* Bead search results dropdown */}
          {beadSearch && filteredBeads.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
              {filteredBeads.map(bead => (
                <button
                  key={bead.id}
                  onClick={() => handleBeadSelect(bead)}
                  className="w-full px-3 py-2 text-left hover:bg-bg-tertiary flex items-center gap-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className="font-mono text-accent-rust">{bead.id}</span>
                  <span className="text-text-secondary truncate">{bead.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content with tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab navigation */}
          <div className="border-b border-border bg-bg-primary">
            <div className="flex">
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Overview"
              />
              <TabButton
                active={activeTab === 'git'}
                onClick={() => setActiveTab('git')}
                icon={<GitCommit className="h-4 w-4" />}
                label="Git"
              />
              <TabButton
                active={activeTab === 'tests'}
                onClick={() => setActiveTab('tests')}
                icon={<TestTube className="h-4 w-4" />}
                label="Tests"
                badge={testMetrics.regressions > 0 ? testMetrics.regressions : undefined}
              />
              <TabButton
                active={activeTab === 'tokens'}
                onClick={() => setActiveTab('tokens')}
                icon={<Coins className="h-4 w-4" />}
                label="Tokens"
              />
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                agents={agents}
                testMetrics={testMetrics}
                tokenSummary={tokenSummary}
              />
            )}
            {activeTab === 'git' && (
              <GitTab />
            )}
            {activeTab === 'tests' && (
              <TestsTab
                tests={filteredTests}
                loading={testsLoading}
                metrics={testMetrics}
              />
            )}
            {activeTab === 'tokens' && (
              <TokensTab
                summary={tokenSummary}
                loading={tokensLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-accent-rust text-accent-rust'
          : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-status-in-progress/20 text-status-in-progress">
          {badge}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Tab Content Components
// ============================================================================

interface OverviewTabProps {
  agents: Agent[]
  testMetrics: { passing: number; failing: number; regressions: number; total: number }
  tokenSummary: TokenSummary | null | undefined
}

function OverviewTab({ agents, testMetrics, tokenSummary }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div>
        <h2 className="section-header mb-4">OVERVIEW</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Agents"
          value={agents.length.toString()}
          icon={<User className="h-5 w-5" />}
        />
        <StatCard
          label="Tests Passing"
          value={`${testMetrics.passing}/${testMetrics.total}`}
          icon={<CheckCircle className="h-5 w-5 text-status-closed" />}
        />
        <StatCard
          label="Regressions"
          value={testMetrics.regressions.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-status-in-progress" />}
          highlight={testMetrics.regressions > 0}
        />
        <StatCard
          label="Tokens Used"
          value={formatTokenCount(tokenSummary?.total_input ?? 0, tokenSummary?.total_output ?? 0)}
          icon={<Coins className="h-5 w-5" />}
        />
      </div>

      {/* Agent status */}
      {agents.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Agent Status</h3>
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-lg">{getAgentRoleIcon(agent.role_type)}</span>
                <div className="flex-1">
                  <div className="font-medium text-text-primary">{agent.name}</div>
                  <div className="text-xs text-text-muted">
                    {agent.hook_bead ? `Working on ${agent.hook_bead}` : 'Idle'}
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full capitalize',
                  getAgentStateBgClass(agent.state),
                  getAgentStateClass(agent.state)
                )}>
                  {agent.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GitTab() {
  // Fetch git changes
  const { data: gitChanges, loading } = useFetch<GitChange[]>(
    '/api/telemetry/git',
    { enabled: true }
  )

  return (
    <div className="space-y-4">
      <h2 className="section-header">GIT ACTIVITY</h2>

      {loading ? (
        <div className="py-8 text-center text-text-muted">Loading git activity...</div>
      ) : !gitChanges || gitChanges.length === 0 ? (
        <div className="py-8 text-center text-text-muted">No git activity found</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2">Commit</th>
                <th className="px-3 py-2">Files</th>
                <th className="px-3 py-2">Changes</th>
                <th className="px-3 py-2">Bead</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {gitChanges.slice(0, 50).map((change, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-bg-tertiary/50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {change.commit_sha.slice(0, 7)}
                  </td>
                  <td className="px-3 py-2">{change.files_changed}</td>
                  <td className="px-3 py-2">
                    <span className="text-status-closed">+{change.insertions}</span>
                    {' / '}
                    <span className="text-status-blocked">-{change.deletions}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-accent-rust">
                    {change.bead_id || '-'}
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {formatRelativeTime(change.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface TestsTabProps {
  tests: TestStatus[]
  loading: boolean
  metrics: { passing: number; failing: number; regressions: number; total: number }
}

function TestsTab({ tests, loading, metrics }: TestsTabProps) {
  return (
    <div className="space-y-4">
      <h2 className="section-header">
        TEST SUITE
        <span className="text-text-muted font-normal ml-2">({metrics.total} tests)</span>
      </h2>

      {/* Summary stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-status-closed" />
          <span className="text-text-secondary">{metrics.passing} passing</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-status-blocked" />
          <span className="text-text-secondary">{metrics.failing - metrics.regressions} failing</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-in-progress" />
          <span className="text-text-secondary">{metrics.regressions} regressions</span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-text-muted">Loading tests...</div>
      ) : tests.length === 0 ? (
        <div className="py-8 text-center text-text-muted">No test results found</div>
      ) : (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Test Name</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {tests.slice(0, 100).map(test => (
                <TestRow key={test.test_name} test={test} />
              ))}
            </tbody>
          </table>
          {tests.length > 100 && (
            <div className="py-2 text-center text-xs text-text-muted border-t border-border">
              Showing 100 of {tests.length} tests
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TestRow({ test }: { test: TestStatus }) {
  const displayStatus = getDisplayStatus(test)

  return (
    <tr className={cn(
      'border-b border-border transition-colors',
      displayStatus === 'passing' && 'bg-status-closed/5 hover:bg-status-closed/10',
      displayStatus === 'failing' && 'bg-status-blocked/5 hover:bg-status-blocked/10',
      displayStatus === 'regression' && 'bg-status-in-progress/5 hover:bg-status-in-progress/10'
    )}>
      <td className="px-3 py-2">
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded capitalize',
          displayStatus === 'passing' && 'bg-status-closed/20 text-status-closed',
          displayStatus === 'failing' && 'bg-status-blocked/20 text-status-blocked',
          displayStatus === 'regression' && 'bg-status-in-progress/20 text-status-in-progress'
        )}>
          {displayStatus}
        </span>
      </td>
      <td className="px-3 py-2 font-mono truncate max-w-[200px]" title={test.test_name}>
        {test.test_name}
      </td>
      <td className="px-3 py-2 text-text-secondary font-mono truncate max-w-[200px]" title={test.test_file}>
        {test.test_file}
      </td>
      <td className="px-3 py-2 text-text-muted">
        {formatRelativeTime(test.last_run_at)}
      </td>
    </tr>
  )
}

interface TokensTabProps {
  summary: TokenSummary | null | undefined
  loading: boolean
}

function TokensTab({ summary, loading }: TokensTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="section-header">TOKEN USAGE</h2>

      {loading ? (
        <div className="py-8 text-center text-text-muted">Loading token data...</div>
      ) : !summary ? (
        <div className="py-8 text-center text-text-muted">No token data available</div>
      ) : (
        <>
          {/* Total stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Input Tokens"
              value={formatNumber(summary.total_input)}
              icon={<Coins className="h-5 w-5" />}
            />
            <StatCard
              label="Output Tokens"
              value={formatNumber(summary.total_output)}
              icon={<Coins className="h-5 w-5" />}
            />
            <StatCard
              label="Est. Cost"
              value={summary.total_cost_usd ? `$${summary.total_cost_usd.toFixed(2)}` : '-'}
              icon={<Coins className="h-5 w-5" />}
            />
          </div>

          {/* By model breakdown */}
          {Object.keys(summary.by_model).length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-text-secondary mb-3">By Model</h3>
              <div className="space-y-2">
                {Object.entries(summary.by_model).map(([model, data]) => (
                  <div key={model} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="font-mono text-sm">{model}</span>
                    <div className="text-sm text-text-muted">
                      <span className="text-text-primary">{formatNumber(data.input)}</span> in
                      {' / '}
                      <span className="text-text-primary">{formatNumber(data.output)}</span> out
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By agent breakdown */}
          {Object.keys(summary.by_agent).length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-text-secondary mb-3">By Agent</h3>
              <div className="space-y-2">
                {Object.entries(summary.by_agent).map(([agent, data]) => (
                  <div key={agent} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm">{agent}</span>
                    <div className="text-sm text-text-muted">
                      <span className="text-text-primary">{formatNumber(data.input)}</span> in
                      {' / '}
                      <span className="text-text-primary">{formatNumber(data.output)}</span> out
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'card flex items-center gap-3',
      highlight && 'border-status-in-progress'
    )}>
      <div className="text-text-muted">{icon}</div>
      <div>
        <div className="text-xs text-text-muted uppercase tracking-wider">{label}</div>
        <div className={cn(
          'text-xl font-bold',
          highlight ? 'text-status-in-progress' : 'text-text-primary'
        )}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Utility functions
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatTokenCount(input: number, output: number): string {
  const total = input + output
  return formatNumber(total)
}
