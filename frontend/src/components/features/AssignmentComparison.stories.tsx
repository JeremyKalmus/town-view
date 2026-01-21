import type { Meta, StoryObj } from '@storybook/react'
import { AssignmentComparison } from './AssignmentComparison'
import type { Issue } from '@/types'

const baseIssue: Issue = {
  id: 'gt-abc123',
  title: 'Fix authentication timeout issue',
  description: 'Users are experiencing session timeouts after 30 minutes of inactivity.',
  status: 'open',
  priority: 2,
  issue_type: 'bug',
  owner: 'townview/crew/jeremy',
  assignee: 'townview/polecats/dag',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  labels: ['auth', 'backend'],
  dependency_count: 0,
  dependent_count: 1,
}

const meta: Meta<typeof AssignmentComparison> = {
  title: 'Features/AssignmentComparison',
  component: AssignmentComparison,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl bg-bg-secondary p-6 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AssignmentComparison>

/**
 * Default comparison showing typical changes from assignment to completion.
 * Status changes from open to closed, with added labels and close reason.
 */
export const Default: Story = {
  args: {
    original: baseIssue,
    final: {
      ...baseIssue,
      status: 'closed',
      priority: 1,
      description:
        'Users are experiencing session timeouts after 30 minutes of inactivity. Root cause: Redis session TTL was set incorrectly.',
      labels: ['auth', 'backend', 'resolved'],
      closed_at: '2026-01-18T14:30:00Z',
      close_reason: 'Fixed by adjusting Redis TTL configuration in session middleware.',
      updated_at: '2026-01-18T14:30:00Z',
    },
  },
}

/**
 * Comparison with no changes - original and final states are identical.
 * This might happen if an issue was assigned but no work was needed.
 */
export const NoChanges: Story = {
  args: {
    original: baseIssue,
    final: {
      ...baseIssue,
      status: 'closed',
      closed_at: '2026-01-16T09:00:00Z',
      close_reason: 'Duplicate of gt-xyz789',
      updated_at: '2026-01-16T09:00:00Z',
    },
  },
}

/**
 * Comparison showing significant changes across multiple fields.
 * Title, description, priority, labels, and assignee all changed.
 */
export const MajorChanges: Story = {
  args: {
    original: {
      ...baseIssue,
      title: 'Investigate login issues',
      description: 'Some users report problems logging in.',
      priority: 3,
      labels: ['investigation'],
      assignee: 'townview/polecats/max',
    },
    final: {
      ...baseIssue,
      title: 'Fix OAuth token refresh failure',
      description:
        'OAuth tokens were not being refreshed correctly due to a race condition in the token refresh middleware. The issue affected approximately 5% of users during peak hours.',
      status: 'closed',
      priority: 0,
      labels: ['auth', 'oauth', 'critical', 'resolved'],
      assignee: 'townview/polecats/furiosa',
      closed_at: '2026-01-17T16:45:00Z',
      close_reason: 'Implemented mutex lock on token refresh operation.',
      updated_at: '2026-01-17T16:45:00Z',
    },
  },
}

/**
 * Comparison where labels were removed during work.
 */
export const LabelsRemoved: Story = {
  args: {
    original: {
      ...baseIssue,
      labels: ['auth', 'backend', 'urgent', 'needs-review'],
    },
    final: {
      ...baseIssue,
      status: 'closed',
      labels: ['auth', 'backend'],
      closed_at: '2026-01-16T11:00:00Z',
      close_reason: 'Resolved - urgency was overstated.',
      updated_at: '2026-01-16T11:00:00Z',
    },
  },
}

/**
 * Comparison showing a deferred issue that was later closed.
 */
export const DeferredToClosed: Story = {
  args: {
    original: {
      ...baseIssue,
      status: 'deferred',
      description: 'Low priority enhancement - will revisit next quarter.',
      labels: ['enhancement', 'deferred'],
    },
    final: {
      ...baseIssue,
      status: 'closed',
      description: 'Low priority enhancement - implemented ahead of schedule.',
      labels: ['enhancement', 'resolved'],
      closed_at: '2026-01-19T10:00:00Z',
      close_reason: 'Completed during sprint buffer time.',
      updated_at: '2026-01-19T10:00:00Z',
    },
  },
}

/**
 * Comparison for an issue that was blocked and then resolved.
 */
export const BlockedToResolved: Story = {
  args: {
    original: {
      ...baseIssue,
      status: 'blocked',
      description: 'Waiting on API team to expose new endpoint.',
      labels: ['blocked', 'api-dependency'],
      assignee: undefined,
    },
    final: {
      ...baseIssue,
      status: 'closed',
      description:
        'Waiting on API team to expose new endpoint.\n\nUpdate: API endpoint delivered on 01/17. Integration complete.',
      labels: ['api-integration', 'resolved'],
      assignee: 'townview/polecats/capable',
      closed_at: '2026-01-18T17:00:00Z',
      close_reason: 'API integration successful after endpoint delivery.',
      updated_at: '2026-01-18T17:00:00Z',
    },
  },
}

/**
 * Comparison with empty labels on both sides.
 */
export const NoLabels: Story = {
  args: {
    original: {
      ...baseIssue,
      labels: [],
    },
    final: {
      ...baseIssue,
      status: 'closed',
      labels: [],
      closed_at: '2026-01-16T12:00:00Z',
      close_reason: 'Quick fix applied.',
      updated_at: '2026-01-16T12:00:00Z',
    },
  },
}

/**
 * Comparison with very long description text to test layout.
 */
export const LongDescription: Story = {
  args: {
    original: {
      ...baseIssue,
      description: 'Initial report of an issue.',
    },
    final: {
      ...baseIssue,
      status: 'closed',
      description: `Initial report of an issue.

Investigation findings:
1. The root cause was identified in the session management layer
2. Token validation was failing silently due to misconfigured error handling
3. The issue only manifested under high load conditions (>1000 concurrent users)
4. A workaround was implemented temporarily while the permanent fix was developed

Resolution:
- Refactored token validation to properly propagate errors
- Added circuit breaker pattern for external auth service calls
- Implemented retry logic with exponential backoff
- Added comprehensive logging for auth-related operations
- Updated monitoring dashboards to track token validation metrics

Testing:
- Load tested with 5000 concurrent users
- No auth failures observed over 48-hour test period
- Memory usage stable, no leaks detected`,
      closed_at: '2026-01-20T09:30:00Z',
      close_reason: 'Comprehensive fix implemented and verified under load.',
      updated_at: '2026-01-20T09:30:00Z',
    },
  },
}
