import type { Meta, StoryObj } from '@storybook/react'
import { MetricsDisplay } from './MetricsDisplay'
import type { AuditMetrics } from '@/types'

const normalMetrics: AuditMetrics = {
  timeToComplete: {
    avg: 1000 * 60 * 60 * 2.5, // 2.5 hours
    min: 1000 * 60 * 45, // 45 minutes
    max: 1000 * 60 * 60 * 6, // 6 hours
  },
  completionCount: 24,
  typeBreakdown: { bugs: 8, tasks: 12, features: 4 },
}

const anomalyMetrics: AuditMetrics = {
  timeToComplete: {
    avg: 1000 * 60 * 60 * 24 * 3, // 3 days
    min: 1000 * 60 * 60 * 4, // 4 hours
    max: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  completionCount: 15,
  typeBreakdown: { bugs: 5, tasks: 7, features: 3 },
  anomalyThresholds: {
    timeToComplete: 1000 * 60 * 60 * 24, // 1 day threshold
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
      completionCount: 0,
      typeBreakdown: { bugs: 0, tasks: 0, features: 0 },
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
      completionCount: 42,
      typeBreakdown: { bugs: 15, tasks: 20, features: 7 },
    },
  },
}

export const MostlyBugs: Story = {
  args: {
    metrics: {
      timeToComplete: {
        avg: 1000 * 60 * 60 * 3, // 3 hours
        min: 1000 * 60 * 30,
        max: 1000 * 60 * 60 * 8,
      },
      completionCount: 18,
      typeBreakdown: { bugs: 14, tasks: 3, features: 1 },
    },
  },
}

export const SingleCompletion: Story = {
  args: {
    metrics: {
      ...normalMetrics,
      completionCount: 1,
      typeBreakdown: { bugs: 0, tasks: 1, features: 0 },
    },
  },
}

export const AllFeatures: Story = {
  args: {
    metrics: {
      ...normalMetrics,
      completionCount: 5,
      typeBreakdown: { bugs: 0, tasks: 0, features: 5 },
    },
  },
}
