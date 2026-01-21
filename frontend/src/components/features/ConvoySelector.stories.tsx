import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ConvoySelector, type ConvoySortBy } from './ConvoySelector'
import type { Issue } from '@/types'

// Mock convoy data
const mockConvoys: Issue[] = [
  {
    id: 'convoy-001',
    title: 'Sprint 2026-01-15 Deployment',
    description: 'Production deployment for sprint ending Jan 15.',
    status: 'closed',
    priority: 1,
    issue_type: 'convoy',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T18:30:00Z',
    closed_at: '2026-01-15T18:30:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'convoy-002',
    title: 'Hotfix Authentication Bug',
    description: 'Emergency fix for authentication timeout issue.',
    status: 'closed',
    priority: 0,
    issue_type: 'convoy',
    created_at: '2026-01-18T14:00:00Z',
    updated_at: '2026-01-18T16:45:00Z',
    closed_at: '2026-01-18T16:45:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'convoy-003',
    title: 'Sprint 2026-01-20 Deployment',
    description: 'Current sprint deployment in progress.',
    status: 'in_progress',
    priority: 2,
    issue_type: 'convoy',
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-01-20T12:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'convoy-004',
    title: 'API Refactor Release',
    description: 'Major API refactoring release.',
    status: 'open',
    priority: 2,
    issue_type: 'convoy',
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-19T15:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
  {
    id: 'convoy-005',
    title: 'Database Migration v2',
    description: 'Schema migration for v2 features.',
    status: 'closed',
    priority: 1,
    issue_type: 'convoy',
    created_at: '2026-01-08T08:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
    closed_at: '2026-01-10T12:00:00Z',
    dependency_count: 0,
    dependent_count: 0,
  },
]

// Interactive wrapper for controlled state
function ConvoySelectorWithState({
  convoys,
  loading,
  initialSelected,
}: {
  convoys: Issue[]
  loading?: boolean
  initialSelected?: string
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelected)
  const [sortBy, setSortBy] = useState<ConvoySortBy>('date')

  return (
    <div className="space-y-4">
      <ConvoySelector
        convoys={convoys}
        selectedConvoyId={selectedId}
        onSelect={(convoy) => setSelectedId(convoy?.id)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        loading={loading}
      />
      {selectedId && (
        <div className="p-3 bg-bg-tertiary rounded-md text-sm">
          <span className="text-text-muted">Selected convoy: </span>
          <span className="text-text-primary font-mono">{selectedId}</span>
        </div>
      )}
    </div>
  )
}

const meta: Meta<typeof ConvoySelector> = {
  title: 'Features/ConvoySelector',
  component: ConvoySelector,
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'convoy selected' },
    onSortChange: { action: 'sort changed' },
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ConvoySelector>

export const Default: Story = {
  render: () => <ConvoySelectorWithState convoys={mockConvoys} />,
}

export const WithSelection: Story = {
  render: () => (
    <ConvoySelectorWithState convoys={mockConvoys} initialSelected="convoy-002" />
  ),
}

export const Loading: Story = {
  args: {
    convoys: [],
    selectedConvoyId: undefined,
    onSelect: () => {},
    loading: true,
  },
}

export const Empty: Story = {
  args: {
    convoys: [],
    selectedConvoyId: undefined,
    onSelect: () => {},
    loading: false,
  },
}

export const SingleConvoy: Story = {
  render: () => <ConvoySelectorWithState convoys={[mockConvoys[0]]} />,
}

export const AllCompleted: Story = {
  render: () => (
    <ConvoySelectorWithState
      convoys={mockConvoys.filter((c) => c.status === 'closed')}
    />
  ),
}

export const AllActive: Story = {
  render: () => (
    <ConvoySelectorWithState
      convoys={mockConvoys.filter((c) => c.status !== 'closed')}
    />
  ),
}

export const WithoutSortToggle: Story = {
  args: {
    convoys: mockConvoys,
    selectedConvoyId: undefined,
    onSelect: () => {},
    sortBy: 'date',
    // No onSortChange means no sort toggle shown
  },
}
