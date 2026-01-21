import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { Issue, TreeNode as TreeNodeType } from '@/types'
import { cn, getStatusIcon, getPriorityBadgeClass, getPriorityLabel } from '@/lib/utils'
import { VirtualList } from '@/components/ui/VirtualList'
import { useTreeKeyboardNavigation } from '@/hooks/useTreeKeyboardNavigation'

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

/**
 * Convert TreeNodeData to TreeNode format for keyboard navigation.
 * Recursively converts the tree structure.
 */
function treeNodeDataToTreeNodes(
  nodes: TreeNodeData[],
  depth: number = 0,
  parentId?: string
): TreeNodeType[] {
  return nodes.map((node) => ({
    id: node.issue.id,
    parentId,
    depth,
    children: node.children
      ? treeNodeDataToTreeNodes(node.children, depth + 1, node.issue.id)
      : undefined,
  }))
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
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
  /** ID of the currently focused node (for keyboard navigation) */
  focusedId?: string | null
  /** Callback to set focus on a node */
  onFocus?: (issueId: string) => void
  /** Set of expanded node IDs (controlled mode) */
  expandedIds?: Set<string>
  /** Callback to toggle expansion (controlled mode) */
  onToggleExpand?: (issueId: string) => void
  /** ID of the currently selected node (for click-based selection) */
  selectedId?: string | null
}

export function TreeNode({
  data,
  depth = 0,
  defaultExpanded = false,
  onNodeClick,
  onBlockerClick,
  showDescriptionPreview = false,
  updatedIssueIds,
  focusedId,
  onFocus,
  expandedIds,
  onToggleExpand,
  selectedId,
}: TreeNodeProps) {
  const [isExpandedLocal, setIsExpandedLocal] = useState(defaultExpanded)
  // Use controlled expansion if provided, otherwise local state
  const isExpanded = expandedIds !== undefined ? expandedIds.has(data.issue.id) : isExpandedLocal
  // Compute if this node is focused (keyboard) or selected (click)
  const isFocused = focusedId === data.issue.id
  const isSelected = selectedId === data.issue.id
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [childrenHeight, setChildrenHeight] = useState<number | undefined>(undefined)
  const childrenRef = useRef<HTMLDivElement>(null)

  const hasChildren = data.children && data.children.length > 0
  const isUpdated = updatedIssueIds?.has(data.issue.id) ?? false

  // Measure children height for animation
  useEffect(() => {
    if (childrenRef.current) {
      setChildrenHeight(childrenRef.current.scrollHeight)
    }
  }, [data.children, isExpanded])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      if (expandedIds !== undefined && onToggleExpand) {
        onToggleExpand(data.issue.id)
      } else {
        setIsExpandedLocal(!isExpanded)
      }
    }
  }

  const handleNodeClick = () => {
    onFocus?.(data.issue.id)
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

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        id={`tree-node-${data.issue.id}`}
        className={cn(
          'flex items-center gap-2 py-2 px-2 -mx-2 rounded-md',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary cursor-pointer',
          'group',
          isUpdated && 'animate-flash-update bg-accent-rust/10',
          (isSelected || isFocused) && 'ring-2 ring-accent-rust ring-offset-1 ring-offset-bg-primary bg-bg-tertiary'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleNodeClick}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-selected={isFocused}
        tabIndex={isFocused ? 0 : -1}
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
                updatedIssueIds={updatedIssueIds}
                focusedId={focusedId}
                onFocus={onFocus}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                selectedId={selectedId}
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
  /** Set of issue IDs that were recently updated (for flash animation) */
  updatedIssueIds?: Set<string>
  /** Enable keyboard navigation */
  enableKeyboardNavigation?: boolean
  /** ID of the currently selected node (for click-based selection) */
  selectedId?: string | null
}

export function TreeView({
  nodes,
  defaultExpanded = false,
  onNodeClick,
  onBlockerClick,
  showDescriptionPreview = false,
  className,
  updatedIssueIds,
  enableKeyboardNavigation = true,
  selectedId,
}: TreeViewProps) {
  // Convert TreeNodeData to TreeNode format for keyboard navigation
  const treeNodes = useMemo(
    () => treeNodeDataToTreeNodes(nodes),
    [nodes]
  )

  // Get all paths for default expansion
  const initialExpandedIds = useMemo(() => {
    if (!defaultExpanded) return []
    const getAllIds = (data: TreeNodeData[]): string[] => {
      const ids: string[] = []
      for (const node of data) {
        ids.push(node.issue.id)
        if (node.children) {
          ids.push(...getAllIds(node.children))
        }
      }
      return ids
    }
    return getAllIds(nodes)
  }, [nodes, defaultExpanded])

  // Handle node selection
  const handleSelect = useCallback((nodeId: string) => {
    // Find the issue by ID
    const findIssue = (data: TreeNodeData[]): Issue | null => {
      for (const node of data) {
        if (node.issue.id === nodeId) return node.issue
        if (node.children) {
          const found = findIssue(node.children)
          if (found) return found
        }
      }
      return null
    }
    const issue = findIssue(nodes)
    if (issue) {
      onNodeClick?.(issue)
    }
  }, [nodes, onNodeClick])

  // Use keyboard navigation hook
  const {
    focusedId,
    expandedIds,
    setFocusedId,
    toggleExpanded,
    getTreeProps,
  } = useTreeKeyboardNavigation({
    nodes: treeNodes,
    onSelect: handleSelect,
    initialExpandedIds,
  })

  // Scroll focused node into view
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusedId && containerRef.current) {
      // Use getElementById to avoid issues with dots in IDs (e.g., to-c133.2)
      const focusedElement = document.getElementById(`tree-node-${focusedId}`)
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedId])

  const treeProps = enableKeyboardNavigation ? getTreeProps() : {}

  return (
    <div
      ref={containerRef}
      className={cn('py-2', className)}
      {...treeProps}
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.issue.id}
          data={node}
          depth={0}
          defaultExpanded={defaultExpanded}
          onNodeClick={onNodeClick}
          onBlockerClick={onBlockerClick}
          showDescriptionPreview={showDescriptionPreview}
          updatedIssueIds={updatedIssueIds}
          focusedId={enableKeyboardNavigation ? focusedId : undefined}
          onFocus={enableKeyboardNavigation ? setFocusedId : undefined}
          expandedIds={enableKeyboardNavigation ? expandedIds : undefined}
          onToggleExpand={enableKeyboardNavigation ? toggleExpanded : undefined}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}

