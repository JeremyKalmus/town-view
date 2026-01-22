/**
 * Returns the CSS class for a priority level.
 */
export function getPriorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'priority-p0'
    case 1:
      return 'priority-p1'
    case 2:
      return 'priority-p2'
    case 3:
      return 'priority-p3'
    case 4:
      return 'priority-p4'
    default:
      return 'priority-p2'
  }
}

/**
 * Returns the display label for a priority level.
 */
export function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

/**
 * Returns the CSS class for a priority badge.
 */
export function getPriorityBadgeClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'badge-priority-p0'
    case 1:
      return 'badge-priority-p1'
    case 2:
      return 'badge-priority-p2'
    case 3:
      return 'badge-priority-p3'
    case 4:
      return 'badge-priority-p4'
    default:
      return 'badge-priority-p2'
  }
}

/**
 * Returns the CSS class for priority-based border coloring on tree nodes.
 */
export function getPriorityBorderClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'border-l-priority-p0'
    case 1:
      return 'border-l-priority-p1'
    case 2:
      return 'border-l-priority-p2'
    case 3:
      return 'border-l-priority-p3'
    case 4:
      return 'border-l-priority-p4'
    default:
      return 'border-l-priority-p2'
  }
}

/**
 * Returns the CSS class for priority text color.
 */
export function getPriorityColorClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'text-priority-p0'
    case 1:
      return 'text-priority-p1'
    case 2:
      return 'text-priority-p2'
    case 3:
      return 'text-priority-p3'
    case 4:
      return 'text-priority-p4'
    default:
      return 'text-priority-p2'
  }
}

/**
 * Returns the CSS class for tree node priority styling.
 */
export function getTreeNodePriorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'tree-node-priority-p0'
    case 1:
      return 'tree-node-priority-p1'
    case 2:
      return 'tree-node-priority-p2'
    case 3:
      return 'tree-node-priority-p3'
    case 4:
      return 'tree-node-priority-p4'
    default:
      return 'tree-node-priority-p2'
  }
}
