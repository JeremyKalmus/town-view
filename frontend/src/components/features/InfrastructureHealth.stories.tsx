import type { Meta, StoryObj } from '@storybook/react'
import { InfrastructureHealth } from './InfrastructureHealth'

const meta: Meta<typeof InfrastructureHealth> = {
  title: 'Features/InfrastructureHealth',
  component: InfrastructureHealth,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 'gt-mayor',
            name: 'coordinator',
            role_type: 'mayor',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-convoy-456',
            updated_at: '2026-01-21T14:30:00Z',
          },
          {
            id: 'gt-deacon',
            name: 'scheduler',
            role_type: 'deacon',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-batch-123',
            updated_at: '2026-01-21T14:25:00Z',
          },
          {
            id: 'gt-refinery',
            name: 'processor',
            role_type: 'refinery',
            rig: 'hq',
            state: 'idle',
            updated_at: '2026-01-21T14:00:00Z',
          },
        ],
      },
    ],
  },
}

export default meta
type Story = StoryObj<typeof InfrastructureHealth>

export const Default: Story = {
  args: {
    rigId: 'hq',
  },
}

export const AllWorking: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 'gt-mayor',
            name: 'coordinator',
            role_type: 'mayor',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-convoy-456',
            updated_at: '2026-01-21T14:30:00Z',
          },
          {
            id: 'gt-deacon',
            name: 'scheduler',
            role_type: 'deacon',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-batch-123',
            updated_at: '2026-01-21T14:25:00Z',
          },
          {
            id: 'gt-refinery',
            name: 'processor',
            role_type: 'refinery',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-mr-789',
            updated_at: '2026-01-21T14:28:00Z',
          },
        ],
      },
    ],
  },
}

export const AllIdle: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 'gt-mayor',
            name: 'coordinator',
            role_type: 'mayor',
            rig: 'hq',
            state: 'idle',
            updated_at: '2026-01-21T14:30:00Z',
          },
          {
            id: 'gt-deacon',
            name: 'scheduler',
            role_type: 'deacon',
            rig: 'hq',
            state: 'idle',
            updated_at: '2026-01-21T14:25:00Z',
          },
          {
            id: 'gt-refinery',
            name: 'processor',
            role_type: 'refinery',
            rig: 'hq',
            state: 'idle',
            updated_at: '2026-01-21T14:00:00Z',
          },
        ],
      },
    ],
  },
}

export const SomeStuck: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 'gt-mayor',
            name: 'coordinator',
            role_type: 'mayor',
            rig: 'hq',
            state: 'stuck',
            hook_bead: 'to-convoy-456',
            updated_at: '2026-01-21T12:30:00Z',
          },
          {
            id: 'gt-deacon',
            name: 'scheduler',
            role_type: 'deacon',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-batch-123',
            updated_at: '2026-01-21T14:25:00Z',
          },
          {
            id: 'gt-refinery',
            name: 'processor',
            role_type: 'refinery',
            rig: 'hq',
            state: 'paused',
            hook_bead: 'to-mr-789',
            updated_at: '2026-01-21T14:00:00Z',
          },
        ],
      },
    ],
  },
}

export const MissingAgents: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 'gt-mayor',
            name: 'coordinator',
            role_type: 'mayor',
            rig: 'hq',
            state: 'working',
            hook_bead: 'to-convoy-456',
            updated_at: '2026-01-21T14:30:00Z',
          },
          // Deacon and Refinery are missing
        ],
      },
    ],
  },
}

export const NoAgents: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 200,
        response: [],
      },
    ],
  },
}

export const ErrorState: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/rigs/hq/agents',
        method: 'GET',
        status: 500,
        response: { error: 'Internal server error' },
      },
    ],
  },
}
