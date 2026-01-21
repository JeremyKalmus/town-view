import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SlideOutPanel } from './SlideOutPanel'

const meta: Meta<typeof SlideOutPanel> = {
  title: 'Layout/SlideOutPanel',
  component: SlideOutPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof SlideOutPanel>

// Interactive wrapper component for stories
function PanelDemo({
  title,
  children,
}: {
  title?: string
  children?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        Open Panel
      </button>

      <SlideOutPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
      >
        {children || (
          <div className="p-4 space-y-4">
            <p className="text-text-primary">
              This is the panel content. Click the backdrop or close button to dismiss.
            </p>
            <p className="text-text-secondary text-sm">
              Press Escape to close the panel.
            </p>
          </div>
        )}
      </SlideOutPanel>
    </div>
  )
}

export const Default: Story = {
  render: () => <PanelDemo title="Panel Title" />,
}

export const WithoutTitle: Story = {
  render: () => <PanelDemo />,
}

export const WithRichContent: Story = {
  render: () => (
    <PanelDemo title="Issue Details">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">to-abc123</h3>
          <p className="text-text-secondary">Fix authentication timeout</p>
        </div>

        <div className="divider" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Status</span>
            <span className="badge-status-in-progress">In Progress</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Priority</span>
            <span className="badge-priority-p1">P1</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Assignee</span>
            <span className="text-text-primary">@emma</span>
          </div>
        </div>

        <div className="divider" />

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-primary">Description</h4>
          <p className="text-sm text-text-secondary">
            Users are experiencing timeout errors when attempting to authenticate
            with OAuth providers. The timeout threshold needs to be increased and
            proper retry logic should be implemented.
          </p>
        </div>
      </div>
    </PanelDemo>
  ),
}

export const WithScrollableContent: Story = {
  render: () => (
    <PanelDemo title="Long Content">
      <div className="p-4 space-y-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="card">
            <h4 className="font-medium text-text-primary">Item {i + 1}</h4>
            <p className="text-sm text-text-secondary mt-1">
              This is item number {i + 1} in a scrollable list of content
              that demonstrates the panel's scrolling behavior.
            </p>
          </div>
        ))}
      </div>
    </PanelDemo>
  ),
}

export const AlwaysOpen: Story = {
  render: () => (
    <div className="min-h-screen bg-bg-primary">
      <SlideOutPanel
        isOpen={true}
        onClose={() => {}}
        title="Always Open Panel"
      >
        <div className="p-4">
          <p className="text-text-primary">
            This panel is always open for demonstration purposes.
          </p>
        </div>
      </SlideOutPanel>
    </div>
  ),
}
