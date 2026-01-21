import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Spinner, LoadingOverlay, InlineLoading, ButtonSpinner } from './Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Spinner>

export const Small: Story = {
  args: {
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
  },
}

export const CustomColor: Story = {
  args: {
    size: 'lg',
    className: 'text-accent-rust',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <Spinner size="sm" />
        <p className="text-xs text-text-muted mt-2">Small</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-xs text-text-muted mt-2">Medium</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-2">Large</p>
      </div>
    </div>
  ),
}

export const Inline: StoryObj<typeof InlineLoading> = {
  render: () => (
    <div className="space-y-4">
      <InlineLoading message="Loading issues..." />
      <InlineLoading message="Fetching data..." size="sm" />
      <InlineLoading message="Processing request..." size="lg" />
    </div>
  ),
}

export const Overlay: StoryObj<typeof LoadingOverlay> = {
  render: () => (
    <div className="relative w-96 h-64 card">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Content Area</h2>
        <p className="text-text-secondary text-sm mt-2">
          This content is behind the loading overlay.
        </p>
      </div>
      <LoadingOverlay visible={true} message="Loading content..." />
    </div>
  ),
}

export const OverlayWithoutMessage: StoryObj<typeof LoadingOverlay> = {
  render: () => (
    <div className="relative w-96 h-48 card">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Content Area</h2>
        <p className="text-text-secondary text-sm mt-2">
          Simple overlay without message text.
        </p>
      </div>
      <LoadingOverlay visible={true} />
    </div>
  ),
}

export const ButtonWithSpinner: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button className="btn-primary flex items-center gap-2">
          <ButtonSpinner />
          <span>Saving...</span>
        </button>
        <button className="btn-secondary flex items-center gap-2">
          <ButtonSpinner />
          <span>Loading...</span>
        </button>
      </div>

      <div className="flex gap-4">
        <button className="btn-primary" disabled>
          Normal Button
        </button>
        <button className="btn-primary flex items-center gap-2" disabled>
          <ButtonSpinner />
          <span>Saving...</span>
        </button>
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  render: function Render() {
    const [isLoading, setIsLoading] = useState(false)

    const handleClick = () => {
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 2000)
    }

    return (
      <div className="space-y-4">
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="btn-primary flex items-center gap-2 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <ButtonSpinner />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
        <p className="text-sm text-text-muted">
          Click the button to see the loading state
        </p>
      </div>
    )
  },
}

export const ConfirmButtonStates: Story = {
  render: () => (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">Normal State</h3>
        <div className="flex gap-3">
          <button className="btn-secondary">Cancel</button>
          <button className="btn-primary">Confirm Update</button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">Saving State</h3>
        <div className="flex gap-3">
          <button className="btn-secondary" disabled>Cancel</button>
          <button className="btn-primary flex items-center gap-2" disabled>
            <ButtonSpinner />
            <span>Saving...</span>
          </button>
        </div>
      </div>
    </div>
  ),
}

export const StatusIndicator: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Spinner size="sm" className="text-status-in-progress" />
        <span className="text-status-in-progress">Syncing...</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Spinner size="sm" className="text-accent-rust" />
        <span className="text-text-secondary">Processing updates</span>
      </div>
    </div>
  ),
}
