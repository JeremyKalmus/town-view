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
  | 'agent';

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
  type: 'issue_changed' | 'issue_created' | 'issue_update' | 'beads_changed' | 'rig_discovered' | 'rig_update' | 'agent_state_changed';
  rig?: string;
  payload?: Record<string, unknown>;
}

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
