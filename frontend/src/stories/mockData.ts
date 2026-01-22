/**
 * Mock data for Storybook stories
 */
import type { Issue, Agent, Comment, HistoryEntry, AuditMetrics, IssueDependencies } from '@/types'

// Sample issues for various scenarios
export const mockIssues: Issue[] = [
  {
    id: 'to-abc123',
    title: 'Implement user authentication flow',
    description: `This is a detailed description of the authentication task.

## Requirements
- OAuth2 integration
- JWT token handling
- Session management

## Technical Notes
The auth system should integrate with the existing user service.`,
    status: 'in_progress',
    priority: 1,
    issue_type: 'feature',
    owner: 'townview/crew/jeremy',
    assignee: 'townview/polecats/furiosa',
    created_at: '2026-01-15T10:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-20T14:30:00Z',
    labels: ['auth', 'security', 'api'],
    dependency_count: 2,
    dependent_count: 3,
  },
  {
    id: 'to-abc123.1',
    title: 'Design login page UI',
    description: 'Create the login page with email/password fields and social auth buttons.',
    status: 'closed',
    priority: 2,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    assignee: 'townview/polecats/toast',
    created_at: '2026-01-16T08:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-19T16:00:00Z',
    closed_at: '2026-01-19T16:00:00Z',
    close_reason: 'Completed - all acceptance criteria met',
    labels: ['ui', 'auth'],
    dependency_count: 0,
    dependent_count: 1,
  },
  {
    id: 'to-abc123.2',
    title: 'Implement JWT token service',
    description: 'Create service for generating and validating JWT tokens.',
    status: 'in_progress',
    priority: 1,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    assignee: 'townview/polecats/furiosa',
    created_at: '2026-01-16T09:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-20T10:00:00Z',
    labels: ['api', 'security'],
    dependency_count: 1,
    dependent_count: 0,
  },
  {
    id: 'to-abc123.2.1',
    title: 'Add token refresh endpoint',
    description: 'Implement the /auth/refresh endpoint for token renewal.',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-18T11:00:00Z',
    created_by: 'townview/polecats/furiosa',
    updated_at: '2026-01-18T11:00:00Z',
    labels: ['api'],
    dependency_count: 1,
    dependent_count: 0,
  },
  {
    id: 'to-def456',
    title: 'Fix database connection pooling issue',
    description: `Connection pool exhaustion under high load.

## Symptoms
- Timeouts after ~50 concurrent requests
- Memory usage spikes

## Root Cause
Pool size too small, connections not being released properly.`,
    status: 'blocked',
    priority: 0,
    issue_type: 'bug',
    owner: 'townview/crew/jeremy',
    assignee: 'townview/crew/jeremy',
    created_at: '2026-01-19T09:00:00Z',
    created_by: 'townview/witness',
    updated_at: '2026-01-20T08:00:00Z',
    labels: ['bug', 'database', 'P0'],
    dependency_count: 0,
    dependent_count: 5,
  },
  {
    id: 'to-ghi789',
    title: 'Add dark mode support',
    description: 'Implement theme switching with user preference persistence.',
    status: 'deferred',
    priority: 4,
    issue_type: 'feature',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-10T14:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-15T10:00:00Z',
    labels: ['ui', 'enhancement'],
    dependency_count: 0,
    dependent_count: 0,
  },
]

