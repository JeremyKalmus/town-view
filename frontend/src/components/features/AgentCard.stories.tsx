import type { Meta, StoryObj } from '@storybook/react'
import { AgentCard } from './AgentCard'
import type { Agent } from '@/types'

const mockAgent: Agent = {
  id: 'gt-emma',
  name: 'emma',
  role_type: 'polecat',
  rig: 'townview',
  state: 'working',
  hook_bead: 'to-l13.1',
  updated_at: '2026-01-20T14:30:00Z',
}

const meta: Meta<typeof AgentCard> = {
  title: 'Features/AgentCard',
  component: AgentCard,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
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
type Story = StoryObj<typeof AgentCard>

export const Working: Story = {
  args: {
    agent: mockAgent,
  },
}

export const Idle: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-idle-agent',
      name: 'idle-worker',
      state: 'idle',
      hook_bead: undefined,
    },
  },
}

export const Stuck: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-stuck-agent',
      name: 'troubled-worker',
      state: 'stuck',
      hook_bead: 'to-l10.3',
    },
  },
}

export const Paused: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-paused-agent',
      name: 'paused-worker',
      state: 'paused',
      hook_bead: 'to-l5.2',
    },
  },
}

export const Witness: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-witness',
      name: 'overseer',
      role_type: 'witness',
      state: 'working',
      hook_bead: undefined,
    },
  },
}

export const Refinery: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-refinery',
      name: 'processor',
      role_type: 'refinery',
      state: 'working',
      hook_bead: 'to-batch-001',
    },
  },
}

export const Crew: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-crew',
      name: 'team-alpha',
      role_type: 'crew',
      state: 'idle',
      hook_bead: undefined,
    },
  },
}

export const Deacon: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-deacon',
      name: 'scheduler',
      role_type: 'deacon',
      state: 'working',
    },
  },
}

export const Mayor: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-mayor',
      name: 'coordinator',
      role_type: 'mayor',
      state: 'working',
    },
  },
}

export const AllRoleTypes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(['witness', 'refinery', 'crew', 'polecat', 'deacon', 'mayor'] as const).map((roleType) => (
        <AgentCard
          key={roleType}
          agent={{
            ...mockAgent,
            id: `gt-${roleType}`,
            name: `${roleType}-agent`,
            role_type: roleType,
            state: 'working',
          }}
        />
      ))}
    </div>
  ),
}

export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(['idle', 'working', 'stuck', 'paused'] as const).map((state) => (
        <AgentCard
          key={state}
          agent={{
            ...mockAgent,
            id: `gt-${state}`,
            name: `${state}-agent`,
            state,
            hook_bead: state === 'idle' ? undefined : 'to-example',
          }}
        />
      ))}
    </div>
  ),
}

// Compact variant stories
export const CompactWorking: Story = {
  args: {
    agent: mockAgent,
    variant: 'compact',
  },
}

export const CompactIdle: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-compact-idle',
      name: 'idle-worker',
      state: 'idle',
      hook_bead: undefined,
    },
    variant: 'compact',
  },
}

export const CompactStuck: Story = {
  args: {
    agent: {
      ...mockAgent,
      id: 'gt-compact-stuck',
      name: 'troubled-worker',
      state: 'stuck',
      hook_bead: 'to-l10.3',
    },
    variant: 'compact',
  },
}

export const CompactAllStates: Story = {
  render: () => (
    <div className="space-y-3 max-w-sm">
      {(['idle', 'working', 'stuck', 'paused'] as const).map((state) => (
        <AgentCard
          key={state}
          agent={{
            ...mockAgent,
            id: `gt-compact-${state}`,
            name: `${state}-agent`,
            state,
            hook_bead: state === 'idle' ? undefined : 'to-example.1',
          }}
          variant="compact"
        />
      ))}
    </div>
  ),
}

export const CompactInfrastructureRoles: Story = {
  render: () => (
    <div className="space-y-3 max-w-sm">
      {(['mayor', 'deacon', 'refinery'] as const).map((roleType) => (
        <AgentCard
          key={roleType}
          agent={{
            ...mockAgent,
            id: `gt-${roleType}`,
            name: `${roleType}-001`,
            role_type: roleType,
            state: roleType === 'refinery' ? 'working' : 'idle',
            hook_bead: roleType === 'refinery' ? 'to-batch-003' : undefined,
          }}
          variant="compact"
        />
      ))}
    </div>
  ),
}
