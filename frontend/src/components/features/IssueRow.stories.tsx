import type { Meta, StoryObj } from '@storybook/react'
import { IssueRow } from './IssueRow'
import type { Issue } from '@/types'

const mockIssue: Issue = {
  id: 'gt-abc123',
  title: 'Fix authentication timeout issue',
  description: 'Users are experiencing session timeouts after 30 minutes.',
  status: 'open',
  priority: 1,
  issue_type: 'bug',
  owner: 'user@example.com',
  created_at: '2026-01-20T10:00:00Z',
  created_by: 'mayor',
  updated_at: '2026-01-20T14:30:00Z',
  labels: ['auth', 'urgent'],
  dependency_count: 0,
  dependent_count: 2,
}

const meta: Meta<typeof IssueRow> = {
  title: 'Features/IssueRow',
  component: IssueRow,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof IssueRow>

export const Open: Story = {
  args: {
    issue: mockIssue,
  },
}

export const InProgress: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-def456',
      status: 'in_progress',
      title: 'Implement user dashboard',
      issue_type: 'feature',
      priority: 2,
      labels: ['frontend', 'dashboard'],
    },
  },
}

export const Blocked: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-ghi789',
      status: 'blocked',
      title: 'Database migration failing',
      issue_type: 'bug',
      priority: 0,
      labels: ['database', 'critical', 'blocked'],
    },
  },
}

export const Closed: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-jkl012',
      status: 'closed',
      title: 'Add logging to API endpoints',
      issue_type: 'task',
      priority: 3,
      close_reason: 'Completed',
      closed_at: '2026-01-19T16:00:00Z',
      labels: [],
    },
  },
}

export const Deferred: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-mno345',
      status: 'deferred',
      title: 'Refactor legacy authentication module',
      issue_type: 'chore',
      priority: 4,
      labels: ['tech-debt'],
    },
  },
}

export const Epic: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-pqr678',
      status: 'open',
      title: 'User Authentication System Overhaul',
      issue_type: 'epic',
      priority: 1,
      labels: ['epic', 'auth', 'Q1-2026'],
      dependency_count: 5,
    },
  },
}

export const MergeRequest: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-stu901',
      status: 'open',
      title: 'Merge: Fix login timeout',
      issue_type: 'merge-request',
      priority: 2,
      labels: [],
    },
  },
}

export const ManyLabels: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-vwx234',
      title: 'Complex issue with many labels',
      labels: ['frontend', 'backend', 'database', 'api', 'auth', 'security'],
    },
  },
}

export const AllPriorities: Story = {
  render: () => (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((priority) => (
        <IssueRow
          key={priority}
          issue={{
            ...mockIssue,
            id: `gt-p${priority}`,
            title: `Priority ${priority} issue example`,
            priority,
          }}
        />
      ))}
    </div>
  ),
}
