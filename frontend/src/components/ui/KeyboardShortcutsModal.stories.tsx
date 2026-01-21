import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

// Interactive wrapper
function KeyboardShortcutsModalDemo() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-accent-rust text-white rounded-md hover:bg-accent-rust/80 transition-colors"
      >
        Open Shortcuts Modal (or press ?)
      </button>
      <KeyboardShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}

const meta: Meta<typeof KeyboardShortcutsModal> = {
  title: 'UI/KeyboardShortcutsModal',
  component: KeyboardShortcutsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onClose: { action: 'closed' },
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
type Story = StoryObj<typeof KeyboardShortcutsModal>

export const Default: Story = {
  render: () => <KeyboardShortcutsModalDemo />,
}

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
}

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
}
