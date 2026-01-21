import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ConfirmationModal, calculateDiff } from './ConfirmationModal'
import type { Issue, IssueUpdate } from '@/types'

const mockIssue: Issue = {
  id: 'gt-abc123',
  title: 'Fix authentication timeout issue',
  description: 'Users are experiencing session timeouts after 30 minutes.',
  status: 'open',
  priority: 2,
  issue_type: 'bug',
  owner: 'user@example.com',
  assignee: 'engineer@example.com',
  created_at: '2026-01-20T10:00:00Z',
  created_by: 'mayor',
  updated_at: '2026-01-20T14:30:00Z',
  labels: ['auth', 'backend'],
  dependency_count: 0,
  dependent_count: 2,
}

const meta: Meta<typeof ConfirmationModal> = {
  title: 'UI/ConfirmationModal',
  component: ConfirmationModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
}

export default meta
type Story = StoryObj<typeof ConfirmationModal>

export const StatusChange: Story = {
  args: {
    issue: mockIssue,
    changes: {
      status: 'in_progress',
    },
    isOpen: true,
  },
}

export const PriorityChange: Story = {
  args: {
    issue: mockIssue,
    changes: {
      priority: 1,
    },
    isOpen: true,
  },
}

export const TitleChange: Story = {
  args: {
    issue: mockIssue,
    changes: {
      title: 'Fix authentication timeout for long sessions',
    },
    isOpen: true,
  },
}

export const MultipleChanges: Story = {
  args: {
    issue: mockIssue,
    changes: {
      status: 'in_progress',
      priority: 1,
      title: 'Critical: Fix authentication timeout',
      assignee: 'senior@example.com',
    },
    isOpen: true,
  },
}

export const DescriptionChange: Story = {
  args: {
    issue: mockIssue,
    changes: {
      description: 'Users are experiencing session timeouts after 30 minutes. This is affecting production users during peak hours.',
    },
    isOpen: true,
  },
}

export const LabelsChange: Story = {
  args: {
    issue: mockIssue,
    changes: {
      labels: ['auth', 'backend', 'urgent', 'production'],
    },
    isOpen: true,
  },
}

export const AssigneeRemoved: Story = {
  args: {
    issue: mockIssue,
    changes: {
      assignee: '',
    },
    isOpen: true,
  },
}

export const NoChanges: Story = {
  args: {
    issue: mockIssue,
    changes: {
      status: 'open', // Same as current
      priority: 2,    // Same as current
    },
    isOpen: true,
  },
}

export const AllFieldsChanged: Story = {
  args: {
    issue: mockIssue,
    changes: {
      status: 'blocked',
      priority: 0,
      title: 'CRITICAL: Authentication system completely broken',
      description: 'The entire auth system is down. All users affected.',
      assignee: 'oncall@example.com',
      labels: ['critical', 'p0', 'incident'],
    },
    isOpen: true,
  },
}

export const SavingState: Story = {
  args: {
    issue: mockIssue,
    changes: {
      status: 'in_progress',
      priority: 1,
    },
    isOpen: true,
    isSaving: true,
  },
}

// Interactive story to demonstrate usage
export const Interactive: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const handleConfirm = () => {
      setIsSaving(true)
      setTimeout(() => {
        setIsSaving(false)
        setIsOpen(false)
        // Reset after a moment
        setTimeout(() => setIsOpen(true), 1000)
      }, 1500)
    }

    return (
      <div className="p-8">
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary"
        >
          Open Confirmation Modal
        </button>
        <ConfirmationModal
          issue={mockIssue}
          changes={{
            status: 'in_progress',
            priority: 1,
            title: 'Fix authentication timeout - high priority',
          }}
          isOpen={isOpen}
          onConfirm={handleConfirm}
          onCancel={() => setIsOpen(false)}
          isSaving={isSaving}
        />
      </div>
    )
  },
}

// Story showing just the diff calculation function
export const DiffCalculation: Story = {
  render: () => {
    const changes: IssueUpdate = {
      status: 'in_progress',
      priority: 1,
      assignee: 'new@example.com',
    }
    const diff = calculateDiff(mockIssue, changes)

    return (
      <div className="p-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Diff Calculation Demo</h2>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Original Issue</h3>
          <pre className="text-xs font-mono bg-bg-primary p-2 rounded overflow-auto">
            {JSON.stringify({ status: mockIssue.status, priority: mockIssue.priority, assignee: mockIssue.assignee }, null, 2)}
          </pre>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Changes</h3>
          <pre className="text-xs font-mono bg-bg-primary p-2 rounded overflow-auto">
            {JSON.stringify(changes, null, 2)}
          </pre>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Calculated Diff</h3>
          <pre className="text-xs font-mono bg-bg-primary p-2 rounded overflow-auto">
            {JSON.stringify(diff, null, 2)}
          </pre>
        </div>
      </div>
    )
  },
}
