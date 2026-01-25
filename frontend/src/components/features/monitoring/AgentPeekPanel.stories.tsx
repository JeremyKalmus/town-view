import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { AgentPeekPanel } from './AgentPeekPanel'
import type { Agent } from '@/types'

// Mock agent data for stories
const mockAgents: Agent[] = [
  {
    id: 'townview/witness',
    name: 'witness',
    rig: 'townview',
    role_type: 'witness',
    state: 'working',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/refinery',
    name: 'refinery',
    rig: 'townview',
    role_type: 'refinery',
    state: 'idle',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/polecats/dementus',
    name: 'dementus',
    rig: 'townview',
    role_type: 'polecat',
    state: 'working',
    hook_bead: 'to-task-123',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'townview/crew/jeremy',
    name: 'jeremy',
    rig: 'townview',
    role_type: 'crew',
    state: 'working',
    hook_bead: 'to-epic-456',
    updated_at: new Date().toISOString(),
  },
]

// Since AgentPeekPanel uses hooks internally, we create a wrapper
// that lets us control the panel state in stories
function AgentPeekPanelWrapper({
  initialOpen = false,
  ...props
}: Omit<React.ComponentProps<typeof AgentPeekPanel>, 'isOpen' | 'onClose'> & {
  initialOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  return (
    <div className="p-6">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-accent-chrome text-bg-primary rounded-md hover:bg-accent-chrome/90 transition-colors"
      >
        Open Terminal: {props.agent?.name || 'Unknown'}
      </button>
      <AgentPeekPanel
        {...props}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}

const meta: Meta<typeof AgentPeekPanel> = {
  title: 'Features/Monitoring/AgentPeekPanel',
  component: AgentPeekPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AgentPeekPanel>

export const Default: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[2]} // dementus polecat
    />
  ),
}

export const Closed: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={false}
      rigId="townview"
      agent={mockAgents[2]}
    />
  ),
}

export const WitnessAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[0]} // witness
    />
  ),
}

export const RefineryAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[1]} // refinery
    />
  ),
}

export const CrewAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={mockAgents[3]} // crew/jeremy
    />
  ),
}

export const NoAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="townview"
      agent={null}
    />
  ),
}

// Interactive story showing all controls
export const Interactive: Story = {
  render: () => {
    return (
      <div className="p-6 space-y-4">
        <h2 className="section-header mb-4">AGENT TERMINAL PANELS</h2>
        <p className="text-text-secondary text-sm mb-4">
          Click any button to open the terminal panel for that agent.
        </p>
        <div className="flex flex-wrap gap-3">
          {mockAgents.map((agent) => (
            <AgentPeekPanelWrapper
              key={agent.id}
              initialOpen={false}
              rigId={agent.rig}
              agent={agent}
            />
          ))}
        </div>
      </div>
    )
  },
}
