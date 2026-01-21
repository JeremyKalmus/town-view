import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { IssueEditorForm } from './IssueEditorForm'
import type { Issue } from '@/types'
import type { IssueFormData } from './validation'

const meta: Meta<typeof IssueEditorForm> = {
  title: 'Features/IssueEditor/IssueEditorForm',
  component: IssueEditorForm,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg p-6 bg-bg-secondary rounded-lg">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof IssueEditorForm>

// Sample issue data
const sampleIssue: Issue = {
  id: 'to-abc123',
  title: 'Fix authentication timeout',
  description: 'Users are experiencing timeout issues when logging in. The session expires too quickly and needs to be extended.',
  status: 'in_progress',
  priority: 1,
  issue_type: 'bug',
  labels: ['bug', 'auth', 'urgent'],
  assignee: 'john.doe',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-20T14:30:00Z',
  dependency_count: 0,
  dependent_count: 2,
}

const sampleAssignees = [
  { value: 'john.doe', label: 'John Doe' },
  { value: 'jane.smith', label: 'Jane Smith' },
  { value: 'bob.wilson', label: 'Bob Wilson' },
]

// Interactive wrapper to show form state
function InteractiveForm({ issue, disabled }: { issue: Issue; disabled?: boolean }) {
  const [formData, setFormData] = useState<IssueFormData | null>(null)
  const [isValid, setIsValid] = useState(true)

  return (
    <div className="space-y-4">
      <IssueEditorForm
        issue={issue}
        availableAssignees={sampleAssignees}
        onChange={(data, valid) => {
          setFormData(data)
          setIsValid(valid)
        }}
        disabled={disabled}
      />
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-text-secondary">Form Valid:</span>
          <span className={isValid ? 'text-status-closed' : 'text-status-blocked'}>
            {isValid ? '✓ Yes' : '✗ No'}
          </span>
        </div>
        {formData && (
          <pre className="text-xs bg-bg-primary p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(formData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <InteractiveForm issue={sampleIssue} />,
}

export const EmptyIssue: Story = {
  render: () => (
    <InteractiveForm
      issue={{
        ...sampleIssue,
        id: 'to-new',
        title: '',
        description: '',
        status: 'open',
        priority: 2,
        labels: [],
        assignee: undefined,
      }}
    />
  ),
}

export const Disabled: Story = {
  render: () => <InteractiveForm issue={sampleIssue} disabled />,
}

export const ValidationErrors: Story = {
  render: () => (
    <InteractiveForm
      issue={{
        ...sampleIssue,
        title: 'Ab', // Too short
      }}
    />
  ),
}

export const Epic: Story = {
  render: () => (
    <InteractiveForm
      issue={{
        ...sampleIssue,
        id: 'to-epic1',
        title: 'User Authentication System',
        description: '## Summary\nImplement complete authentication system.\n\n## Acceptance Criteria\n- Login flow\n- OAuth support\n- Session management',
        issue_type: 'epic',
        status: 'open',
        priority: 0,
        labels: ['epic', 'auth', 'q1-2026'],
      }}
    />
  ),
}

export const Blocked: Story = {
  render: () => (
    <InteractiveForm
      issue={{
        ...sampleIssue,
        status: 'blocked',
        priority: 0,
        labels: ['blocked', 'waiting-on-api'],
      }}
    />
  ),
}
