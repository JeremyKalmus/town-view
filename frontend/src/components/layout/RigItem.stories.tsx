import type { Meta, StoryObj } from '@storybook/react'
import { RigItem } from './Sidebar'
import type { Rig } from '@/types'

// Mock rig with all agents healthy
const mockRigHealthy: Rig = {
  id: 'townview',
  name: 'townview',
  prefix: 'to-',
  path: '/projects/townview',
  beads_path: '/projects/townview/.beads',
  issue_count: 42,
  open_count: 12,
  agent_count: 3,
  agent_health: {
    witness: 'idle',
    refinery: 'idle',
    crew: 'working',
  },
}

// Mock rig with some stuck agents
const mockRigSomeStuck: Rig = {
  ...mockRigHealthy,
  id: 'gastown',
  name: 'gastown',
  prefix: 'gt-',
  agent_health: {
    witness: 'stuck',
    refinery: 'paused',
    crew: 'idle',
  },
}

// Mock rig with partial agents (only witness exists)
const mockRigPartial: Rig = {
  ...mockRigHealthy,
  id: 'beads',
  name: 'beads',
  prefix: 'bd-',
  agent_count: 1,
  agent_health: {
    witness: 'working',
    refinery: null,
    crew: null,
  },
}

// Mock rig with no agents
const mockRigNoAgents: Rig = {
  ...mockRigHealthy,
  id: 'docs',
  name: 'docs',
  prefix: 'dc-',
  agent_count: 0,
  agent_health: undefined,
}

const meta: Meta<typeof RigItem> = {
  title: 'Layout/RigItem',
  component: RigItem,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="w-64 bg-bg-secondary p-2">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof RigItem>

export const Default: Story = {
  args: {
    rig: mockRigHealthy,
    selected: false,
  },
}

export const Selected: Story = {
  args: {
    rig: mockRigHealthy,
    selected: true,
  },
}

export const AllWorking: Story = {
  args: {
    rig: {
      ...mockRigHealthy,
      agent_health: {
        witness: 'working',
        refinery: 'working',
        crew: 'working',
      },
    },
    selected: false,
  },
}

export const SomeStuck: Story = {
  args: {
    rig: mockRigSomeStuck,
    selected: false,
  },
}

export const PartialAgents: Story = {
  args: {
    rig: mockRigPartial,
    selected: false,
  },
}

export const NoAgents: Story = {
  args: {
    rig: mockRigNoAgents,
    selected: false,
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="w-64 bg-bg-secondary p-2 space-y-4">
      <div>
        <h4 className="text-xs text-text-muted mb-2">Healthy agents</h4>
        <RigItem rig={mockRigHealthy} selected={false} onClick={() => {}} />
      </div>
      <div>
        <h4 className="text-xs text-text-muted mb-2">Some stuck/paused</h4>
        <RigItem rig={mockRigSomeStuck} selected={false} onClick={() => {}} />
      </div>
      <div>
        <h4 className="text-xs text-text-muted mb-2">Partial agents (witness only)</h4>
        <RigItem rig={mockRigPartial} selected={false} onClick={() => {}} />
      </div>
      <div>
        <h4 className="text-xs text-text-muted mb-2">No agents</h4>
        <RigItem rig={mockRigNoAgents} selected={false} onClick={() => {}} />
      </div>
    </div>
  ),
}
