import type { Meta, StoryObj } from '@storybook/react'
import { ConvoyGroupHeader } from './ConvoyGroupHeader'
import type { ConvoyProgress } from '@/types/convoy'

const mockProgress: ConvoyProgress = {
  completed: 3,
  total: 5,
  percentage: 60,
}

const MockWorkItemRow = ({ id, title }: { id: string; title: string }) => (
  <div className="flex items-center gap-3 py-3 px-4 hover:bg-bg-tertiary/30">
    <span className="mono text-xs text-text-muted w-24">{id}</span>
    <span className="flex-1 truncate text-text-primary">{title}</span>
    <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
      task
    </span>
  </div>
)

const meta: Meta<typeof ConvoyGroupHeader> = {
  title: 'Features/Monitoring/ConvoyGroupHeader',
  component: ConvoyGroupHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-4 bg-bg-primary space-y-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onToggle: { action: 'toggled' },
  },
}

export default meta
type Story = StoryObj<typeof ConvoyGroupHeader>

export const Default: Story = {
  args: {
    convoyId: 'hq-cv-abc123',
    title: 'Dark Mode Feature',
    progress: mockProgress,
    itemCount: 3,
    children: (
      <>
        <MockWorkItemRow id="GT-101" title="Add theme toggle to settings" />
        <MockWorkItemRow id="GT-102" title="Implement CSS variables for colors" />
        <MockWorkItemRow id="GT-103" title="Add dark mode styles" />
      </>
    ),
  },
}

export const ExpandedByDefault: Story = {
  args: {
    convoyId: 'hq-cv-small',
    title: 'Bug Fix Sprint',
    progress: { completed: 1, total: 2, percentage: 50 },
    itemCount: 2,
    children: (
      <>
        <MockWorkItemRow id="GT-201" title="Fix login redirect issue" />
        <MockWorkItemRow id="GT-202" title="Handle empty state in list" />
      </>
    ),
  },
}

export const CollapsedByDefault: Story = {
  args: {
    convoyId: 'hq-cv-large',
    title: 'Major Refactor',
    progress: { completed: 2, total: 8, percentage: 25 },
    itemCount: 8,
    children: (
      <>
        <MockWorkItemRow id="GT-301" title="Extract common utilities" />
        <MockWorkItemRow id="GT-302" title="Refactor authentication module" />
        <MockWorkItemRow id="GT-303" title="Update API client" />
        <MockWorkItemRow id="GT-304" title="Migrate to new state management" />
        <MockWorkItemRow id="GT-305" title="Update component library" />
        <MockWorkItemRow id="GT-306" title="Add comprehensive tests" />
        <MockWorkItemRow id="GT-307" title="Update documentation" />
        <MockWorkItemRow id="GT-308" title="Performance optimization" />
      </>
    ),
  },
}

export const Complete: Story = {
  args: {
    convoyId: 'hq-cv-done',
    title: 'Completed Convoy',
    progress: { completed: 4, total: 4, percentage: 100 },
    itemCount: 4,
    children: (
      <>
        <MockWorkItemRow id="GT-401" title="Task 1 - Done" />
        <MockWorkItemRow id="GT-402" title="Task 2 - Done" />
        <MockWorkItemRow id="GT-403" title="Task 3 - Done" />
        <MockWorkItemRow id="GT-404" title="Task 4 - Done" />
      </>
    ),
  },
}

export const SingleItem: Story = {
  args: {
    convoyId: 'hq-cv-single',
    title: 'Quick Fix',
    progress: { completed: 0, total: 1, percentage: 0 },
    itemCount: 1,
    children: (
      <MockWorkItemRow id="GT-501" title="Fix typo in documentation" />
    ),
  },
}

export const LongTitle: Story = {
  args: {
    convoyId: 'hq-cv-long',
    title: 'This is a very long convoy title that should be truncated when it exceeds the available space',
    progress: { completed: 5, total: 10, percentage: 50 },
    itemCount: 3,
    children: (
      <>
        <MockWorkItemRow id="GT-601" title="First item" />
        <MockWorkItemRow id="GT-602" title="Second item" />
        <MockWorkItemRow id="GT-603" title="Third item" />
      </>
    ),
  },
}

export const ForceExpanded: Story = {
  args: {
    convoyId: 'hq-cv-force',
    title: 'Force Expanded (even with many items)',
    progress: { completed: 3, total: 6, percentage: 50 },
    itemCount: 6,
    defaultExpanded: true,
    children: (
      <>
        <MockWorkItemRow id="GT-701" title="Item 1" />
        <MockWorkItemRow id="GT-702" title="Item 2" />
        <MockWorkItemRow id="GT-703" title="Item 3" />
        <MockWorkItemRow id="GT-704" title="Item 4" />
        <MockWorkItemRow id="GT-705" title="Item 5" />
        <MockWorkItemRow id="GT-706" title="Item 6" />
      </>
    ),
  },
}

export const ForceCollapsed: Story = {
  args: {
    convoyId: 'hq-cv-collapse',
    title: 'Force Collapsed (even with few items)',
    progress: { completed: 1, total: 2, percentage: 50 },
    itemCount: 2,
    defaultExpanded: false,
    children: (
      <>
        <MockWorkItemRow id="GT-801" title="Item 1" />
        <MockWorkItemRow id="GT-802" title="Item 2" />
      </>
    ),
  },
}
