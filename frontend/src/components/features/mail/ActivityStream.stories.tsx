import type { Meta, StoryObj } from '@storybook/react'
import { ActivityStream } from './ActivityStream'
import type { Mail } from '@/types'

const mockMessages: Mail[] = [
  {
    id: 'mail-001',
    from: 'witness',
    subject: 'Polecat rictus completed to-c133.3',
    preview: 'The Infrastructure Health Component has been implemented and merged to main.',
    timestamp: '2026-01-21T15:30:00Z',
    read: false,
  },
  {
    id: 'mail-002',
    from: 'deacon',
    subject: 'Work scheduled for polecat/rictus',
    preview: 'to-c133.6: Mail Stream UI Components has been assigned to your hook.',
    timestamp: '2026-01-21T15:25:00Z',
    read: false,
  },
  {
    id: 'mail-003',
    from: 'refinery',
    subject: 'Merge request to-ohwg processed',
    preview: 'Your merge request has been successfully merged to main.',
    timestamp: '2026-01-21T15:20:00Z',
    read: true,
  },
  {
    id: 'mail-004',
    from: 'mayor',
    subject: 'Epic to-c133 progress update',
    preview: 'Town Operations Center epic is now 40% complete.',
    timestamp: '2026-01-21T14:00:00Z',
    read: true,
  },
  {
    id: 'mail-005',
    from: 'witness',
    subject: 'Polecat emma completed to-l15.2',
    preview: 'The Authentication Flow task has been completed.',
    timestamp: '2026-01-21T12:30:00Z',
    read: true,
  },
]

const meta: Meta<typeof ActivityStream> = {
  title: 'Features/Mail/ActivityStream',
  component: ActivityStream,
  tags: ['autodocs'],
  argTypes: {
    onLoadMore: { action: 'load more' },
    onMailClick: { action: 'mail clicked' },
    onMarkAllAsRead: { action: 'mark all as read' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ActivityStream>

export const Default: Story = {
  args: {
    messages: mockMessages,
    unreadCount: 2,
  },
}

export const AllUnread: Story = {
  args: {
    messages: mockMessages.map((m) => ({ ...m, read: false })),
    unreadCount: 5,
  },
}

export const AllRead: Story = {
  args: {
    messages: mockMessages.map((m) => ({ ...m, read: true })),
    unreadCount: 0,
  },
}

export const Empty: Story = {
  args: {
    messages: [],
    unreadCount: 0,
  },
}

export const Loading: Story = {
  args: {
    messages: [],
    loading: true,
    unreadCount: 0,
  },
}

export const WithError: Story = {
  args: {
    messages: [],
    error: 'Failed to load messages. Please try again.',
    unreadCount: 0,
  },
}

export const WithMoreToLoad: Story = {
  args: {
    messages: mockMessages,
    unreadCount: 2,
    hasMore: true,
  },
}

export const LoadingMore: Story = {
  args: {
    messages: mockMessages,
    unreadCount: 2,
    hasMore: true,
    loading: true,
  },
}

export const ManyMessages: Story = {
  args: {
    messages: Array.from({ length: 20 }, (_, i) => ({
      id: `mail-${i + 1}`,
      from: ['witness', 'deacon', 'refinery', 'mayor'][i % 4],
      subject: `Message ${i + 1}: ${['Task completed', 'Work scheduled', 'MR merged', 'Progress update'][i % 4]}`,
      preview: `This is the preview text for message ${i + 1}.`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      read: i > 5,
    })),
    unreadCount: 6,
    hasMore: true,
  },
}
