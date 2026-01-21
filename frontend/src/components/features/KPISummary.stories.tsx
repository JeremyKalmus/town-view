import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import type { Issue } from '@/types'
import { KPISummary, KPIFilter } from './KPISummary'

const meta: Meta<typeof KPISummary> = {
  title: 'Features/KPISummary',
  component: KPISummary,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof KPISummary>

// Sample issues for stories
const sampleIssues: Issue[] = [
  {
    id: 'tv-001',
    title: 'Add user authentication',
    description: 'Implement OAuth2 login',
    status: 'in_progress',
    priority: 1,
    issue_type: 'feature',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-20T15:30:00Z',
    dependency_count: 2,
    dependent_count: 0,
  },
  {
    id: 'tv-002',
    title: 'Fix login redirect bug',
    description: 'Users not redirected after login',
    status: 'blocked',
    priority: 0,
    issue_type: 'bug',
    created_at: '2026-01-16T09:00:00Z',
    updated_at: '2026-01-19T14:00:00Z',
    dependency_count: 1,
    dependent_count: 1,
  },
  {
    id: 'tv-003',
    title: 'Create dashboard layout',
    description: 'Main dashboard wireframe',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '2026-01-17T11:00:00Z',
    updated_at: '2026-01-18T16:00:00Z',
    dependency_count: 0,
    dependent_count: 3,
  },
  {
    id: 'tv-004',
    title: 'API endpoint refactoring',
    description: 'Restructure REST endpoints',
    status: 'closed',
    priority: 2,
    issue_type: 'chore',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'tv-005',
    title: 'Performance optimization',
    description: 'Reduce load time',
    status: 'deferred',
    priority: 3,
    issue_type: 'task',
    created_at: '2026-01-12T13:00:00Z',
    updated_at: '2026-01-14T10:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'tv-006',
    title: 'User management epic',
    description: 'All user-related features',
    status: 'in_progress',
    priority: 1,
    issue_type: 'epic',
    created_at: '2026-01-05T09:00:00Z',
    updated_at: '2026-01-21T11:00:00Z',
    dependency_count: 0,
    dependent_count: 5,
  },
  {
    id: 'tv-007',
    title: 'Add search feature',
    description: 'Full-text search',
    status: 'open',
    priority: 2,
    issue_type: 'feature',
    created_at: '2026-01-18T14:00:00Z',
    updated_at: '2026-01-19T09:00:00Z',
    dependency_count: 1,
    dependent_count: 0,
  },
  {
    id: 'tv-008',
    title: 'Memory leak in websocket',
    description: 'Connection not cleaned up',
    status: 'blocked',
    priority: 0,
    issue_type: 'bug',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-21T08:00:00Z',
    dependency_count: 0,
    dependent_count: 2,
  },
]

export const Default: Story = {
  args: {
    issues: sampleIssues,
  },
}

export const WithActiveFilter: Story = {
  args: {
    issues: sampleIssues,
    activeFilter: { status: 'blocked' },
  },
}

export const TypeFilterActive: Story = {
  args: {
    issues: sampleIssues,
    activeFilter: { type: 'bug' },
  },
}

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [filter, setFilter] = useState<KPIFilter | null>(null)

    return (
      <div className="space-y-4">
        <KPISummary
          issues={sampleIssues}
          activeFilter={filter ?? undefined}
          onFilterChange={setFilter}
        />
        <div className="text-sm text-text-secondary">
          Active filter: {filter ? JSON.stringify(filter) : 'none'}
        </div>
      </div>
    )
  },
}

export const EmptyIssues: Story = {
  args: {
    issues: [],
  },
}

export const SingleStatus: Story = {
  args: {
    issues: sampleIssues.filter(i => i.status === 'open'),
  },
}

export const ManyTypes: Story = {
  args: {
    issues: [
      ...sampleIssues,
      {
        id: 'tv-009',
        title: 'Release convoy',
        description: 'v2.0 release',
        status: 'open',
        priority: 1,
        issue_type: 'convoy',
        created_at: '2026-01-19T10:00:00Z',
        updated_at: '2026-01-21T10:00:00Z',
        dependency_count: 5,
        dependent_count: 0,
      },
      {
        id: 'tv-010',
        title: 'Auth molecule',
        description: 'Authentication work unit',
        status: 'in_progress',
        priority: 2,
        issue_type: 'molecule',
        created_at: '2026-01-18T10:00:00Z',
        updated_at: '2026-01-20T10:00:00Z',
        dependency_count: 2,
        dependent_count: 1,
      },
    ],
  },
}
