import { useState, useRef, useEffect, useMemo } from 'react'
import type { Issue } from '@/types'
import { cn, getStatusIcon, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

/** Blocker info for displaying blocked-by indicator */
export interface BlockerInfo {
  id: string
  title?: string
}

export interface TreeNodeData {
  issue: Issue
  children?: TreeNodeData[]
  /** List of issues blocking this one */
  blockers?: BlockerInfo[]
}

/** Progress summary for a node with children */
interface ProgressSummary {
  completed: number
  total: number
}

/** Calculate progress (closed tasks) for a tree node and its descendants */
function calculateProgress(node: TreeNodeData): ProgressSummary {
  if (!node.children || node.children.length === 0) {
    return { completed: 0, total: 0 }
  }

  let completed = 0
  let total = 0

  for (const child of node.children) {
    total += 1
    if (child.issue.status === 'closed') {
      completed += 1
    }
    // Also count nested children
    const childProgress = calculateProgress(child)
    completed += childProgress.completed
    total += childProgress.total
  }

  return { completed, total }
}

interface TreeNodeProps {
  data: TreeNodeData
  depth?: number
  defaultExpanded?: boolean
  onNodeClick?: (issue: Issue) => void
  onBlockerClick?: (blockerId: string) => void
  showDescriptionPreview?: boolean
  /** ID of the currently focused node for keyboard navigation */
  focusedId?: string | null
}

export function TreeNode({
  data,
  depth = 0,
  defaultExpanded = false,
  onNodeClick,
  onBlockerClick,
  showDescriptionPreview = false,
  focusedId,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [childrenHeight, setChildrenHeight] = useState<number | undefined>(undefined)
  const childrenRef = useRef<HTMLDivElement>(null)

  const hasChildren = data.children && data.children.length > 0

  // Measure children height for animation
  useEffect(() => {
    if (childrenRef.current) {
      setChildrenHeight(childrenRef.current.scrollHeight)
    }
  }, [data.children, isExpanded])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleNodeClick = () => {
    onNodeClick?.(data.issue)
  }

  const handleDescriptionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDescriptionExpanded(!isDescriptionExpanded)
  }

  const hasDescription = data.issue.description && data.issue.description.trim().length > 0

  // Calculate progress for nodes with children
  const progress = useMemo(() => calculateProgress(data), [data])
  const showProgress = hasChildren && progress.total > 0

  const statusBadgeClass = {
    open: 'bg-status-open/20 text-status-open border-status-open/30',
    in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
    blocked: 'bg-status-blocked/20 text-status-blocked border-status-blocked/30',
    closed: 'bg-status-closed/20 text-status-closed border-status-closed/30',
    deferred: 'bg-status-deferred/20 text-status-deferred border-status-deferred/30',
    tombstone: 'bg-bg-tertiary text-text-muted border-border',
  }[data.issue.status] || 'bg-status-open/20 text-status-open border-status-open/30'

  const isFocused = focusedId === data.issue.id

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 -mx-2 rounded-md',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary cursor-pointer',
          'group',
          isFocused && 'bg-accent-rust/10 ring-1 ring-accent-rust/50'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleNodeClick}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={handleToggle}
          className={cn(
            'w-5 h-5 flex items-center justify-center',
            'text-text-muted hover:text-text-primary',
            'transition-transform duration-200',
            !hasChildren && 'invisible'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={hasChildren ? isExpanded : undefined}
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
        <span className={cn(
          'inline-flex items-center justify-center',
          'w-6 h-6 rounded-full border',
          'text-sm flex-shrink-0',
          statusBadgeClass
        )}>
          {getStatusIcon(data.issue.status)}
        </span>

        {/* Priority badge */}
        <span className={cn('w-7 flex-shrink-0 text-xs', getPriorityBadgeClass(data.issue.priority))}>
          {getPriorityLabel(data.issue.priority)}
        </span>

        {/* Issue ID */}
        <span className="mono text-text-muted text-xs w-20 flex-shrink-0 truncate">
          {data.issue.id}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-text-primary">
          {data.issue.title}
        </span>

        {/* Progress summary for parent nodes */}
        {showProgress && (
          <span
            className={cn(
              'flex-shrink-0 text-xs px-1.5 py-0.5 rounded',
              progress.completed === progress.total
                ? 'bg-status-closed/10 text-status-closed'
                : 'bg-bg-tertiary text-text-secondary'
            )}
            title={`${progress.completed} of ${progress.total} completed`}
          >
            {progress.completed}/{progress.total}
          </span>
        )}

        {/* Blocked-by indicator */}
        {data.blockers && data.blockers.length > 0 && (
          <span className="flex items-center gap-1 flex-shrink-0">
            {data.blockers.slice(0, 2).map((blocker) => (
              <button
                key={blocker.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onBlockerClick?.(blocker.id)
                }}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                  'bg-status-blocked/10 text-status-blocked border border-status-blocked/20',
                  'hover:bg-status-blocked/20 transition-colors',
                  'cursor-pointer'
                )}
                title={`Blocked by: ${blocker.title || blocker.id}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <span className="mono">{blocker.id}</span>
              </button>
            ))}
            {data.blockers.length > 2 && (
              <span className="text-xs text-status-blocked">
                +{data.blockers.length - 2}
              </span>
            )}
          </span>
        )}

        {/* Type badge */}
        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {data.issue.issue_type}
        </span>

        {/* Description toggle indicator */}
        {showDescriptionPreview && hasDescription && (
          <button
            onClick={handleDescriptionToggle}
            className={cn(
              'w-5 h-5 flex items-center justify-center flex-shrink-0',
              'text-text-muted hover:text-text-primary',
              'transition-colors duration-100'
            )}
            aria-label={isDescriptionExpanded ? 'Hide description' : 'Show description'}
            aria-expanded={isDescriptionExpanded}
          >
            <svg
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isDescriptionExpanded && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Description preview */}
      {showDescriptionPreview && hasDescription && (
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
            isDescriptionExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
          style={{ paddingLeft: `${depth * 20 + 52}px` }}
        >
          <div className="py-2 pr-4 text-sm text-text-secondary whitespace-pre-wrap">
            {data.issue.description}
          </div>
        </div>
      )}

      {/* Children container with animation */}
      {hasChildren && (
        <div
          ref={childrenRef}
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            maxHeight: isExpanded ? childrenHeight : 0,
          }}
        >
          <div className="relative">
            {/* Connection line */}
            <div
              className="absolute left-0 top-0 bottom-4 border-l border-dotted border-border"
              style={{ marginLeft: `${depth * 20 + 17}px` }}
            />
            {/* Child nodes */}
            {data.children!.map((child) => (
              <TreeNode
                key={child.issue.id}
                data={child}
                depth={depth + 1}
                defaultExpanded={defaultExpanded}
                onNodeClick={onNodeClick}
                onBlockerClick={onBlockerClick}
                showDescriptionPreview={showDescriptionPreview}
                focusedId={focusedId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Wrapper component for rendering a tree from root
interface TreeViewProps {
  nodes: TreeNodeData[]
  defaultExpanded?: boolean
  onNodeClick?: (issue: Issue) => void
  onBlockerClick?: (blockerId: string) => void
  showDescriptionPreview?: boolean
  className?: string
  /** ID of the currently focused node for keyboard navigation */
  focusedId?: string | null
}

export function TreeView({ nodes, defaultExpanded = false, onNodeClick, onBlockerClick, showDescriptionPreview = false, className, focusedId }: TreeViewProps) {
  return (
    <div className={cn('py-2', className)} role="tree" tabIndex={0}>
      {nodes.map((node) => (
        <TreeNode
          key={node.issue.id}
          data={node}
          depth={0}
          defaultExpanded={defaultExpanded}
          onNodeClick={onNodeClick}
          onBlockerClick={onBlockerClick}
          showDescriptionPreview={showDescriptionPreview}
          focusedId={focusedId}
        />
      ))}
    </div>
  )
}
