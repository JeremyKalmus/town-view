import type { Meta, StoryObj } from '@storybook/react'
import { TreeNode, TreeView, type TreeNodeData } from './TreeNode'
import type { Issue } from '@/types'

const createIssue = (
  id: string,
  title: string,
  type: Issue['issue_type'],
  status: Issue['status'],
  priority: number
): Issue => ({
  id,
  title,
  description: '',
  status,
  priority,
  issue_type: type,
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T14:30:00Z',
  dependency_count: 0,
  dependent_count: 0,
})

const mockTree: TreeNodeData[] = [
  {
    issue: createIssue('to-epic1', 'User Authentication System', 'epic', 'in_progress', 1),
    children: [
      {
        issue: createIssue('to-task1', 'Implement login flow', 'task', 'closed', 2),
      },
      {
        issue: createIssue('to-task2', 'Add OAuth providers', 'task', 'in_progress', 2),
        children: [
          {
            issue: createIssue('to-sub1', 'Google OAuth integration', 'task', 'closed', 3),
          },
          {
            issue: createIssue('to-sub2', 'GitHub OAuth integration', 'task', 'open', 3),
          },
          {
            issue: createIssue('to-sub3', 'Microsoft OAuth integration', 'task', 'deferred', 4),
          },
        ],
      },
      {
        issue: createIssue('to-task3', 'Session management', 'task', 'blocked', 2),
      },
    ],
  },
  {
    issue: createIssue('to-epic2', 'Dashboard Redesign', 'epic', 'open', 2),
    children: [
      {
        issue: createIssue('to-feat1', 'New metrics widgets', 'feature', 'open', 2),
      },
      {
        issue: createIssue('to-bug1', 'Fix chart rendering', 'bug', 'in_progress', 1),
      },
    ],
  },
]

const singleNode: TreeNodeData = {
  issue: createIssue('to-single', 'Single task without children', 'task', 'open', 2),
}

const deepTree: TreeNodeData = {
  issue: createIssue('to-root', 'Root Epic', 'epic', 'in_progress', 1),
  children: [
    {
      issue: createIssue('to-l1', 'Level 1 Task', 'task', 'in_progress', 2),
      children: [
        {
          issue: createIssue('to-l2', 'Level 2 Task', 'task', 'in_progress', 2),
          children: [
            {
              issue: createIssue('to-l3', 'Level 3 Task', 'task', 'in_progress', 3),
              children: [
                {
                  issue: createIssue('to-l4', 'Level 4 Task', 'task', 'open', 3),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const meta: Meta<typeof TreeView> = {
  title: 'Features/TreeNode',
  component: TreeView,
  tags: ['autodocs'],
  argTypes: {
    onNodeClick: { action: 'node clicked' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-bg-secondary p-4 rounded-lg">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TreeView>

export const Default: Story = {
  args: {
    nodes: mockTree,
  },
}

export const DefaultExpanded: Story = {
  args: {
    nodes: mockTree,
    defaultExpanded: true,
  },
}

export const SingleNode: Story = {
  args: {
    nodes: [singleNode],
  },
}

export const DeepNesting: Story = {
  args: {
    nodes: [deepTree],
    defaultExpanded: true,
  },
}

export const AllStatuses: Story = {
  args: {
    nodes: [
      {
        issue: createIssue('to-all', 'Status Examples', 'epic', 'in_progress', 1),
        children: [
          { issue: createIssue('to-open', 'Open task', 'task', 'open', 2) },
          { issue: createIssue('to-prog', 'In progress task', 'task', 'in_progress', 2) },
          { issue: createIssue('to-block', 'Blocked task', 'task', 'blocked', 1) },
          { issue: createIssue('to-close', 'Closed task', 'task', 'closed', 3) },
          { issue: createIssue('to-defer', 'Deferred task', 'task', 'deferred', 4) },
        ],
      },
    ],
    defaultExpanded: true,
  },
}

export const AllPriorities: Story = {
  args: {
    nodes: [
      {
        issue: createIssue('to-pri', 'Priority Examples', 'epic', 'open', 1),
        children: [
          { issue: createIssue('to-p0', 'P0 Critical', 'bug', 'blocked', 0) },
          { issue: createIssue('to-p1', 'P1 High', 'bug', 'in_progress', 1) },
          { issue: createIssue('to-p2', 'P2 Medium', 'task', 'open', 2) },
          { issue: createIssue('to-p3', 'P3 Low', 'task', 'open', 3) },
          { issue: createIssue('to-p4', 'P4 Minimal', 'chore', 'deferred', 4) },
        ],
      },
    ],
    defaultExpanded: true,
  },
}

export const SingleTreeNode: StoryObj<typeof TreeNode> = {
  render: () => (
    <TreeNode
      data={{
        issue: createIssue('to-single-demo', 'Individual TreeNode', 'task', 'open', 2),
        children: [
          { issue: createIssue('to-child1', 'First child', 'task', 'closed', 3) },
          { issue: createIssue('to-child2', 'Second child', 'task', 'open', 3) },
        ],
      }}
      defaultExpanded
      onNodeClick={(issue) => console.log('Clicked:', issue.id)}
    />
  ),
}
