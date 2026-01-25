/**
 * Utility functions and type catalogs for bead types and agent roles.
 * Used by Storybook documentation and component reference.
 */

import type { IssueType } from '@/types'

// ============================================================================
// Issue Type Catalog
// ============================================================================

export interface IssueTypeInfo {
  type: IssueType
  label: string
  icon: string
  colorClass: string
  description: string
  category: 'work' | 'coordination' | 'infrastructure' | 'event'
}

export const ISSUE_TYPE_CATALOG: IssueTypeInfo[] = [
  // Work types
  { type: 'epic', label: 'Epic', icon: '🎯', colorClass: 'text-accent-primary', description: 'Large initiative containing multiple tasks', category: 'work' },
  { type: 'task', label: 'Task', icon: '📋', colorClass: 'text-status-in-progress', description: 'Unit of work to be completed', category: 'work' },
  { type: 'bug', label: 'Bug', icon: '🐛', colorClass: 'text-status-blocked', description: 'Something that needs fixing', category: 'work' },
  { type: 'feature', label: 'Feature', icon: '✨', colorClass: 'text-status-closed', description: 'New capability or enhancement', category: 'work' },
  { type: 'chore', label: 'Chore', icon: '🧹', colorClass: 'text-text-muted', description: 'Maintenance or housekeeping task', category: 'work' },

  // Coordination types
  { type: 'convoy', label: 'Convoy', icon: '🚚', colorClass: 'text-accent-secondary', description: 'Coordinated group of related tasks', category: 'coordination' },
  { type: 'molecule', label: 'Molecule', icon: '🧬', colorClass: 'text-accent-primary', description: 'Workflow connecting beads', category: 'coordination' },
  { type: 'merge-request', label: 'Merge Request', icon: '🔀', colorClass: 'text-status-in-progress', description: 'Code ready to merge', category: 'coordination' },

  // Infrastructure types
  { type: 'agent', label: 'Agent', icon: '🤖', colorClass: 'text-accent-rust', description: 'Worker entity in the system', category: 'infrastructure' },
  { type: 'mail', label: 'Mail', icon: '📬', colorClass: 'text-text-secondary', description: 'Inter-agent communication', category: 'infrastructure' },

  // Event types
  { type: 'event', label: 'Event', icon: '📅', colorClass: 'text-text-muted', description: 'Lifecycle or system event', category: 'event' },
]

export interface IssueTypeCategory {
  id: 'work' | 'coordination' | 'infrastructure' | 'event'
  label: string
  description: string
}

export const ISSUE_TYPE_CATEGORIES: IssueTypeCategory[] = [
  { id: 'work', label: 'Work', description: 'Tasks, bugs, features, and chores - the actual work being done' },
  { id: 'coordination', label: 'Coordination', description: 'Convoys, molecules, and merge requests - how work is organized' },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Agents and mail - system components' },
  { id: 'event', label: 'Events', description: 'Lifecycle events and system notifications' },
]

/**
 * Get all issue types for a specific category.
 */
export function getIssueTypesByCategory(category: IssueTypeInfo['category']): IssueTypeInfo[] {
  return ISSUE_TYPE_CATALOG.filter(info => info.category === category)
}

/**
 * Get info for a specific issue type.
 */
export function getIssueTypeInfo(type: IssueType): IssueTypeInfo {
  return ISSUE_TYPE_CATALOG.find(info => info.type === type) ?? {
    type,
    label: type,
    icon: '❓',
    colorClass: 'text-text-muted',
    description: 'Unknown type',
    category: 'work',
  }
}

// ============================================================================
// Agent Role Catalog
// ============================================================================

export interface AgentRoleInfo {
  role: string
  label: string
  icon: string
  description: string
  level: 'town' | 'rig'
  worksWith: IssueType[]
  produces: IssueType[]
  monitors: IssueType[]
}

export const AGENT_ROLE_CATALOG: AgentRoleInfo[] = [
  // Town-level roles
  {
    role: 'mayor',
    label: 'Mayor',
    icon: '🎩',
    description: 'Town coordinator - dispatches convoys and coordinates across rigs',
    level: 'town',
    worksWith: ['convoy', 'epic'],
    produces: ['convoy', 'mail'],
    monitors: ['convoy', 'epic'],
  },
  {
    role: 'deacon',
    label: 'Deacon',
    icon: '⛪',
    description: 'Infrastructure overseer - manages agent lifecycles and system health',
    level: 'town',
    worksWith: [],
    produces: ['event', 'mail'],
    monitors: ['agent'],
  },

  // Rig-level roles
  {
    role: 'witness',
    label: 'Witness',
    icon: '👁',
    description: 'Polecat monitor - watches worker health and intervenes when stuck',
    level: 'rig',
    worksWith: [],
    produces: ['event', 'mail'],
    monitors: ['agent', 'task', 'bug'],
  },
  {
    role: 'refinery',
    label: 'Refinery',
    icon: '🔧',
    description: 'Merge queue processor - reviews and merges code changes',
    level: 'rig',
    worksWith: ['merge-request'],
    produces: ['event'],
    monitors: ['merge-request'],
  },
  {
    role: 'crew',
    label: 'Crew',
    icon: '👤',
    description: 'Human-managed worker - persistent workspace for the overseer',
    level: 'rig',
    worksWith: ['task', 'bug', 'feature', 'chore', 'epic'],
    produces: ['task', 'bug', 'merge-request', 'mail'],
    monitors: [],
  },
  {
    role: 'polecat',
    label: 'Polecat',
    icon: '🐱',
    description: 'Transient worker - spawned for specific tasks, garbage collected when idle',
    level: 'rig',
    worksWith: ['task', 'bug', 'feature', 'chore'],
    produces: ['merge-request'],
    monitors: [],
  },
]

/**
 * Get info for a specific agent role.
 */
export function getAgentRoleInfo(role: string): AgentRoleInfo | undefined {
  return AGENT_ROLE_CATALOG.find(info => info.role === role)
}
