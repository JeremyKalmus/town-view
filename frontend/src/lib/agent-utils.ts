import { createClassMapper } from './class-utils'

/**
 * Returns the icon for an agent state.
 */
export const getAgentStateIcon = createClassMapper<string>(
  {
    starting: '◐',
    running: '●',
    idle: '○',
    working: '◉',
    stuck: '⚠',
    stopping: '◔',
    stopped: '◯',
    paused: '❚❚',
  },
  '○'
)

/**
 * Returns the CSS class for an agent state text color.
 * Uses vibrant colors matching the state machine visualization.
 */
export const getAgentStateClass = createClassMapper<string>(
  {
    starting: 'text-yellow-400',
    running: 'text-green-400',
    idle: 'text-blue-400',
    working: 'text-amber-400',
    stuck: 'text-red-400',
    stopping: 'text-orange-400',
    stopped: 'text-gray-400',
    paused: 'text-purple-400',
  },
  'text-gray-400'
)

/**
 * Returns the background class for an agent state indicator.
 * Uses semi-transparent backgrounds for badges.
 */
export const getAgentStateBgClass = createClassMapper<string>(
  {
    starting: 'bg-yellow-500/20',
    running: 'bg-green-500/20',
    idle: 'bg-blue-500/20',
    working: 'bg-amber-500/20',
    stuck: 'bg-red-500/20',
    stopping: 'bg-orange-500/20',
    stopped: 'bg-gray-500/20',
    paused: 'bg-purple-500/20',
  },
  'bg-gray-500/20'
)

/**
 * Returns the border class for an agent state badge.
 * Provides visual distinction with matching border colors.
 */
export const getAgentStateBorderClass = createClassMapper<string>(
  {
    starting: 'border border-yellow-500/30',
    running: 'border border-green-500/30',
    idle: 'border border-blue-500/30',
    working: 'border border-amber-500/30',
    stuck: 'border border-red-500/30',
    stopping: 'border border-orange-500/30',
    stopped: 'border border-gray-500/30',
    paused: 'border border-purple-500/30',
  },
  'border border-gray-500/30'
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
