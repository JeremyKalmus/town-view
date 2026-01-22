/**
 * Returns the icon for an agent state.
 */
export function getAgentStateIcon(state: string): string {
  switch (state) {
    case 'idle':
      return '○'
    case 'working':
      return '◉'
    case 'stuck':
      return '⚠'
    case 'paused':
      return '❚❚'
    default:
      return '○'
  }
}

/**
 * Returns the CSS class for an agent state.
 */
export function getAgentStateClass(state: string): string {
  switch (state) {
    case 'idle':
      return 'text-text-muted'
    case 'working':
      return 'text-status-in-progress'
    case 'stuck':
      return 'text-status-blocked'
    case 'paused':
      return 'text-status-deferred'
    default:
      return 'text-text-muted'
  }
}

/**
 * Returns the background class for an agent state indicator.
 */
export function getAgentStateBgClass(state: string): string {
  switch (state) {
    case 'idle':
      return 'bg-text-muted/20'
    case 'working':
      return 'bg-status-in-progress/20'
    case 'stuck':
      return 'bg-status-blocked/20'
    case 'paused':
      return 'bg-status-deferred/20'
    default:
      return 'bg-text-muted/20'
  }
}

/**
 * Returns the icon for an agent role type.
 */
export function getAgentRoleIcon(roleType: string): string {
  switch (roleType) {
    case 'witness':
      return '👁'
    case 'refinery':
      return '⚙'
    case 'crew':
      return '👥'
    case 'polecat':
      return '🏎'
    case 'deacon':
      return '📋'
    case 'mayor':
      return '🏛'
    default:
      return '⚡'
  }
}
