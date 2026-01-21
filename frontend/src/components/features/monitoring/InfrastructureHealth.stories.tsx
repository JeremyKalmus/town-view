import type { Meta, StoryObj } from '@storybook/react'
import { InfrastructureHealth } from './InfrastructureHealth'
import type { Agent } from '@/types'

const mockMayor: Agent = {
  id: 'hq-mayor-001',
  name: 'mayor',
  role_type: 'mayor',
  rig: 'hq',
  state: 'working',
  hook_bead: 'to-c133',
  updated_at: '2026-01-21T14:30:00Z',
}

const mockDeacon: Agent = {
  id: 'hq-deacon-001',
  name: 'deacon',
  role_type: 'deacon',
  rig: 'hq',
  state: 'idle',
  hook_bead: undefined,
  updated_at: '2026-01-21T14:25:00Z',
}

const mockRefinery: Agent = {
  id: 'hq-refinery-001',
  name: 'refinery',
  role_type: 'refinery',
  rig: 'hq',
  state: 'working',
  hook_bead: 'batch-merge-007',
  updated_at: '2026-01-21T14:35:00Z',
}

const meta: Meta<typeof InfrastructureHealth> = {
  title: 'Features/Monitoring/InfrastructureHealth',
  component: InfrastructureHealth,
  tags: ['autodocs'],
  argTypes: {
    onAgentClick: { action: 'agent clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof InfrastructureHealth>

export const AllRunning: Story = {
  args: {
    agents: [mockMayor, mockDeacon, mockRefinery],
  },
}

export const AllWorking: Story = {
  args: {
    agents: [
      { ...mockMayor, state: 'working', hook_bead: 'to-c133' },
      { ...mockDeacon, state: 'working', hook_bead: 'schedule-batch-012' },
      { ...mockRefinery, state: 'working', hook_bead: 'batch-merge-007' },
    ],
  },
}

export const MayorOnly: Story = {
  args: {
    agents: [mockMayor],
  },
}

export const DeaconOnly: Story = {
  args: {
    agents: [mockDeacon],
  },
}

export const RefineryOnly: Story = {
  args: {
    agents: [mockRefinery],
  },
}

export const NoneRunning: Story = {
  args: {
    agents: [],
  },
}

export const MayorMissing: Story = {
  args: {
    agents: [mockDeacon, mockRefinery],
  },
}

export const DeaconMissing: Story = {
  args: {
    agents: [mockMayor, mockRefinery],
  },
}

export const RefineryMissing: Story = {
  args: {
    agents: [mockMayor, mockDeacon],
  },
}

export const WithStuckAgent: Story = {
  args: {
    agents: [
      { ...mockMayor, state: 'stuck', hook_bead: 'to-stuck-task' },
      mockDeacon,
      mockRefinery,
    ],
  },
}

export const WithPausedAgent: Story = {
  args: {
    agents: [
      mockMayor,
      { ...mockDeacon, state: 'paused', hook_bead: 'to-paused-schedule' },
      mockRefinery,
    ],
  },
}

export const MixedWithOtherAgents: Story = {
  args: {
    agents: [
      mockMayor,
      mockDeacon,
      mockRefinery,
      // These should be ignored (not infrastructure roles)
      {
        id: 'polecat-001',
        name: 'worker-polecat',
        role_type: 'polecat',
        rig: 'townview',
        state: 'working',
        hook_bead: 'to-l13.1',
        updated_at: '2026-01-21T14:40:00Z',
      },
      {
        id: 'witness-001',
        name: 'watcher',
        role_type: 'witness',
        rig: 'townview',
        state: 'working',
        hook_bead: undefined,
        updated_at: '2026-01-21T14:40:00Z',
      },
    ],
  },
}
