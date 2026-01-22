import { useCallback, useMemo, useState, useEffect } from 'react'
import type { Issue } from '@/types'
import { cn } from '@/lib/class-utils'

export interface AgentInfo {
  /** Full assignee path (e.g., 'townview/polecats/rictus') */
  fullPath: string
  /** Display name (e.g., 'rictus') */
  name: string
  /** Role type (e.g., 'polecat') */
  role: string
  /** Number of completed items */
  count: number
}

export interface AgentFilterProps {
  /** Closed issues to extract agents from */
  closedIssues: Issue[]
  /** Currently selected agent path */
  selectedAgent: string | null
  /** Called when an agent is selected or cleared */
  onSelect: (agent: string | null) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Parses an assignee path into components.
 * e.g., 'townview/polecats/rictus' -> { name: 'rictus', role: 'polecat' }
 */
function parseAssignee(assignee: string): { name: string; role: string } {
  const parts = assignee.split('/')
  // Typical format: rig/role-plural/name (e.g., townview/polecats/rictus)
  if (parts.length >= 3) {
    const rolePart = parts[parts.length - 2]
    const name = parts[parts.length - 1]
    // Convert plural role to singular (e.g., 'polecats' -> 'polecat')
    const role = rolePart.endsWith('s') ? rolePart.slice(0, -1) : rolePart
    return { name, role }
  }
  // Fallback: just use the last part as name
  return { name: parts[parts.length - 1] || assignee, role: 'unknown' }
}

/**
 * AgentFilter - Dropdown to filter completed work by agent.
 * Extracts unique assignees from closed issues and displays with completion counts.
 */
export function AgentFilter({
  closedIssues,
  selectedAgent,
  onSelect,
  className,
}: AgentFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Extract unique agents with completion counts
  const agents: AgentInfo[] = useMemo(() => {
    const agentMap = new Map<string, number>()

    for (const issue of closedIssues) {
      if (issue.assignee) {
        const count = agentMap.get(issue.assignee) ?? 0
        agentMap.set(issue.assignee, count + 1)
      }
    }

    const agentList: AgentInfo[] = []
    for (const [fullPath, count] of agentMap) {
      const { name, role } = parseAssignee(fullPath)
      agentList.push({ fullPath, name, role, count })
    }

    // Sort by count descending, then by name
    agentList.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name)
    })

    return agentList
  }, [closedIssues])

  // Find selected agent info
  const selectedAgentInfo = useMemo(() => {
    return agents.find((a) => a.fullPath === selectedAgent) ?? null
  }, [agents, selectedAgent])

  // Handle agent selection
  const handleSelect = useCallback(
    (agentPath: string) => {
      onSelect(agentPath)
      setIsOpen(false)
    },
    [onSelect]
  )

  // Handle clear selection
  const handleClear = useCallback(() => {
    onSelect(null)
    setIsOpen(false)
  }, [onSelect])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-agent-filter]')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectClass =
    'bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-rust hover:border-border-accent transition-colors cursor-pointer'

  // Don't render if no agents available
  if (agents.length === 0) {
    return null
  }

  return (
    <div className={cn('relative', className)} data-agent-filter>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-text-secondary">
          Filter by Agent
        </label>
        {selectedAgentInfo && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-rust/20 text-accent-rust">
            Active
          </span>
        )}
      </div>

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(selectClass, 'w-full flex items-center justify-between')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedAgentInfo ? (
            <>
              <span className="text-accent-rust">●</span>
              <span className="truncate">{selectedAgentInfo.name}</span>
              <span className="text-text-muted text-xs">
                ({selectedAgentInfo.role})
              </span>
              <span className="text-text-muted text-xs">
                · {selectedAgentInfo.count} completed
              </span>
            </>
          ) : (
            <span className="text-text-muted">All agents</span>
          )}
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-bg-secondary border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {/* Clear option (show all) */}
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors',
              'flex items-center gap-2 border-b border-border',
              !selectedAgent && 'bg-bg-tertiary border-l-2 border-l-accent-rust'
            )}
            role="option"
            aria-selected={!selectedAgent}
          >
            <span className="text-text-muted">○</span>
            <span className="flex-1">All agents</span>
            <span className="text-text-muted text-xs">
              {closedIssues.length} total
            </span>
          </button>

          {/* Agent list */}
          {agents.map((agent) => {
            const isSelected = agent.fullPath === selectedAgent

            return (
              <button
                key={agent.fullPath}
                type="button"
                onClick={() => handleSelect(agent.fullPath)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors',
                  'flex items-center gap-2',
                  isSelected && 'bg-bg-tertiary border-l-2 border-l-accent-rust'
                )}
                role="option"
                aria-selected={isSelected}
              >
                <span className={cn('flex-shrink-0', isSelected ? 'text-accent-rust' : 'text-text-muted')}>
                  {isSelected ? '●' : '○'}
                </span>
                <span className="truncate">{agent.name}</span>
                <span className="text-text-muted text-xs flex-shrink-0">
                  ({agent.role})
                </span>
                <span className="flex-1" />
                <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">
                  {agent.count}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