// Epic with children for tree view
export const mockEpicTree: Issue[] = [
  {
    id: 'to-epic1',
    title: 'Q1 Infrastructure Overhaul',
    description: 'Major infrastructure improvements for Q1 2026.',
    status: 'in_progress',
    priority: 1,
    issue_type: 'epic',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-20T12:00:00Z',
    labels: ['epic', 'infrastructure'],
    dependency_count: 0,
    dependent_count: 3,
  },
  {
    id: 'to-epic1.1',
    title: 'Database Migration',
    description: 'Migrate from MySQL to PostgreSQL.',
    status: 'in_progress',
    priority: 1,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-02T00:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-18T12:00:00Z',
    labels: ['database', 'migration'],
    dependency_count: 0,
    dependent_count: 2,
  },
  {
    id: 'to-epic1.1.1',
    title: 'Schema conversion',
    description: 'Convert MySQL schema to PostgreSQL.',
    status: 'closed',
    priority: 2,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-03T00:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-10T12:00:00Z',
    closed_at: '2026-01-10T12:00:00Z',
    close_reason: 'Completed',
    labels: ['database'],
    dependency_count: 0,
    dependent_count: 1,
  },
  {
    id: 'to-epic1.1.2',
    title: 'Data migration scripts',
    description: 'Write scripts to migrate data.',
    status: 'in_progress',
    priority: 2,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-05T00:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-19T12:00:00Z',
    labels: ['database', 'scripts'],
    dependency_count: 1,
    dependent_count: 0,
  },
  {
    id: 'to-epic1.2',
    title: 'API Gateway Setup',
    description: 'Set up Kong API gateway.',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-04T00:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-04T12:00:00Z',
    labels: ['api', 'infrastructure'],
    dependency_count: 1,
    dependent_count: 0,
  },
]

// Mock agents
export const mockAgents: Agent[] = [
  {
    id: 'to-townview-crew-jeremy',
    name: 'jeremy',
    role_type: 'crew',
    rig: 'townview',
    state: 'working',
    hook_bead: 'to-abc123',
    updated_at: '2026-01-21T08:00:00Z',
  },
  {
    id: 'to-townview-witness',
    name: 'witness',
    role_type: 'witness',
    rig: 'townview',
    state: 'idle',
    updated_at: '2026-01-21T07:30:00Z',
  },
  {
    id: 'to-townview-refinery',
    name: 'refinery',
    role_type: 'refinery',
    rig: 'townview',
    state: 'idle',
    updated_at: '2026-01-21T07:00:00Z',
  },
  {
    id: 'to-townview-polecat-furiosa',
    name: 'furiosa',
    role_type: 'polecat',
    rig: 'townview',
    state: 'working',
    hook_bead: 'to-abc123.2',
    updated_at: '2026-01-21T08:15:00Z',
  },
  {
    id: 'to-townview-polecat-toast',
    name: 'toast',
    role_type: 'polecat',
    rig: 'townview',
    state: 'stuck',
    hook_bead: 'to-def456',
    updated_at: '2026-01-21T06:00:00Z',
  },
]

// Mock comments
export const mockComments: Comment[] = [
  {
    id: 1,
    issue_id: 'to-abc123',
    author: 'townview/crew/jeremy',
    text: 'Started working on this. Will need to coordinate with the API team.',
    created_at: '2026-01-15T10:30:00Z',
  },
  {
    id: 2,
    issue_id: 'to-abc123',
    author: 'townview/polecats/furiosa',
    text: 'I can take the JWT implementation. Should we use RS256 or HS256 for signing?',
    created_at: '2026-01-16T14:00:00Z',
  },
  {
    id: 3,
    issue_id: 'to-abc123',
    author: 'townview/crew/jeremy',
    text: 'Let\'s go with RS256 for better security. I\'ll set up the key management.',
    created_at: '2026-01-16T15:30:00Z',
  },
]

// Mock history entries
export const mockHistory: HistoryEntry[] = [
  {
    id: 'h1',
    timestamp: '2026-01-20T14:30:00Z',
    actor: 'townview/polecats/furiosa',
    field: 'status',
    old_value: 'open',
    new_value: 'in_progress',
  },
  {
    id: 'h2',
    timestamp: '2026-01-19T10:00:00Z',
    actor: 'townview/crew/jeremy',
    field: 'assignee',
    old_value: null,
    new_value: 'townview/polecats/furiosa',
  },
  {
    id: 'h3',
    timestamp: '2026-01-18T16:00:00Z',
    actor: 'townview/crew/jeremy',
    field: 'priority',
    old_value: '2',
    new_value: '1',
  },
  {
    id: 'h4',
    timestamp: '2026-01-17T09:00:00Z',
    actor: 'townview/crew/jeremy',
    field: 'labels',
    old_value: 'auth',
    new_value: 'auth, security, api',
  },
  {
    id: 'h5',
    timestamp: '2026-01-15T10:00:00Z',
    actor: 'townview/crew/jeremy',
    field: 'status',
    old_value: null,
    new_value: 'open',
  },
]

