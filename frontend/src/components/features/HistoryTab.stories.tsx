import type { Meta, StoryObj } from '@storybook/react'
import { HistoryTab } from './HistoryTab'
import type { HistoryEntry } from '@/types'

const mockEntries: HistoryEntry[] = [
  {
    id: 'h1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    actor: 'witness/gastown/furiosa',
    field: 'status',
    old_value: 'open',
    new_value: 'in_progress',
  },
  {
    id: 'h2',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    actor: 'polecat/gastown/dag',
    field: 'priority',
    old_value: 'P3',
    new_value: 'P1',
  },
  {
    id: 'h3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    actor: 'crew/gastown/jeremy',
    field: 'title',
    old_value: 'Fix bug',
    new_value: 'Fix authentication timeout issue',
  },
  {
    id: 'h4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actor: 'mayor',
    field: 'assignee',
    old_value: null,
    new_value: 'polecat/gastown/dag',
  },
  {
    id: 'h5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    actor: 'mayor',
    field: 'description',
    old_value: null,
    new_value: 'Users are experiencing session timeouts after 30 minutes of inactivity.',
  },
]

const meta: Meta<typeof HistoryTab> = {
  title: 'Features/HistoryTab',
  component: HistoryTab,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md h-96 bg-bg-primary p-4 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof HistoryTab>

export const Default: Story = {
  args: {
    entries: mockEntries,
    className: 'h-full',
  },
}

export const Empty: Story = {
  args: {
    entries: [],
    className: 'h-full',
  },
}

export const SingleEntry: Story = {
  args: {
    entries: [mockEntries[0]],
    className: 'h-full',
  },
}

export const ManyEntries: Story = {
  args: {
    entries: [
      ...mockEntries,
      {
        id: 'h6',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        actor: 'witness/gastown/witness',
        field: 'labels',
        old_value: 'auth',
        new_value: 'auth, urgent',
      },
      {
        id: 'h7',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        actor: 'mayor',
        field: 'status',
        old_value: null,
        new_value: 'open',
      },
      {
        id: 'h8',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        actor: 'mayor',
        field: 'created',
        old_value: null,
        new_value: 'Issue created',
      },
    ],
    className: 'h-full',
  },
}

export const LongValues: Story = {
  args: {
    entries: [
      {
        id: 'long1',
        timestamp: new Date().toISOString(),
        actor: 'polecat/townview/very-long-polecat-name',
        field: 'description',
        old_value: 'This is a very long description that should be truncated in the display',
        new_value: 'This is an even longer description that definitely needs to be truncated when displayed in the history tab',
      },
    ],
    className: 'h-full',
  },
}
