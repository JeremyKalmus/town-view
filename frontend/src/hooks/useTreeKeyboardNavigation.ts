import { useCallback, useEffect, useState, useRef } from 'react'
import type { TreeNode } from '@/types'

interface UseTreeKeyboardNavigationOptions {
  nodes: TreeNode[]
  onSelect?: (nodeId: string) => void
  onExpand?: (nodeId: string) => void
  onCollapse?: (nodeId: string) => void
  initialFocusedId?: string | null
  initialExpandedIds?: string[]
}

interface UseTreeKeyboardNavigationReturn {
  focusedId: string | null
  expandedIds: Set<string>
  setFocusedId: (id: string | null) => void
  toggleExpanded: (id: string) => void
  isExpanded: (id: string) => boolean
  getTreeProps: () => {
    role: 'tree'
    'aria-activedescendant': string | undefined
    tabIndex: number
    onKeyDown: (e: React.KeyboardEvent) => void
  }
  getNodeProps: (node: TreeNode) => {
    id: string
    role: 'treeitem'
    'aria-expanded': boolean | undefined
    'aria-level': number
    'aria-selected': boolean
    tabIndex: number
    onClick: () => void
    onDoubleClick: () => void
  }
}

/**
 * Flattens a tree into a list of visible nodes (respecting expanded state).
 */
function getVisibleNodes(
  nodes: TreeNode[],
  expandedIds: Set<string>
): TreeNode[] {
  const result: TreeNode[] = []

  function traverse(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      result.push(node)
      if (node.children?.length && expandedIds.has(node.id)) {
        traverse(node.children)
      }
    }
  }

  traverse(nodes)
  return result
}

/**
 * Hook for tree keyboard navigation.
 * Implements WAI-ARIA tree pattern with:
 * - Arrow Up/Down: Move focus between visible items
 * - Arrow Left: Collapse current node or move to parent
 * - Arrow Right: Expand current node or move to first child
 * - Enter: Select/open the focused item
 * - Home: Move to first item
 * - End: Move to last visible item
 */
export function useTreeKeyboardNavigation(
  options: UseTreeKeyboardNavigationOptions
): UseTreeKeyboardNavigationReturn {
  const {
    nodes,
    onSelect,
    onExpand,
    onCollapse,
    initialFocusedId = null,
    initialExpandedIds = [],
  } = options

  const [focusedId, setFocusedId] = useState<string | null>(initialFocusedId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialExpandedIds)
  )

  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  )

  const toggleExpanded = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          onCollapse?.(id)
        } else {
          next.add(id)
          onExpand?.(id)
        }
        return next
      })
    },
    [onCollapse, onExpand]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const visibleNodes = getVisibleNodes(nodesRef.current, expandedIds)
      if (visibleNodes.length === 0) return

      const currentIndex = focusedId
        ? visibleNodes.findIndex((n) => n.id === focusedId)
        : -1
      const currentNode = currentIndex >= 0 ? visibleNodes[currentIndex] : null

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const nextIndex = Math.min(currentIndex + 1, visibleNodes.length - 1)
          setFocusedId(visibleNodes[nextIndex >= 0 ? nextIndex : 0].id)
          break
        }

        case 'ArrowUp': {
          e.preventDefault()
          const prevIndex = Math.max(currentIndex - 1, 0)
          setFocusedId(visibleNodes[prevIndex].id)
          break
        }

        case 'ArrowRight': {
          e.preventDefault()
          if (!currentNode) break
          const hasChildren = currentNode.children && currentNode.children.length > 0

          if (hasChildren && !expandedIds.has(currentNode.id)) {
            // Expand the node
            toggleExpanded(currentNode.id)
          } else if (hasChildren && expandedIds.has(currentNode.id)) {
            // Move to first child
            setFocusedId(currentNode.children![0].id)
          }
          break
        }

        case 'ArrowLeft': {
          e.preventDefault()
          if (!currentNode) break
          const hasChildren = currentNode.children && currentNode.children.length > 0

          if (hasChildren && expandedIds.has(currentNode.id)) {
            // Collapse the node
            toggleExpanded(currentNode.id)
          } else if (currentNode.parentId) {
            // Move to parent
            setFocusedId(currentNode.parentId)
          }
          break
        }

        case 'Enter':
        case ' ': {
          e.preventDefault()
          if (focusedId) {
            onSelect?.(focusedId)
          }
          break
        }

        case 'Home': {
          e.preventDefault()
          if (visibleNodes.length > 0) {
            setFocusedId(visibleNodes[0].id)
          }
          break
        }

        case 'End': {
          e.preventDefault()
          if (visibleNodes.length > 0) {
            setFocusedId(visibleNodes[visibleNodes.length - 1].id)
          }
          break
        }

        default:
          break
      }
    },
    [expandedIds, focusedId, onSelect, toggleExpanded]
  )

  // Auto-focus first item if nothing is focused
  useEffect(() => {
    if (focusedId === null && nodes.length > 0) {
      setFocusedId(nodes[0].id)
    }
  }, [focusedId, nodes])

  const getTreeProps = useCallback(
    () => ({
      role: 'tree' as const,
      'aria-activedescendant': focusedId ?? undefined,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
    }),
    [focusedId, handleKeyDown]
  )

  const getNodeProps = useCallback(
    (node: TreeNode) => {
      const hasChildren = node.children && node.children.length > 0
      const isFocused = node.id === focusedId

      return {
        id: `tree-node-${node.id}`,
        role: 'treeitem' as const,
        'aria-expanded': hasChildren ? expandedIds.has(node.id) : undefined,
        'aria-level': node.depth + 1,
        'aria-selected': isFocused,
        tabIndex: isFocused ? 0 : -1,
        onClick: () => {
          setFocusedId(node.id)
          if (hasChildren) {
            toggleExpanded(node.id)
          } else {
            onSelect?.(node.id)
          }
        },
        onDoubleClick: () => {
          onSelect?.(node.id)
        },
      }
    },
    [expandedIds, focusedId, onSelect, toggleExpanded]
  )

  return {
    focusedId,
    expandedIds,
    setFocusedId,
    toggleExpanded,
    isExpanded,
    getTreeProps,
    getNodeProps,
  }
}
