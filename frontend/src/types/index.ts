// Import convoy types for use in Issue interface
import type { ConvoyInfo } from './convoy'

// Issue status enum
export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'deferred'
  | 'closed'
  | 'tombstone';

// Issue type enum
export type IssueType =
  | 'bug'
  | 'feature'
  | 'task'
  | 'epic'
  | 'chore'
  | 'merge-request'
  | 'molecule'
  | 'gate'
  | 'convoy'
  | 'agent'
  | 'event'
  | 'rig';

// Agent role type enum
export type AgentRoleType =
  | 'witness'
  | 'refinery'
  | 'crew'
  | 'polecat'
  | 'deacon'
  | 'mayor';

// Agent state enum (matches state machine: starting → running ↔ idle/working → stuck/stopping → stopped)
export type AgentState =
  | 'starting'
  | 'running'
  | 'idle'
  | 'working'
  | 'stuck'
  | 'stopping'
  | 'stopped'
  | 'paused';

// Issue interface
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: number;
  issue_type: IssueType;
  owner?: string;
  assignee?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: string;
  labels?: string[];
  dependency_count: number;
  dependent_count: number;
  convoy?: ConvoyInfo;
}

// Agent health for sidebar indicators
// null means the role doesn't exist for this rig
export interface AgentHealth {
  witness: AgentState | null;
  refinery: AgentState | null;
  crew: AgentState | null;
}

// Rig interface
export interface Rig {
  id: string;
  name: string;
  prefix: string;
  path: string;
  beads_path: string;
  issue_count: number;
  open_count: number;
  agent_count: number;
  agent_health?: AgentHealth;
}

// Agent interface
export interface Agent {
  id: string;
  name: string;
  role_type: AgentRoleType;
  rig: string;
  state: AgentState;
  hook_bead?: string;
  session_id?: string;
  created_at?: string;
  updated_at: string;
  last_activity_at?: string;
}

// Issue update payload
export interface IssueUpdate {
  status?: IssueStatus;
  priority?: number;
  title?: string;
  description?: string;
  assignee?: string;
  labels?: string[];
}

// Server-Sent Events message
export interface WSMessage {
  type: 'issue_changed' | 'issue_created' | 'issue_update' | 'beads_changed' | 'rig_discovered' | 'rig_update' | 'agent_state_changed' | 'mail_received' | 'convoy_progress_changed';
  rig?: string;
  payload?: Record<string, unknown>;
}

// Re-export mail types
export type { Mail } from './mail'

// Re-export convoy types
export type { ConvoyInfo, ConvoyProgress } from './convoy'

// Filter options
export interface IssueFilters {
  status?: IssueStatus | 'all';
  type?: IssueType;
  priority?: number;
  assignee?: string;
}

// Tree node interface for roadmap hierarchy
export interface TreeNode {
  id: string;
  parentId?: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  depth: number;
}

// Keyboard navigation state for tree
export interface TreeNavigationState {
  focusedId: string | null;
  expandedIds: Set<string>;
}

// Dependency represents a relationship between issues
export interface Dependency {
  from_id: string;
  to_id: string;
  type: 'blocks' | 'parent-child';
}

// Comment on an issue
export interface Comment {
  id: number;
  issue_id: string;
  author: string;
  text: string;
  created_at: string;
}

// History entry for audit trail
export interface HistoryEntry {
  id: string;
  timestamp: string;
  actor: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
}

// IssueDependencies contains blockers and blocked-by for an issue
export interface IssueDependencies {
  blockers: Issue[];   // Issues that block this issue
  blocked_by: Issue[]; // Issues blocked by this issue
}

// Time metrics for audit display (in milliseconds)
export interface TimeMetrics {
  avg: number;
  min: number;
  max: number;
}

// Type breakdown for audit display
export interface TypeBreakdown {
  bugs: number;
  tasks: number;
  features: number;
}

// Audit metrics for convoy/issue analysis
export interface AuditMetrics {
  timeToComplete: TimeMetrics;
  completionCount: number;
  typeBreakdown: TypeBreakdown;
  // Anomaly thresholds (values above these are considered anomalies)
  anomalyThresholds?: {
    timeToComplete?: number;  // milliseconds
  };
}

