import { createClassMapper } from './class-utils'

/**
 * Returns the CSS class for a priority level.
 */
export const getPriorityClass = createClassMapper<number>(
  {
    0: 'priority-p0',
    1: 'priority-p1',
    2: 'priority-p2',
    3: 'priority-p3',
    4: 'priority-p4',
  },
  'priority-p2'
)

/**
 * Returns the display label for a priority level.
 */
export function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

/**
 * Returns the CSS class for a priority badge.
 */
export const getPriorityBadgeClass = createClassMapper<number>(
  {
    0: 'badge-priority-p0',
    1: 'badge-priority-p1',
    2: 'badge-priority-p2',
    3: 'badge-priority-p3',
    4: 'badge-priority-p4',
  },
  'badge-priority-p2'
)

/**
 * Returns the CSS class for priority-based border coloring on tree nodes.
 */
export const getPriorityBorderClass = createClassMapper<number>(
  {
    0: 'border-l-priority-p0',
    1: 'border-l-priority-p1',
    2: 'border-l-priority-p2',
    3: 'border-l-priority-p3',
    4: 'border-l-priority-p4',
  },
  'border-l-priority-p2'
)

/**
 * Returns the CSS class for priority text color.
 */
export const getPriorityColorClass = createClassMapper<number>(
  {
    0: 'text-priority-p0',
    1: 'text-priority-p1',
    2: 'text-priority-p2',
    3: 'text-priority-p3',
    4: 'text-priority-p4',
  },
  'text-priority-p2'
)

/**
 * Returns the CSS class for tree node priority styling.
 */
export const getTreeNodePriorityClass = createClassMapper<number>(
  {
    0: 'tree-node-priority-p0',
    1: 'tree-node-priority-p1',
    2: 'tree-node-priority-p2',
    3: 'tree-node-priority-p3',
    4: 'tree-node-priority-p4',
  },
  'tree-node-priority-p2'
)
