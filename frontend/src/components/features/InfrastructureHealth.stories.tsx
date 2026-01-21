import type { Meta, StoryObj } from '@storybook/react'
import { InfrastructureHealth } from './InfrastructureHealth'
import type { Agent } from '@/types'

const mockMayor: Agent = {
  id: 'gt-mayor-1',
  name: 'mayor',
  role_type: 'mayor',
  rig: 'townview',
  state: 'working',
  hook_bead: 'to-convoy-42',
  updated_at: '2026-01-21T14:30:00Z',
}

const mockDeacon: Agent = {
  id: 'gt-deacon-1',
  name: 'deacon',
  role_type: 'deacon',
  rig: 'townview',
  state: 'idle',
  hook_bead: undefined,
  updated_at: '2026-01-21T14:25:00Z',
}

const mockRefinery: Agent = {
  id: 'gt-refinery-1',
  name: 'refinery',
  role_type: 'refinery',
  rig: 'townview',
  state: 'working',
  hook_bead: 'to-batch-007',
  updated_at: '2026-01-21T14:28:00Z',
}

const meta: Meta<typeof InfrastructureHealth> = {
  title: 'Features/InfrastructureHealth',
  component: InfrastructureHealth,
  tags: ['autodocs'],
  argTypes: {
    onAgentClick: { action: 'agent clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm p-4 bg-bg-primary">
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
      { ...mockMayor, state: 'working', hook_bead: 'to-convoy-42' },
      { ...mockDeacon, state: 'working', hook_bead: 'to-dispatch-15' },
      { ...mockRefinery, state: 'working', hook_bead: 'to-batch-007' },
    ],
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

export const OnlyRefinery: Story = {
  args: {
    agents: [mockRefinery],
  },
}

export const AllMissing: Story = {
  args: {
    agents: [],
  },
}

export const StuckAgents: Story = {
  args: {
    agents: [
      { ...mockMayor, state: 'stuck', hook_bead: 'to-convoy-42' },
      { ...mockDeacon, state: 'working', hook_bead: 'to-dispatch-15' },
      { ...mockRefinery, state: 'paused', hook_bead: 'to-batch-007' },
    ],
  },
}

export const MixedStates: Story = {
  args: {
    agents: [
      { ...mockMayor, state: 'working', hook_bead: 'to-convoy-42' },
      { ...mockDeacon, state: 'idle', hook_bead: undefined },
      { ...mockRefinery, state: 'stuck', hook_bead: 'to-batch-007' },
    ],
  },
}

export const WithOtherAgents: Story = {
  args: {
    agents: [
      mockMayor,
      mockDeacon,
      mockRefinery,
      // Non-infrastructure agents should be ignored
      {
        id: 'gt-polecat-1',
        name: 'worker-1',
        role_type: 'polecat',
        rig: 'townview',
        state: 'working',
        hook_bead: 'to-task-123',
        updated_at: '2026-01-21T14:30:00Z',
      },
      {
        id: 'gt-witness-1',
        name: 'witness',
        role_type: 'witness',
        rig: 'townview',
        state: 'working',
        hook_bead: undefined,
        updated_at: '2026-01-21T14:30:00Z',
      },
    ],
  },
}
