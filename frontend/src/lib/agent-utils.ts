import { createClassMapper } from './class-utils'

/**
 * Returns the icon for an agent state.
 */
export const getAgentStateIcon = createClassMapper<string>(
  {
    idle: '○',
    working: '◉',
    stuck: '⚠',
    paused: '❚❚',
  },
  '○'
)

/**
 * Returns the CSS class for an agent state.
 */
export const getAgentStateClass = createClassMapper<string>(
  {
    idle: 'text-text-muted',
    working: 'text-status-in-progress',
    stuck: 'text-status-blocked',
    paused: 'text-status-deferred',
  },
  'text-text-muted'
)

/**
 * Returns the background class for an agent state indicator.
 */
export const getAgentStateBgClass = createClassMapper<string>(
  {
    idle: 'bg-text-muted/20',
    working: 'bg-status-in-progress/20',
    stuck: 'bg-status-blocked/20',
    paused: 'bg-status-deferred/20',
  },
  'bg-text-muted/20'
)

/**
 * Returns the icon for an agent role type.
 */
export const getAgentRoleIcon = createClassMapper<string>(
  {
    witness: '👁',
    refinery: '⚙',
    crew: '👥',
    polecat: '🏎',
    deacon: '📋',
    mayor: '🏛',
  },
  '⚡'
)
