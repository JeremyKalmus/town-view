import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { AgentPeekPanel } from './AgentPeekPanel'

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
        Open Terminal: {props.agentName || props.agentId}
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
      agentId="to-polecat-dementus"
      agentName="dementus"
    />
  ),
}

export const Closed: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={false}
      rigId="townview"
      agentId="to-polecat-dementus"
      agentName="dementus"
    />
  ),
}

export const WitnessAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="gas-town"
      agentId="gt-witness"
      agentName="witness"
    />
  ),
}

export const RefineryAgent: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="bullet-farm"
      agentId="bf-refinery"
      agentName="refinery"
    />
  ),
}

export const WithoutAgentName: Story = {
  render: () => (
    <AgentPeekPanelWrapper
      initialOpen={true}
      rigId="citadel"
      agentId="ct-polecat-1"
    />
  ),
}

// Interactive story showing all controls
export const Interactive: Story = {
  render: () => {
    const agents = [
      { rigId: 'townview', agentId: 'to-witness', name: 'witness' },
      { rigId: 'townview', agentId: 'to-refinery', name: 'refinery' },
      { rigId: 'townview', agentId: 'to-polecat-dementus', name: 'dementus' },
      { rigId: 'gas-town', agentId: 'gt-polecat-1', name: 'runner-1' },
    ]

    return (
      <div className="p-6 space-y-4">
        <h2 className="section-header mb-4">AGENT TERMINAL PANELS</h2>
        <p className="text-text-secondary text-sm mb-4">
          Click any button to open the terminal panel for that agent.
        </p>
        <div className="flex flex-wrap gap-3">
          {agents.map((agent) => (
            <AgentPeekPanelWrapper
              key={agent.agentId}
              initialOpen={false}
              rigId={agent.rigId}
              agentId={agent.agentId}
              agentName={agent.name}
            />
          ))}
        </div>
      </div>
    )
  },
}
