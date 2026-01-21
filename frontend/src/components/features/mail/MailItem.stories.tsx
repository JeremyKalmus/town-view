import type { Meta, StoryObj } from '@storybook/react'
import { MailItem } from './MailItem'
import type { Mail } from '@/types'

const mockMail: Mail = {
  id: 'mail-001',
  from: 'witness',
  subject: 'Polecat rictus completed to-c133.3',
  preview: 'The Infrastructure Health Component has been implemented and merged to main. All acceptance criteria have been met.',
  timestamp: '2026-01-21T15:30:00Z',
  read: false,
}

const meta: Meta<typeof MailItem> = {
  title: 'Features/Mail/MailItem',
  component: MailItem,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl card p-0">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MailItem>

export const Unread: Story = {
  args: {
    mail: mockMail,
  },
}

export const Read: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-002',
      read: true,
    },
  },
}

export const LongSubject: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-003',
      subject: 'This is a very long subject line that should be truncated when displayed in the compact view of the mail item component',
    },
  },
}

export const LongPreview: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-004',
      preview: `The Infrastructure Health Component has been implemented and merged to main.

All acceptance criteria have been met:
- InfrastructureHealth component displays 3 status cards (Mayor, Deacon, Refinery)
- AgentCard has new "compact" variant for minimal status-only display
- Shows agent state (idle/working/stuck/paused) with appropriate color
- Shows what agent is working on (hook_bead) if working
- Gracefully handles missing agents (show "Not Running" state)
- Storybook stories for InfrastructureHealth and AgentCard compact variant

The merge request has been submitted to the Refinery for processing.`,
    },
  },
}

export const FromDeacon: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-005',
      from: 'deacon',
      subject: 'Work scheduled for polecat/rictus',
      preview: 'to-c133.6: Mail Stream UI Components has been assigned to your hook.',
    },
  },
}

export const FromMayor: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-006',
      from: 'mayor',
      subject: 'Epic to-c133 progress update',
      preview: 'Town Operations Center epic is now 40% complete. 4 of 10 tasks have been closed.',
    },
  },
}

export const FromRefinery: Story = {
  args: {
    mail: {
      ...mockMail,
      id: 'mail-007',
      from: 'refinery',
      subject: 'Merge request to-ohwg processed',
      preview: 'Your merge request has been successfully merged to main. The convoy is continuing.',
    },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="divide-y divide-border/50">
      <MailItem
        mail={{
          id: 'mail-v1',
          from: 'witness',
          subject: 'Unread message from witness',
          preview: 'This is an unread message preview.',
          timestamp: '2026-01-21T15:30:00Z',
          read: false,
        }}
      />
      <MailItem
        mail={{
          id: 'mail-v2',
          from: 'deacon',
          subject: 'Read message from deacon',
          preview: 'This is a read message preview.',
          timestamp: '2026-01-21T14:00:00Z',
          read: true,
        }}
      />
      <MailItem
        mail={{
          id: 'mail-v3',
          from: 'refinery',
          subject: 'Another unread message',
          preview: 'This is another unread message preview.',
          timestamp: '2026-01-21T12:30:00Z',
          read: false,
        }}
      />
    </div>
  ),
}
