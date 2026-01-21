import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { FilterBar, DEFAULT_FILTERS, type TreeFilters } from './FilterBar'

const meta: Meta<typeof FilterBar> = {
  title: 'Features/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-4 bg-bg-primary min-h-[200px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof FilterBar>

// Interactive wrapper component for stateful stories
function FilterBarWithState({ initialFilters = DEFAULT_FILTERS, assignees = [] }: { initialFilters?: TreeFilters; assignees?: string[] }) {
  const [filters, setFilters] = useState<TreeFilters>(initialFilters)

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onFiltersChange={setFilters} assignees={assignees} />
      <div className="card text-sm">
        <div className="text-text-secondary mb-2">Current filters:</div>
        <pre className="mono text-xs text-text-muted bg-bg-tertiary p-2 rounded overflow-auto">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <FilterBarWithState />,
}

export const WithAssignees: Story = {
  render: () => (
    <FilterBarWithState
      assignees={[
        'townview/polecats/dementus',
        'townview/polecats/furiosa',
        'townview/polecats/nux',
        'townview/crew/jeremy',
        'mayor',
      ]}
    />
  ),
}

export const WithActiveFilters: Story = {
  render: () => (
    <FilterBarWithState
      initialFilters={{
        status: 'in_progress',
        type: 'task',
        assignee: 'all',
        priorityMin: 0,
        priorityMax: 2,
      }}
      assignees={['townview/polecats/dementus', 'townview/polecats/furiosa']}
    />
  ),
}

export const StatusFilterOnly: Story = {
  render: () => (
    <FilterBarWithState
      initialFilters={{
        ...DEFAULT_FILTERS,
        status: 'blocked',
      }}
    />
  ),
}

export const PriorityRangeFiltered: Story = {
  render: () => (
    <FilterBarWithState
      initialFilters={{
        ...DEFAULT_FILTERS,
        priorityMin: 1,
        priorityMax: 2,
      }}
    />
  ),
}

export const AllFiltersActive: Story = {
  render: () => (
    <FilterBarWithState
      initialFilters={{
        status: 'open',
        type: 'bug',
        assignee: 'townview/polecats/dementus',
        priorityMin: 0,
        priorityMax: 1,
      }}
      assignees={[
        'townview/polecats/dementus',
        'townview/polecats/furiosa',
        'townview/polecats/nux',
      ]}
    />
  ),
}

export const Static: Story = {
  args: {
    filters: DEFAULT_FILTERS,
    onFiltersChange: () => {},
    assignees: ['user1', 'user2', 'user3'],
  },
}
