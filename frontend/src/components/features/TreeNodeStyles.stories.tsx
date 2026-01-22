import type { Meta, StoryObj } from '@storybook/react'
import { cn, getTreeIndentClass } from '@/lib/class-utils'
import { getPriorityBadgeClass, getPriorityLabel, getTreeNodePriorityClass } from '@/lib/priority-utils'
import { getStatusIcon, getTreeStatusIconClass } from '@/lib/status-utils'

/**
 * Tree node styling demonstration component.
 * Shows how to use the tree node utilities and CSS classes.
 */
function TreeNodeDemo({
  title,
  status,
  priority,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
}: {
  title: string
  status: 'open' | 'in_progress' | 'blocked' | 'closed' | 'deferred'
  priority: number
  depth?: number
  hasChildren?: boolean
  isExpanded?: boolean
}) {
  return (
    <div
      className={cn(
        'tree-node-interactive tree-node-accent',
        getTreeNodePriorityClass(priority),
        getTreeIndentClass(depth)
      )}
    >
      {/* Expand/collapse indicator */}
      {hasChildren && (
        <span className="text-text-muted w-4 flex-shrink-0">
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
      {!hasChildren && <span className="w-4 flex-shrink-0" />}

      {/* Status icon */}
      <span className={getTreeStatusIconClass(status)}>
        {getStatusIcon(status)}
      </span>

      {/* Title */}
      <span className="flex-1 truncate">{title}</span>

      {/* Priority badge */}
      <span className={cn('flex-shrink-0', getPriorityBadgeClass(priority))}>
        {getPriorityLabel(priority)}
      </span>
    </div>
  )
}

const meta: Meta<typeof TreeNodeDemo> = {
  title: 'Features/TreeNodeStyles',
  component: TreeNodeDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Demonstrates tree node styling utilities for status icons and priority color coding.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl bg-bg-secondary p-4 rounded-lg">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TreeNodeDemo>

export const Open: Story = {
  args: {
    title: 'Open task example',
    status: 'open',
    priority: 2,
  },
}

export const InProgress: Story = {
  args: {
    title: 'Task in progress',
    status: 'in_progress',
    priority: 1,
  },
}

export const Blocked: Story = {
  args: {
    title: 'Blocked task - waiting for dependency',
    status: 'blocked',
    priority: 0,
  },
}

export const Closed: Story = {
  args: {
    title: 'Completed task',
    status: 'closed',
    priority: 3,
  },
}

export const Deferred: Story = {
  args: {
    title: 'Deferred to next sprint',
    status: 'deferred',
    priority: 4,
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="text-text-secondary text-xs mb-2">Status Icons: ○ open, ◐ in_progress, ● blocked, ✓ closed, ❄ deferred</div>
      {(['open', 'in_progress', 'blocked', 'closed', 'deferred'] as const).map((status) => (
        <TreeNodeDemo
          key={status}
          title={`${status.replace('_', ' ')} status example`}
          status={status}
          priority={2}
        />
      ))}
    </div>
  ),
}

export const AllPriorities: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="text-text-secondary text-xs mb-2">Priority Colors: P0=Red, P1=Orange, P2=Yellow, P3=Blue, P4=Gray</div>
      {[0, 1, 2, 3, 4].map((priority) => (
        <TreeNodeDemo
          key={priority}
          title={`Priority ${priority} task`}
          status="open"
          priority={priority}
        />
      ))}
    </div>
  ),
}

export const NestedHierarchy: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="text-text-secondary text-xs mb-2">Tree hierarchy with expand/collapse indicators</div>
      <TreeNodeDemo title="Epic: Authentication System" status="in_progress" priority={1} depth={0} hasChildren isExpanded />
      <TreeNodeDemo title="Story: Login Flow" status="in_progress" priority={1} depth={1} hasChildren isExpanded />
      <TreeNodeDemo title="Task: Create login form" status="closed" priority={2} depth={2} />
      <TreeNodeDemo title="Task: Add validation" status="in_progress" priority={2} depth={2} />
      <TreeNodeDemo title="Task: Handle errors" status="open" priority={2} depth={2} />
      <TreeNodeDemo title="Story: Password Reset" status="open" priority={2} depth={1} hasChildren />
      <TreeNodeDemo title="Bug: Session timeout" status="blocked" priority={0} depth={1} />
    </div>
  ),
}

export const DeepNesting: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="text-text-secondary text-xs mb-2">Indentation levels 0-5</div>
      {[0, 1, 2, 3, 4, 5].map((depth) => (
        <TreeNodeDemo
          key={depth}
          title={`Depth level ${depth}`}
          status="open"
          priority={2}
          depth={depth}
        />
      ))}
    </div>
  ),
}

export const StatusIconsReference: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-text-secondary text-sm font-medium mb-2">Status Icons Reference</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-text-muted">Status Icons</div>
          {(['open', 'in_progress', 'blocked', 'closed', 'deferred'] as const).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span className={cn('w-6 h-6 flex items-center justify-center rounded-full', getTreeStatusIconClass(status))}>
                {getStatusIcon(status)}
              </span>
              <span className="text-sm">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-xs text-text-muted">Priority Badges</div>
          {[0, 1, 2, 3, 4].map((priority) => (
            <div key={priority} className="flex items-center gap-2">
              <span className={getPriorityBadgeClass(priority)}>
                {getPriorityLabel(priority)}
              </span>
              <span className="text-sm">
                {priority === 0 ? 'Critical' : priority === 1 ? 'High' : priority === 2 ? 'Medium' : priority === 3 ? 'Low' : 'Minimal'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}
