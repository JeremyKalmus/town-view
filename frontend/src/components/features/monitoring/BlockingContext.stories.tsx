import type { Meta, StoryObj } from '@storybook/react'
import { BlockingContext } from './BlockingContext'
import type { Issue } from '@/types'

const mockBlockers: Issue[] = [
  {
    id: 'GT-123',
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
    id: 'GT-456',
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
  {
    id: 'GT-789',
    title: 'API endpoint blocked',
    description: 'Waiting for backend team.',
    status: 'blocked',
    priority: 0,
    issue_type: 'task',
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-19T11:00:00Z',
    dependency_count: 1,
    dependent_count: 2,
  },
]

const meta: Meta<typeof BlockingContext> = {
  title: 'Features/Monitoring/BlockingContext',
  component: BlockingContext,
  tags: ['autodocs'],
  argTypes: {
    onBlockerClick: { action: 'blocker clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BlockingContext>

export const Default: Story = {
  args: {
    blockers: mockBlockers,
  },
}

export const CompactMode: Story = {
  args: {
    blockers: mockBlockers,
    compact: true,
  },
}

export const SingleBlocker: Story = {
  args: {
    blockers: [mockBlockers[0]],
  },
}

export const SingleBlockerCompact: Story = {
  args: {
    blockers: [mockBlockers[0]],
    compact: true,
  },
}

export const NoBlockers: Story = {
  args: {
    blockers: [],
  },
}

export const WithClickHandler: Story = {
  args: {
    blockers: mockBlockers,
    onBlockerClick: (issueId: string) => {
      console.log('Navigate to:', issueId)
    },
  },
}

export const CompactWithClickHandler: Story = {
  args: {
    blockers: mockBlockers,
    compact: true,
    onBlockerClick: (issueId: string) => {
      console.log('Navigate to:', issueId)
    },
  },
}
