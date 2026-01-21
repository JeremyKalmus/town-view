import type { Meta, StoryObj } from '@storybook/react'
import { MetricsDisplay } from './MetricsDisplay'
import type { AuditMetrics } from '@/types'

const normalMetrics: AuditMetrics = {
  timeToComplete: {
    avg: 1000 * 60 * 60 * 2.5, // 2.5 hours
    min: 1000 * 60 * 45, // 45 minutes
    max: 1000 * 60 * 60 * 6, // 6 hours
  },
  reassignmentCount: 1,
  mergeConflictCount: 0,
}

const anomalyMetrics: AuditMetrics = {
  timeToComplete: {
    avg: 1000 * 60 * 60 * 24 * 3, // 3 days
    min: 1000 * 60 * 60 * 4, // 4 hours
    max: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  reassignmentCount: 8,
  mergeConflictCount: 5,
  anomalyThresholds: {
    timeToComplete: 1000 * 60 * 60 * 24, // 1 day threshold
    reassignmentCount: 3,
    mergeConflictCount: 2,
  },
}

const meta: Meta<typeof MetricsDisplay> = {
  title: 'Features/MetricsDisplay',
  component: MetricsDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-bg-primary p-4 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MetricsDisplay>

export const Default: Story = {
  args: {
    metrics: normalMetrics,
  },
}

export const WithAnomalies: Story = {
  args: {
    metrics: anomalyMetrics,
  },
}

export const ZeroValues: Story = {
  args: {
    metrics: {
      timeToComplete: {
        avg: 0,
        min: 0,
        max: 0,
      },
      reassignmentCount: 0,
      mergeConflictCount: 0,
    },
  },
}

export const LongDurations: Story = {
  args: {
    metrics: {
      timeToComplete: {
        avg: 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 8, // 5 days 8 hours
        min: 1000 * 60 * 60 * 24 * 2, // 2 days
        max: 1000 * 60 * 60 * 24 * 14, // 14 days
      },
      reassignmentCount: 12,
      mergeConflictCount: 3,
    },
  },
}

export const PartialAnomalies: Story = {
  args: {
    metrics: {
      timeToComplete: {
        avg: 1000 * 60 * 60 * 3, // 3 hours (normal)
        min: 1000 * 60 * 30,
        max: 1000 * 60 * 60 * 8,
      },
      reassignmentCount: 6, // anomaly
      mergeConflictCount: 1, // normal
      anomalyThresholds: {
        timeToComplete: 1000 * 60 * 60 * 24,
        reassignmentCount: 3,
        mergeConflictCount: 2,
      },
    },
  },
}

export const SingleReassignment: Story = {
  args: {
    metrics: {
      ...normalMetrics,
      reassignmentCount: 1,
    },
  },
}

export const SingleConflict: Story = {
  args: {
    metrics: {
      ...normalMetrics,
      mergeConflictCount: 1,
    },
  },
}
