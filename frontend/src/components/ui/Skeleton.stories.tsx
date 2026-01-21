import type { Meta, StoryObj } from '@storybook/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonIssueRow,
  SkeletonIssueList,
  SkeletonStatCard,
  SkeletonStatGrid,
  SkeletonRigItem,
  SkeletonRigList,
} from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Basic: Story = {
  args: {
    className: 'w-48 h-4',
  },
}

export const Circle: Story = {
  args: {
    className: 'w-12 h-12 rounded-full',
  },
}

export const Card: Story = {
  args: {
    className: 'w-full h-32 rounded-lg',
  },
}

export const Text: StoryObj<typeof SkeletonText> = {
  render: () => (
    <div className="w-96">
      <SkeletonText lines={3} />
    </div>
  ),
}

export const TextSingleLine: StoryObj<typeof SkeletonText> = {
  render: () => (
    <div className="w-96">
      <SkeletonText lines={1} />
    </div>
  ),
}

export const TextManyLines: StoryObj<typeof SkeletonText> = {
  render: () => (
    <div className="w-96">
      <SkeletonText lines={6} />
    </div>
  ),
}

export const IssueRow: StoryObj<typeof SkeletonIssueRow> = {
  render: () => (
    <div className="card">
      <SkeletonIssueRow />
    </div>
  ),
}

export const IssueList: StoryObj<typeof SkeletonIssueList> = {
  render: () => (
    <div className="card">
      <div className="border-b border-border pb-2 mb-2">
        <h2 className="section-header">ISSUES</h2>
      </div>
      <SkeletonIssueList count={5} />
    </div>
  ),
}

export const StatCard: StoryObj<typeof SkeletonStatCard> = {
  render: () => <SkeletonStatCard />,
}

export const StatGrid: StoryObj<typeof SkeletonStatGrid> = {
  render: () => <SkeletonStatGrid />,
}

export const RigItem: StoryObj<typeof SkeletonRigItem> = {
  render: () => (
    <div className="w-64 bg-bg-secondary p-2">
      <SkeletonRigItem />
    </div>
  ),
}

export const RigList: StoryObj<typeof SkeletonRigList> = {
  render: () => (
    <div className="w-64 bg-bg-secondary p-2">
      <SkeletonRigList count={4} />
    </div>
  ),
}

export const FullDashboard: Story = {
  render: () => (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats skeleton */}
      <SkeletonStatGrid />

      {/* Issue list skeleton */}
      <div className="card">
        <div className="border-b border-border pb-2 mb-2">
          <h2 className="section-header">ISSUES</h2>
        </div>
        <SkeletonIssueList count={6} />
      </div>
    </div>
  ),
}

export const SidebarLoading: Story = {
  render: () => (
    <div className="w-64 bg-bg-secondary border-r border-border h-96 flex flex-col">
      {/* Logo skeleton */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Rig list skeleton */}
      <div className="flex-1 p-2">
        <Skeleton className="h-4 w-12 mb-3 mx-2" />
        <SkeletonRigList count={3} />
      </div>
    </div>
  ),
}
