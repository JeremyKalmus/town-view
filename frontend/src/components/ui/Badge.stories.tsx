import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'
import type { AgentState } from '@/types'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Badge>

export const StatusDefault: Story = {
  args: {
    variant: 'status',
    status: 'Open',
    color: 'default',
  },
}

export const StatusSuccess: Story = {
  args: {
    variant: 'status',
    status: 'Completed',
    color: 'success',
  },
}

export const StatusWarning: Story = {
  args: {
    variant: 'status',
    status: 'In Progress',
    color: 'warning',
  },
}

export const StatusError: Story = {
  args: {
    variant: 'status',
    status: 'Blocked',
    color: 'error',
  },
}

export const StatusInfo: Story = {
  args: {
    variant: 'status',
    status: 'Deferred',
    color: 'info',
  },
}

export const HealthDotIdle: Story = {
  args: {
    variant: 'health-dot',
    state: 'idle',
    title: 'Witness: idle',
  },
}

export const HealthDotWorking: Story = {
  args: {
    variant: 'health-dot',
    state: 'working',
    title: 'Refinery: working',
  },
}

export const HealthDotStuck: Story = {
  args: {
    variant: 'health-dot',
    state: 'stuck',
    title: 'Crew: stuck',
  },
}

export const HealthDotPaused: Story = {
  args: {
    variant: 'health-dot',
    state: 'paused',
    title: 'Witness: paused',
  },
}

export const HealthDotNone: Story = {
  args: {
    variant: 'health-dot',
    state: undefined,
    title: 'Agent: not present',
  },
}

export const AllHealthDotStates: Story = {
  render: () => {
    const states: (AgentState | undefined)[] = ['idle', 'working', 'stuck', 'paused', undefined]
    const labels: Record<string, string> = {
      idle: 'Idle (green)',
      working: 'Working (blue)',
      stuck: 'Stuck (red)',
      paused: 'Paused (yellow)',
      none: 'Not present (gray)',
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Health Dot States</h3>
        <div className="flex items-center gap-6">
          {states.map((state) => (
            <div key={state ?? 'none'} className="flex items-center gap-2">
              <Badge variant="health-dot" state={state} title={labels[state ?? 'none']} />
              <span className="text-sm text-text-secondary">{labels[state ?? 'none']}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
}

export const HealthIndicatorExample: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Rig Health Indicator</h3>
      <p className="text-sm text-text-secondary">
        Shows Witness | Refinery | Crew status from left to right
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">All healthy:</span>
          <div className="flex items-center gap-1">
            <Badge variant="health-dot" state="idle" title="Witness: idle" />
            <Badge variant="health-dot" state="idle" title="Refinery: idle" />
            <Badge variant="health-dot" state="idle" title="Crew: idle" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Working:</span>
          <div className="flex items-center gap-1">
            <Badge variant="health-dot" state="working" title="Witness: working" />
            <Badge variant="health-dot" state="working" title="Refinery: working" />
            <Badge variant="health-dot" state="idle" title="Crew: idle" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Issues:</span>
          <div className="flex items-center gap-1">
            <Badge variant="health-dot" state="stuck" title="Witness: stuck" />
            <Badge variant="health-dot" state="paused" title="Refinery: paused" />
            <Badge variant="health-dot" state={undefined} title="Crew: not present" />
          </div>
        </div>
      </div>
    </div>
  ),
}
