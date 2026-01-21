import type { Meta, StoryObj } from '@storybook/react'
import { DependenciesTab } from './DependenciesTab'
import type { Issue, IssueDependencies } from '@/types'
import { useEffect } from 'react'

// Mock data
const mockBlockers: Issue[] = [
  {
    id: 'gt-blocker1',
    title: 'Setup CI/CD pipeline',
    description: 'Configure automated testing and deployment.',
    status: 'in_progress',
    priority: 1,
    issue_type: 'task',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-20T14:30:00Z',
    dependency_count: 0,
    dependent_count: 1,
  },
  {
    id: 'gt-blocker2',
    title: 'Database schema design',
    description: 'Design the initial database schema.',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-18T09:00:00Z',
    dependency_count: 0,
    dependent_count: 3,
  },
]

const mockBlockedBy: Issue[] = [
  {
    id: 'gt-blocked1',
    title: 'Implement user authentication',
    description: 'Add login and registration functionality.',
    status: 'blocked',
    priority: 1,
    issue_type: 'feature',
    created_at: '2026-01-18T10:00:00Z',
    updated_at: '2026-01-20T12:00:00Z',
    dependency_count: 2,
    dependent_count: 0,
  },
]

const mockDependencies: IssueDependencies = {
  blockers: mockBlockers,
  blocked_by: mockBlockedBy,
}

const emptyDependencies: IssueDependencies = {
  blockers: [],
  blocked_by: [],
}

const allIssues: Issue[] = [
  ...mockBlockers,
  ...mockBlockedBy,
  {
    id: 'gt-other1',
    title: 'Add dark mode support',
    description: 'Implement dark mode theme.',
    status: 'open',
    priority: 3,
    issue_type: 'feature',
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-19T15:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'gt-other2',
    title: 'Write unit tests',
    description: 'Add comprehensive test coverage.',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '2026-01-14T10:00:00Z',
    updated_at: '2026-01-20T08:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
]

// Decorator that mocks fetch for dependencies
function MockFetchDecorator({
  children,
  dependencies,
}: {
  children: React.ReactNode
  dependencies: IssueDependencies
}) {
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      // Mock get dependencies
      if (url.includes('/dependencies') && (!init || init.method === 'GET' || !init.method)) {
        return new Response(JSON.stringify(dependencies), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Mock get all issues (for add modal)
      if (url.includes('/issues?all=true')) {
        return new Response(JSON.stringify(allIssues), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Mock add dependency
      if (url.includes('/dependencies') && init?.method === 'POST') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Mock remove dependency
      if (url.includes('/dependencies/') && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [dependencies])

  return <>{children}</>
}

const meta: Meta<typeof DependenciesTab> = {
  title: 'Features/DependenciesTab',
  component: DependenciesTab,
  tags: ['autodocs'],
  argTypes: {
    onIssueClick: { action: 'issue clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DependenciesTab>

export const WithDependencies: Story = {
  args: {
    rigId: 'test-rig',
    issueId: 'gt-abc123',
  },
  decorators: [
    (Story) => (
      <MockFetchDecorator dependencies={mockDependencies}>
        <Story />
      </MockFetchDecorator>
    ),
  ],
}

export const NoDependencies: Story = {
  args: {
    rigId: 'test-rig',
    issueId: 'gt-xyz789',
  },
  decorators: [
    (Story) => (
      <MockFetchDecorator dependencies={emptyDependencies}>
        <Story />
      </MockFetchDecorator>
    ),
  ],
}

export const OnlyBlockers: Story = {
  args: {
    rigId: 'test-rig',
    issueId: 'gt-only-blockers',
  },
  decorators: [
    (Story) => (
      <MockFetchDecorator dependencies={{ blockers: mockBlockers, blocked_by: [] }}>
        <Story />
      </MockFetchDecorator>
    ),
  ],
}

export const OnlyBlocking: Story = {
  args: {
    rigId: 'test-rig',
    issueId: 'gt-only-blocking',
  },
  decorators: [
    (Story) => (
      <MockFetchDecorator dependencies={{ blockers: [], blocked_by: mockBlockedBy }}>
        <Story />
      </MockFetchDecorator>
    ),
  ],
}