// Molecule progress tracking
export interface MoleculeProgress {
  issue_id: string;
  current_step: number;
  total_steps: number;
  step_name: string;
  status: string;
}

// Convoy progress event payload (detailed status breakdown for WS events)
export interface ConvoyProgressEvent {
  convoy_id: string;
  total: number;       // Total tracked issues
  open: number;        // Issues with status 'open'
  in_progress: number; // Issues with status 'in_progress'
  blocked: number;     // Issues with status 'blocked'
  closed: number;      // Issues with status 'closed'
}

// Agent terminal output peek
export interface PeekOutput {
  agent_id: string;
  lines: string[];
  timestamp: string;
}

// Activity event for recent changes
export interface ActivityEvent {
  id: string;
  issue_id: string;
  issue_type: IssueType;
  title: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  actor: string;
  timestamp: string;
}

// Test suite status from telemetry API
export type TestStatusValue = 'passed' | 'failed' | 'skipped' | 'error';

export interface TestStatus {
  test_name: string;
  test_file: string;
  current_status: TestStatusValue;
  last_run_at: string;
  last_passed_at?: string;
  last_passed_commit?: string;
  fail_count: number;
  total_runs: number;
}

// Test history entry for expanded view
export interface TestHistoryEntry {
  test_name: string;
  status: TestStatusValue;
  timestamp: string;
  commit_sha?: string;
  duration_ms: number;
  error_message?: string;
}

// Work item health status based on duration
export type WorkItemHealthStatus = 'healthy' | 'concerning' | 'stuck';

export interface WorkItemHealth {
  status: WorkItemHealthStatus;
  duration_ms: number;
  started_at: string;
}

// =============================================================================
// Telemetry Types (ADR-015)
// =============================================================================

// Token usage for a single API request
export interface TokenUsage {
  agent_id: string;
  bead_id?: string;
  timestamp: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  request_type: string; // chat, tool_use, completion
}

// Git commit made by an agent
export interface GitChange {
  agent_id: string;
  bead_id?: string;
  timestamp: string;
  commit_sha: string;
  branch: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  message: string;
  diff_summary?: string;
}

// Single test outcome
export interface TestResult {
  agent_id: string;
  bead_id?: string;
  timestamp: string;
  commit_sha?: string;
  test_file: string;
  test_name: string;
  status: string; // passed, failed, skipped, error
  duration_ms: number;
  error_message?: string;
  stack_trace?: string;
}

// Aggregated test execution
export interface TestRun {
  agent_id: string;
  bead_id?: string;
  timestamp: string;
  commit_sha?: string;
  branch?: string;
  command: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: TestResult[];
}

// Token usage summary per model
export interface TokenModelSummary {
  input: number;
  output: number;
}

// Aggregated token usage statistics
export interface TokenSummary {
  total_input: number;
  total_output: number;
  total_cost_usd?: number;
  by_model: Record<string, TokenModelSummary>;
  by_agent: Record<string, TokenModelSummary>;
}

// Aggregated git change statistics
export interface GitSummary {
  total_commits: number;
  total_files_changed: number;
  total_insertions: number;
  total_deletions: number;
  by_agent: Record<string, number>; // commit count per agent
}

// Aggregated test result statistics
export interface TestSummary {
  total_runs: number;
  total_tests: number;
  total_passed: number;
  total_failed: number;
  total_skipped: number;
  by_agent: Record<string, number>; // run count per agent
}

// All telemetry data for a single agent
export interface AgentTelemetry {
  agent_id: string;
  token_usage: TokenUsage[];
  git_changes: GitChange[];
  test_runs: TestRun[];
  token_summary: TokenSummary;
  git_summary: GitSummary;
  test_summary: TestSummary;
}

// =============================================================================
// Cache Statistics Types
// =============================================================================

// Cache performance statistics from Query Service
export interface CacheStats {
  issue_entries: number;
  issue_list_entries: number;
  dependency_entries: number;
  convoy_progress_entries: number;
  hit_count: number;
  miss_count: number;
  last_invalidation: string; // ISO timestamp
  issues_ttl_seconds: number;
  convoy_progress_ttl_seconds: number;
  dependencies_ttl_seconds: number;
}
