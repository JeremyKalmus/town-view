import type { Meta, StoryObj } from '@storybook/react'
import { ProgressIndicator, ProgressIndicatorSkeleton } from './ProgressIndicator'
import type { MoleculeProgress } from '@/types'

const mockProgress: MoleculeProgress = {
  issue_id: 'GT-123',
  current_step: 3,
  total_steps: 5,
  step_name: 'Running tests',
  status: 'in_progress',
}

const meta: Meta<typeof ProgressIndicator> = {
  title: 'Features/Monitoring/ProgressIndicator',
  component: ProgressIndicator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ProgressIndicator>

export const Default: Story = {
  args: {
    progress: mockProgress,
  },
}

export const CompactMode: Story = {
  args: {
    progress: mockProgress,
    compact: true,
  },
}

export const EarlyProgress: Story = {
  args: {
    progress: {
      ...mockProgress,
      current_step: 1,
      total_steps: 10,
      step_name: 'Initializing',
    },
  },
}

export const NearComplete: Story = {
  args: {
    progress: {
      ...mockProgress,
      current_step: 9,
      total_steps: 10,
      step_name: 'Finalizing',
    },
  },
}

export const Complete: Story = {
  args: {
    progress: {
      ...mockProgress,
      current_step: 5,
      total_steps: 5,
      step_name: 'Done',
    },
  },
}

export const NoStepName: Story = {
  args: {
    progress: {
      ...mockProgress,
      step_name: '',
    },
  },
}

export const NoProgress: Story = {
  args: {
    progress: null,
  },
}

export const SkeletonFull: Story = {
  render: () => <ProgressIndicatorSkeleton />,
}

export const SkeletonCompact: Story = {
  render: () => <ProgressIndicatorSkeleton compact />,
}
