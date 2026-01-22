import { useMemo, useState } from 'react'
import type { Issue } from '@/types'
import { cn } from '@/lib/class-utils'
import { getStatusIcon } from '@/lib/status-utils'
import { buildTree } from '@/lib/tree'
import type { TreeNode } from '@/lib/tree'

interface ConvoyTreeViewProps {
  /** The convoy (epic) to display as root */
  convoy: Issue
  /** All issues (used to build hierarchy) */
  allIssues: Issue[]
  /** Optional class name */
  className?: string
}

/**
 * Format duration in a human-readable way
 */
function formatDuration(ms: number): string {
  if (ms < 0) return '—'

  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

/**
 * Calculate duration from created to closed
 */
function calculateDuration(issue: Issue): number {
  if (!issue.closed_at || !issue.created_at) return -1
  return new Date(issue.closed_at).getTime() - new Date(issue.created_at).getTime()
}

interface ConvoyNodeProps {
  node: TreeNode
  depth?: number
  defaultExpanded?: boolean
}

function ConvoyNode({ node, depth = 0, defaultExpanded = true }: ConvoyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { issue } = node
  const hasChildren = node.children.length > 0

  const duration = calculateDuration(issue)
  const isClosed = issue.status === 'closed'

  // Count closed children for progress display
  const progress = useMemo(() => {
    if (!hasChildren) return null
    const countDescendants = (nodes: TreeNode[]): { closed: number; total: number } => {
      let closed = 0
      let total = 0
      for (const n of nodes) {
        total += 1
        if (n.issue.status === 'closed') closed += 1
        if (n.children.length > 0) {
          const childProgress = countDescendants(n.children)
          closed += childProgress.closed
          total += childProgress.total
        }
      }
      return { closed, total }
    }
    return countDescendants(node.children)
  }, [hasChildren, node.children])

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-3 py-2 px-3 -mx-2 rounded-md',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary',
          depth === 0 && 'bg-bg-tertiary/30 border border-border mb-1'
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-5 h-5 flex items-center justify-center',
            'text-text-muted hover:text-text-primary',
            'transition-transform duration-200',
            !hasChildren && 'invisible'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Status icon */}
        <span
          className={cn(
            'text-lg flex-shrink-0',
            isClosed ? 'text-status-closed' : 'text-status-open'
          )}
        >
          {getStatusIcon(issue.status)}
        </span>

        {/* Issue ID */}
        <span className="mono text-xs text-text-muted flex-shrink-0 w-20">
          {issue.id}
        </span>

        {/* Title */}
        <span className={cn(
          'flex-1 truncate',
          isClosed ? 'text-text-primary' : 'text-text-secondary'
        )}>
          {issue.title}
        </span>

        {/* Progress for parent nodes */}
        {progress && (
          <span
            className={cn(
              'flex-shrink-0 text-xs px-1.5 py-0.5 rounded',
              progress.closed === progress.total
                ? 'bg-status-closed/10 text-status-closed'
                : 'bg-bg-tertiary text-text-secondary'
            )}
            title={`${progress.closed} of ${progress.total} completed`}
          >
            {progress.closed}/{progress.total}
          </span>
        )}

        {/* Assignee */}
        {issue.assignee && (
          <span className="text-xs text-text-secondary flex-shrink-0 max-w-[120px] truncate">
            {issue.assignee.split('/').pop()}
          </span>
        )}

        {/* Duration */}
        {isClosed && duration >= 0 && (
          <span className="text-xs text-text-muted flex-shrink-0 w-16 text-right">
            {formatDuration(duration)}
          </span>
        )}

        {/* Close reason */}
        {issue.close_reason && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded flex-shrink-0',
              issue.close_reason === 'completed'
                ? 'bg-status-closed/10 text-status-closed'
                : issue.close_reason === 'wontfix'
                  ? 'bg-status-deferred/10 text-status-deferred'
                  : 'bg-bg-tertiary text-text-muted'
            )}
          >
            {issue.close_reason}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Connection line */}
          <div
            className="absolute left-0 top-0 bottom-4 border-l border-dotted border-border"
            style={{ marginLeft: `${depth * 24 + 22}px` }}
          />
          {/* Child nodes - sorted by closed_at */}
          {node.children
            .slice()
            .sort((a, b) => {
              const aTime = a.issue.closed_at ? new Date(a.issue.closed_at).getTime() : 0
              const bTime = b.issue.closed_at ? new Date(b.issue.closed_at).getTime() : 0
              return aTime - bTime
            })
            .map((child) => (
              <ConvoyNode
                key={child.issue.id}
                node={child}
                depth={depth + 1}
                defaultExpanded={defaultExpanded}
              />
            ))}
        </div>
      )}
    </div>
  )
}

/**
 * ConvoyTreeView - Displays a convoy (epic) with its children in hierarchical tree format.
 * Shows completion status, assignee, duration, and close_reason for each node.
 */
export function ConvoyTreeView({ convoy, allIssues, className }: ConvoyTreeViewProps) {
  // Build tree from all issues, then find the convoy node
  const convoyTree = useMemo(() => {
    // Get convoy and its descendants
    const prefix = convoy.id + '.'
    const descendants = allIssues.filter(
      (issue) => issue.id === convoy.id || issue.id.startsWith(prefix)
    )

    // Build tree structure
    const trees = buildTree(descendants)

    // Find the convoy in the trees (it should be a root)
    const convoyNode = trees.find((t) => t.issue.id === convoy.id)

    // If not found as root, create a node with descendants as children
    if (!convoyNode) {
      const childIssues = descendants.filter((d) => d.id !== convoy.id)
      const childTrees = buildTree(childIssues)
      return {
        issue: convoy,
        children: childTrees,
        depth: 0,
      } as TreeNode
    }

    return convoyNode
  }, [convoy, allIssues])

  if (!convoyTree) {
    return (
      <div className={cn('py-8 text-center text-text-muted', className)}>
        No data available for this convoy
      </div>
    )
  }

  return (
    <div className={cn('py-2', className)}>
      <ConvoyNode node={convoyTree} depth={0} defaultExpanded={true} />
    </div>
  )
}
