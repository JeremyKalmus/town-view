import { useState, useRef, useEffect } from 'react'
import type { Issue } from '@/types'
import { cn, getStatusIcon, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'

export interface TreeNodeData {
  issue: Issue
  children?: TreeNodeData[]
}

interface TreeNodeProps {
  data: TreeNodeData
  depth?: number
  defaultExpanded?: boolean
  onNodeClick?: (issue: Issue) => void
}

export function TreeNode({
  data,
  depth = 0,
  defaultExpanded = false,
  onNodeClick,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
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

  const statusBadgeClass = {
    open: 'bg-status-open/20 text-status-open border-status-open/30',
    in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
    blocked: 'bg-status-blocked/20 text-status-blocked border-status-blocked/30',
    closed: 'bg-status-closed/20 text-status-closed border-status-closed/30',
    deferred: 'bg-status-deferred/20 text-status-deferred border-status-deferred/30',
    tombstone: 'bg-bg-tertiary text-text-muted border-border',
  }[data.issue.status] || 'bg-status-open/20 text-status-open border-status-open/30'

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 -mx-2 rounded-md',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary cursor-pointer',
          'group'
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

        {/* Type badge */}
        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {data.issue.issue_type}
        </span>
      </div>

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
  className?: string
}

export function TreeView({ nodes, defaultExpanded = false, onNodeClick, className }: TreeViewProps) {
  return (
    <div className={cn('py-2', className)}>
      {nodes.map((node) => (
        <TreeNode
          key={node.issue.id}
          data={node}
          depth={0}
          defaultExpanded={defaultExpanded}
          onNodeClick={onNodeClick}
        />
      ))}
    </div>
  )
}
