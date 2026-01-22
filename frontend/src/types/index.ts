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

// Agent state enum
export type AgentState =
  | 'idle'
  | 'working'
  | 'stuck'
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
  updated_at: string;
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

// WebSocket message
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

// Audit metrics for convoy/issue analysis
export interface AuditMetrics {
  timeToComplete: TimeMetrics;
  reassignmentCount: number;
  mergeConflictCount: number;
  // Anomaly thresholds (values above these are considered anomalies)
  anomalyThresholds?: {
    timeToComplete?: number;  // milliseconds
    reassignmentCount?: number;
    mergeConflictCount?: number;
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

// Work item health status based on duration
export type WorkItemHealthStatus = 'healthy' | 'concerning' | 'stuck';

export interface WorkItemHealth {
  status: WorkItemHealthStatus;
  duration_ms: number;
  started_at: string;
}
