import type { Meta, StoryObj } from '@storybook/react'
import { ShortcutHint, ShortcutRow } from './ShortcutHint'

const meta: Meta<typeof ShortcutHint> = {
  title: 'UI/ShortcutHint',
  component: ShortcutHint,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-4 bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ShortcutHint>

export const SingleKey: Story = {
  args: {
    keys: '/',
  },
}

export const SingleKeyWithLabel: Story = {
  args: {
    keys: '/',
    label: 'Search:',
  },
}

export const SequenceKey: Story = {
  args: {
    keys: 'g d',
  },
}

export const SequenceKeyWithLabel: Story = {
  args: {
    keys: 'g d',
    label: 'Dashboard:',
  },
}

export const EscapeKey: Story = {
  args: {
    keys: 'Esc',
  },
}

export const SmallSize: Story = {
  args: {
    keys: 'g r',
    size: 'sm',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-text-secondary w-20">Small:</span>
        <ShortcutHint keys="g d" size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-text-secondary w-20">Medium:</span>
        <ShortcutHint keys="g d" size="md" />
      </div>
    </div>
  ),
}

export const ShortcutRowExample: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <ShortcutRow keys="/" description="Focus search" />
      <ShortcutRow keys="g d" description="Go to Dashboard" />
      <ShortcutRow keys="g r" description="Go to Roadmap" />
      <ShortcutRow keys="Esc" description="Close panel" />
    </div>
  ),
}

export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="text-text-primary">Quick Search</span>
          <ShortcutHint keys="/" size="sm" />
        </div>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="text-text-primary">Show Help</span>
          <ShortcutHint keys="?" size="sm" />
        </div>
      </div>
      <p className="text-sm text-text-muted">
        Press <ShortcutHint keys="?" size="sm" className="mx-1" /> for all shortcuts
      </p>
    </div>
  ),
}
