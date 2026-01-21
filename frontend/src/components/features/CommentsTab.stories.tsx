import type { Meta, StoryObj } from '@storybook/react'
import { CommentsTab } from './CommentsTab'
import type { Comment } from '@/types'

const mockComments: Comment[] = [
  {
    id: 1,
    issue_id: 'to-123',
    author: 'townview/crew/jeremy',
    text: 'Initial implementation looks good. Ready for review.',
    created_at: '2026-01-20T10:30:00Z',
  },
  {
    id: 2,
    issue_id: 'to-123',
    author: 'townview/polecats/furiosa',
    text: 'Found a few edge cases we should handle:\n- Empty state\n- Long text overflow\n- Special characters',
    created_at: '2026-01-20T14:15:00Z',
  },
  {
    id: 3,
    issue_id: 'to-123',
    author: 'townview/polecats/toast',
    text: 'Fixed the edge cases. Added unit tests for each scenario.',
    created_at: '2026-01-20T16:45:00Z',
  },
]

const recentComments: Comment[] = [
  {
    id: 1,
    issue_id: 'to-456',
    author: 'townview/witness/eye',
    text: 'This was just posted',
    created_at: new Date().toISOString(),
  },
]

const meta: Meta<typeof CommentsTab> = {
  title: 'Features/CommentsTab',
  component: CommentsTab,
  tags: ['autodocs'],
  argTypes: {
    onAddComment: { action: 'comment added' },
  },
  decorators: [
    (Story) => (
      <div className="w-96 h-[500px] bg-bg-secondary rounded-lg overflow-hidden border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof CommentsTab>

export const Default: Story = {
  args: {
    issueId: 'to-123',
    comments: mockComments,
  },
}

export const Empty: Story = {
  args: {
    issueId: 'to-789',
    comments: [],
  },
}

export const Loading: Story = {
  args: {
    issueId: 'to-456',
    comments: [],
    isLoading: true,
  },
}

export const Submitting: Story = {
  args: {
    issueId: 'to-123',
    comments: mockComments,
    isSubmitting: true,
  },
}

export const RecentComment: Story = {
  args: {
    issueId: 'to-456',
    comments: recentComments,
  },
}

export const LongComments: Story = {
  args: {
    issueId: 'to-long',
    comments: [
      {
        id: 1,
        issue_id: 'to-long',
        author: 'townview/crew/verbose',
        text: 'This is a very long comment that tests how the component handles extended text content. It includes multiple lines and detailed explanations.\n\nThe implementation should properly wrap text and handle whitespace formatting. We want to ensure that:\n\n1. Line breaks are preserved\n2. Long words wrap correctly\n3. The layout remains clean\n\nAdditional notes about the implementation go here with more details about edge cases and specific behaviors we need to handle.',
        created_at: '2026-01-19T08:00:00Z',
      },
      {
        id: 2,
        issue_id: 'to-long',
        author: 'a-very-long-author-path/nested/deeply/user',
        text: 'Short reply with a very long author name to test truncation.',
        created_at: '2026-01-19T09:30:00Z',
      },
    ],
  },
}

export const ManyComments: Story = {
  args: {
    issueId: 'to-many',
    comments: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      issue_id: 'to-many',
      author: `townview/polecats/agent-${i + 1}`,
      text: `Comment number ${i + 1} with some content to fill the space.`,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    })),
  },
}
