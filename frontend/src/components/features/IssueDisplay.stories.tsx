import type { Meta, StoryObj } from '@storybook/react'
import { IssueDisplay } from './IssueDisplay'
import type { Issue } from '@/types'

const mockIssue: Issue = {
  id: 'gt-abc123',
  title: 'Fix authentication timeout issue',
  description: 'Users are experiencing session timeouts after 30 minutes of inactivity. This is causing frustration and lost work.\n\nSteps to reproduce:\n1. Log in to the application\n2. Leave the session idle for 30+ minutes\n3. Try to perform any action\n4. Session expires without warning',
  status: 'in_progress',
  priority: 1,
  issue_type: 'bug',
  owner: 'user@example.com',
  assignee: 'dev@example.com',
  created_at: '2026-01-15T10:00:00Z',
  created_by: 'mayor',
  updated_at: '2026-01-20T14:30:00Z',
  labels: ['auth', 'urgent', 'backend'],
  dependency_count: 2,
  dependent_count: 3,
}

const meta: Meta<typeof IssueDisplay> = {
  title: 'Features/IssueDisplay',
  component: IssueDisplay,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-secondary rounded-lg">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof IssueDisplay>

export const Default: Story = {
  args: {
    issue: mockIssue,
  },
}

export const Bug: Story = {
  args: {
    issue: mockIssue,
  },
}

export const Feature: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-feat001',
      title: 'Add dark mode support',
      description: 'Implement a dark mode toggle that persists user preference. Should work across all pages and components.',
      status: 'open',
      priority: 2,
      issue_type: 'feature',
      labels: ['frontend', 'ui', 'accessibility'],
    },
  },
}

export const Epic: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-epic001',
      title: 'User Authentication System Overhaul',
      description: 'Complete redesign of the authentication system including:\n- OAuth integration\n- Session management\n- Password recovery\n- 2FA support',
      status: 'in_progress',
      priority: 1,
      issue_type: 'epic',
      labels: ['epic', 'auth', 'Q1-2026'],
      dependency_count: 0,
      dependent_count: 8,
    },
  },
}

export const Task: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-task001',
      title: 'Update API documentation',
      description: 'Review and update all API endpoint documentation to reflect recent changes.',
      status: 'open',
      priority: 3,
      issue_type: 'task',
      labels: ['docs'],
      dependency_count: 0,
      dependent_count: 0,
    },
  },
}

export const Blocked: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-blocked001',
      title: 'Database migration failing',
      description: 'Migration script fails on production due to schema conflicts.',
      status: 'blocked',
      priority: 0,
      issue_type: 'bug',
      labels: ['database', 'critical', 'blocked'],
      dependency_count: 1,
    },
  },
}

export const Closed: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-closed001',
      title: 'Add logging to API endpoints',
      description: 'Implemented comprehensive logging for all API endpoints.',
      status: 'closed',
      priority: 3,
      issue_type: 'task',
      labels: ['completed'],
      close_reason: 'Completed',
      closed_at: '2026-01-19T16:00:00Z',
    },
  },
}

export const Deferred: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-deferred001',
      title: 'Refactor legacy authentication module',
      description: 'Tech debt item - refactor the old auth system.',
      status: 'deferred',
      priority: 4,
      issue_type: 'chore',
      labels: ['tech-debt'],
    },
  },
}

export const NoDescription: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-nodesc001',
      title: 'Quick fix for typo',
      description: '',
      labels: [],
    },
  },
}

export const Unassigned: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-unassigned001',
      title: 'Available task',
      assignee: undefined,
      labels: ['help-wanted'],
    },
  },
}

export const ManyLabels: Story = {
  args: {
    issue: {
      ...mockIssue,
      id: 'gt-manylabels001',
      title: 'Complex issue with many labels',
      labels: ['frontend', 'backend', 'database', 'api', 'auth', 'security', 'performance', 'urgent'],
    },
  },
}

export const AllPriorities: Story = {
  render: () => (
    <div className="space-y-8">
      {[0, 1, 2, 3, 4].map((priority) => (
        <div key={priority} className="p-4 bg-bg-secondary rounded-lg">
          <IssueDisplay
            issue={{
              ...mockIssue,
              id: `gt-p${priority}`,
              title: `Priority ${priority} issue example`,
              priority,
            }}
          />
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
}

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-8">
      {(['open', 'in_progress', 'blocked', 'closed', 'deferred'] as const).map((status) => (
        <div key={status} className="p-4 bg-bg-secondary rounded-lg">
          <IssueDisplay
            issue={{
              ...mockIssue,
              id: `gt-${status}`,
              title: `Issue with ${status.replace('_', ' ')} status`,
              status,
            }}
          />
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
}
