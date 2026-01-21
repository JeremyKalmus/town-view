import type { Meta, StoryObj } from '@storybook/react'
import { RigItem } from './Sidebar'
import type { Rig, Agent } from '@/types'

// Mock rig data
const mockRig: Rig = {
  id: 'townview-123',
  name: 'townview',
  prefix: 'to',
  path: '/projects/townview',
  beads_path: '/projects/townview/.beads',
  issue_count: 42,
  open_count: 12,
  agent_count: 3,
}

// Mock agents for the rig
const mockAgents: Agent[] = [
  {
    id: 'to-witness',
    name: 'overseer',
    role_type: 'witness',
    rig: 'townview-123',
    state: 'working',
    updated_at: '2026-01-20T14:30:00Z',
  },
  {
    id: 'to-refinery',
    name: 'processor',
    role_type: 'refinery',
    rig: 'townview-123',
    state: 'idle',
    updated_at: '2026-01-20T14:30:00Z',
  },
  {
    id: 'to-crew',
    name: 'team-alpha',
    role_type: 'crew',
    rig: 'townview-123',
    state: 'idle',
    updated_at: '2026-01-20T14:30:00Z',
  },
]

// Mock fetch for Storybook
const setupMockFetch = (agents: Agent[]) => {
  const originalFetch = window.fetch
  window.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/rigs/') && url.includes('/agents')) {
      return new Response(JSON.stringify(agents), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return originalFetch(input)
  }
  return () => {
    window.fetch = originalFetch
  }
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
    rig: mockRig,
    selected: false,
    variant: 'default',
  },
}

export const Selected: Story = {
  args: {
    rig: mockRig,
    selected: true,
    variant: 'default',
  },
}

export const HealthVariant: Story = {
  args: {
    rig: mockRig,
    selected: false,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      setupMockFetch(mockAgents)
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const HealthVariantSelected: Story = {
  args: {
    rig: mockRig,
    selected: true,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      setupMockFetch(mockAgents)
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const HealthAllWorking: Story = {
  args: {
    rig: mockRig,
    selected: false,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      setupMockFetch(
        mockAgents.map((a) => ({ ...a, state: 'working' as const }))
      )
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const HealthSomeStuck: Story = {
  args: {
    rig: mockRig,
    selected: false,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      setupMockFetch([
        { ...mockAgents[0], state: 'stuck' },
        { ...mockAgents[1], state: 'paused' },
        { ...mockAgents[2], state: 'idle' },
      ])
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const HealthMissingAgents: Story = {
  args: {
    rig: mockRig,
    selected: false,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      // Only witness exists, refinery and crew are missing (gray dots)
      setupMockFetch([mockAgents[0]])
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const HealthFallbackToCount: Story = {
  args: {
    rig: mockRig,
    selected: false,
    variant: 'health',
  },
  decorators: [
    (Story) => {
      // Mock fetch to return error, should fallback to count
      window.fetch = async () => {
        return new Response('Not found', { status: 404 })
      }
      // Note: cleanup not called in Storybook decorator, but acceptable for stories
      return (
        <div className="w-64 bg-bg-secondary p-2">
          <Story />
        </div>
      )
    },
  ],
}

export const AllVariants: Story = {
  render: () => {
    setupMockFetch(mockAgents)
    return (
      <div className="w-64 bg-bg-secondary p-2 space-y-4">
        <div>
          <h4 className="text-xs text-text-muted mb-2">Default variant (count)</h4>
          <RigItem
            rig={mockRig}
            selected={false}
            variant="default"
            onClick={() => {}}
          />
        </div>
        <div>
          <h4 className="text-xs text-text-muted mb-2">Health variant (dots)</h4>
          <RigItem
            rig={mockRig}
            selected={false}
            variant="health"
            onClick={() => {}}
          />
        </div>
      </div>
    )
  },
}