/**
 * Count total nodes in a tree (including all nested children)
 */
export function countTreeNodes(nodes: TreeNodeData[]): number {
  let count = 0
  for (const node of nodes) {
    count += 1
    if (node.children) {
      count += countTreeNodes(node.children)
    }
  }
  return count
}

/** Flattened node for virtualized rendering */
export interface FlattenedNode {
  data: TreeNodeData
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  /** Path from root to this node (for tracking expansion) */
  path: string
}

/**
 * Flatten a tree structure into a linear list for virtualization.
 * Only includes visible nodes based on expansion state.
 */
export function flattenTree(
  nodes: TreeNodeData[],
  expandedPaths: Set<string>,
  depth: number = 0,
  parentPath: string = ''
): FlattenedNode[] {
  const result: FlattenedNode[] = []

  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.issue.id}` : node.issue.id
    const hasChildren = (node.children?.length ?? 0) > 0
    const isExpanded = expandedPaths.has(path)

    result.push({
      data: node,
      depth,
      hasChildren,
      isExpanded,
      path,
    })

    // Only include children if node is expanded
    if (hasChildren && isExpanded && node.children) {
      result.push(...flattenTree(node.children, expandedPaths, depth + 1, path))
    }
  }

  return result
}

/**
 * Get all paths for default expansion state
 */
export function getAllPaths(nodes: TreeNodeData[], parentPath: string = ''): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.issue.id}` : node.issue.id
    paths.push(path)
    if (node.children) {
      paths.push(...getAllPaths(node.children, path))
    }
  }
  return paths
}

/**
 * VirtualizedTreeView - Uses VirtualList for large trees (>100 items)
 * Renders only visible items for better performance.
 */
interface VirtualizedTreeViewProps {
  nodes: TreeNodeData[]
  defaultExpanded?: boolean
  onNodeClick?: (issue: Issue) => void
  onBlockerClick?: (blockerId: string) => void
  className?: string
  /** Height of the container (required for virtualization) */
  height?: string | number
  /** ID of the currently selected node (for click-based selection) */
  selectedId?: string | null
}

export function VirtualizedTreeView({
  nodes,
  defaultExpanded = false,
  onNodeClick,
  onBlockerClick,
  className,
  height = '100%',
  selectedId,
}: VirtualizedTreeViewProps) {
  // Track expanded paths
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(getAllPaths(nodes))
    }
    return new Set<string>()
  })

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(
    () => flattenTree(nodes, expandedPaths),
    [nodes, expandedPaths]
  )

  // Toggle expansion for a node
  const handleToggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Render a single flattened node
  const renderItem = (node: FlattenedNode) => {
    const { data, depth, hasChildren, isExpanded, path } = node
    const progress = calculateProgress(data)
    const showProgress = hasChildren && progress.total > 0
    const isSelected = selectedId === data.issue.id

    const statusBadgeClass = {
      open: 'bg-status-open/20 text-status-open border-status-open/30',
      in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
      blocked: 'bg-status-blocked/20 text-status-blocked border-status-blocked/30',
      closed: 'bg-status-closed/20 text-status-closed border-status-closed/30',
      deferred: 'bg-status-deferred/20 text-status-deferred border-status-deferred/30',
      tombstone: 'bg-bg-tertiary text-text-muted border-border',
    }[data.issue.status] || 'bg-status-open/20 text-status-open border-status-open/30'

    return (
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-md h-full',
          'transition-colors duration-100',
          'hover:bg-bg-tertiary cursor-pointer',
          'group',
          isSelected && 'ring-2 ring-accent-rust ring-offset-1 ring-offset-bg-primary bg-bg-tertiary'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onNodeClick?.(data.issue)}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggle(path)
          }}
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
      </div>
    )
  }

  return (
    <div className={cn('py-2', className)} style={{ height }}>
      <VirtualList
        items={flattenedNodes}
        itemHeight={40}
        renderItem={renderItem}
        getKey={(node: FlattenedNode) => node.path}
        className="h-full"
      />
    </div>
  )
}