// Mock dependencies
export const mockDependencies: IssueDependencies = {
  blockers: [
    mockIssues[4], // blocked by the database issue
    mockIssues[1], // and by login page design
  ],
  blocked_by: [
    mockIssues[2], // blocks JWT token service
  ],
}

// Mock convoy issues
export const mockConvoys: Issue[] = [
  {
    id: 'to-cv-001',
    title: 'Auth System Implementation Convoy',
    description: 'Convoy for implementing the authentication system.',
    status: 'in_progress',
    priority: 1,
    issue_type: 'convoy',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-15T10:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-20T14:00:00Z',
    labels: ['convoy'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'to-cv-002',
    title: 'Bug Fix Sprint Convoy',
    description: 'Convoy for critical bug fixes.',
    status: 'closed',
    priority: 0,
    issue_type: 'convoy',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-10T08:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-14T18:00:00Z',
    closed_at: '2026-01-14T18:00:00Z',
    close_reason: 'All bugs fixed',
    labels: ['convoy', 'bugfix'],
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'to-cv-003',
    title: 'UI Refresh Convoy',
    description: 'Convoy for UI improvements.',
    status: 'closed',
    priority: 2,
    issue_type: 'convoy',
    owner: 'townview/crew/jeremy',
    created_at: '2026-01-05T12:00:00Z',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-12T16:00:00Z',
    closed_at: '2026-01-12T16:00:00Z',
    close_reason: 'UI refresh complete',
    labels: ['convoy', 'ui'],
    dependency_count: 0,
    dependent_count: 0,
  },
]

// Mock audit metrics
export const mockMetrics: AuditMetrics = {
  timeToComplete: {
    avg: 3 * 24 * 60 * 60 * 1000, // 3 days in ms
    min: 2 * 60 * 60 * 1000, // 2 hours
    max: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  reassignmentCount: 2,
  mergeConflictCount: 1,
  anomalyThresholds: {
    timeToComplete: 5 * 24 * 60 * 60 * 1000, // 5 days
    reassignmentCount: 3,
    mergeConflictCount: 2,
  },
}

// Mock metrics with anomalies
export const mockMetricsWithAnomalies: AuditMetrics = {
  timeToComplete: {
    avg: 10 * 24 * 60 * 60 * 1000, // 10 days - exceeds threshold
    min: 1 * 24 * 60 * 60 * 1000,
    max: 21 * 24 * 60 * 60 * 1000,
  },
  reassignmentCount: 5, // exceeds threshold
  mergeConflictCount: 4, // exceeds threshold
  anomalyThresholds: {
    timeToComplete: 5 * 24 * 60 * 60 * 1000,
    reassignmentCount: 3,
    mergeConflictCount: 2,
  },
}

// Original vs final issue states for comparison
export const mockOriginalIssue: Issue = {
  id: 'to-abc123',
  title: 'Implement user authentication',
  description: 'Basic auth implementation needed.',
  status: 'open',
  priority: 2,
  issue_type: 'feature',
  owner: 'townview/crew/jeremy',
  created_at: '2026-01-15T10:00:00Z',
  created_by: 'townview/crew/jeremy',
  updated_at: '2026-01-15T10:00:00Z',
  labels: ['auth'],
  dependency_count: 0,
  dependent_count: 0,
}

export const mockFinalIssue: Issue = {
  id: 'to-abc123',
  title: 'Implement user authentication flow',
  description: `Completed authentication implementation.

## What was done
- OAuth2 integration with Google and GitHub
- JWT token handling with RS256
- Session management with Redis

## Testing
All tests passing. Manual QA completed.`,
  status: 'closed',
  priority: 1,
  issue_type: 'feature',
  owner: 'townview/crew/jeremy',
  assignee: 'townview/polecats/furiosa',
  created_at: '2026-01-15T10:00:00Z',
  created_by: 'townview/crew/jeremy',
  updated_at: '2026-01-20T14:30:00Z',
  closed_at: '2026-01-20T14:30:00Z',
  close_reason: 'All acceptance criteria met. Auth system deployed to production.',
  labels: ['auth', 'security', 'api', 'completed'],
  dependency_count: 2,
  dependent_count: 3,
}
