import type { Issue, Dependency } from '@/types'

/**
 * A tree node wrapping an Issue with its children.
 */
export interface TreeNode {
  issue: Issue
  children: TreeNode[]
  depth: number
  isExpanded?: boolean
}

/**
 * Extracts the parent ID from a bead ID using dotted format.
 * Examples:
 *   "to-b1e.1" -> "to-b1e"
 *   "to-b1e.1.2" -> "to-b1e.1"
 *   "to-b1e" -> null (root level)
 */
export function getParentId(id: string): string | null {
  const lastDotIndex = id.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return null
  }
  return id.substring(0, lastDotIndex)
}

/**
 * Checks if an issue is a root node (has no parent in dotted format).
 */
export function isRootNode(id: string): boolean {
  return getParentId(id) === null
}

/**
 * Builds a tree structure from a flat list of issues.
 * Uses parent-child dependencies first, then falls back to dotted ID format.
 *
 * @param issues - Flat array of issues
 * @param dependencies - Optional array of dependencies (parent-child type used for hierarchy)
 * @returns Array of root TreeNodes with nested children
 */
export function buildTree(issues: Issue[], dependencies?: Dependency[]): TreeNode[] {
  // Create a map for quick lookup
  const issueMap = new Map<string, Issue>()
  const nodeMap = new Map<string, TreeNode>()

  // First pass: index all issues
  for (const issue of issues) {
    issueMap.set(issue.id, issue)
  }

  // Build parent lookup from dependencies (parent-child type)
  // In parent-child dependency: from_id is parent, to_id is child
  const parentFromDeps = new Map<string, string>()
  if (dependencies) {
    for (const dep of dependencies) {
      if (dep.type === 'parent-child') {
        parentFromDeps.set(dep.to_id, dep.from_id)
      }
    }
  }

  // Helper to get parent ID - prefer dependency-based, fall back to dotted ID
  const getParentForIssue = (id: string): string | null => {
    // First check dependencies
    const depParent = parentFromDeps.get(id)
    if (depParent && issueMap.has(depParent)) {
      return depParent
    }
    // Fall back to dotted ID format
    const dottedParent = getParentId(id)
    if (dottedParent && issueMap.has(dottedParent)) {
      return dottedParent
    }
    return null
  }

  // Helper to calculate depth based on parent chain
  const calculateDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0 // Prevent infinite loops
    visited.add(id)
    const parentId = getParentForIssue(id)
    if (!parentId) return 0
    return 1 + calculateDepth(parentId, visited)
  }

  // Second pass: create nodes with correct depths
  for (const issue of issues) {
    const depth = calculateDepth(issue.id)
    const node: TreeNode = {
      issue,
      children: [],
      depth,
      isExpanded: depth === 0, // Expand root nodes by default
    }
    nodeMap.set(issue.id, node)
  }

  // Third pass: build tree structure
  const roots: TreeNode[] = []

  for (const issue of issues) {
    const node = nodeMap.get(issue.id)!
    const parentId = getParentForIssue(issue.id)

    if (parentId === null) {
      // Root node
      roots.push(node)
    } else {
      // Find parent node
      const parentNode = nodeMap.get(parentId)
      if (parentNode) {
        parentNode.children.push(node)
      } else {
        // Parent not in the list, treat as orphan root
        roots.push(node)
      }
    }
  }

  // Sort children by ID for consistent ordering
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.issue.id.localeCompare(b.issue.id))
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children)
      }
    }
  }
  sortChildren(roots)
  roots.sort((a, b) => a.issue.id.localeCompare(b.issue.id))

  return roots
}

/**
 * Gets direct children of an issue by ID.
 *
 * @param issues - Flat array of issues
 * @param parentId - ID of the parent issue
 * @returns Array of child issues
 */
export function getChildren(issues: Issue[], parentId: string): Issue[] {
  return issues.filter((issue) => getParentId(issue.id) === parentId)
}

/**
 * Gets all ancestors of an issue, from immediate parent to root.
 *
 * @param issues - Flat array of issues
 * @param id - ID of the issue to find ancestors for
 * @returns Array of ancestor issues, from immediate parent to root
 */
export function getAncestors(issues: Issue[], id: string): Issue[] {
  const issueMap = new Map<string, Issue>()
  for (const issue of issues) {
    issueMap.set(issue.id, issue)
  }

  const ancestors: Issue[] = []
  let currentId: string | null = getParentId(id)

  while (currentId !== null) {
    const ancestor = issueMap.get(currentId)
    if (ancestor) {
      ancestors.push(ancestor)
    }
    currentId = getParentId(currentId)
  }

  return ancestors
}

/**
 * Gets all descendants of an issue (children, grandchildren, etc.).
 *
 * @param issues - Flat array of issues
 * @param parentId - ID of the parent issue
 * @returns Array of all descendant issues
 */
export function getDescendants(issues: Issue[], parentId: string): Issue[] {
  const prefix = parentId + '.'
  return issues.filter((issue) => issue.id.startsWith(prefix))
}

/**
 * Finds a node in the tree by issue ID.
 *
 * @param nodes - Array of tree nodes to search
 * @param id - Issue ID to find
 * @returns The TreeNode if found, undefined otherwise
 */
export function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.issue.id === id) {
      return node
    }
    const found = findNode(node.children, id)
    if (found) {
      return found
    }
  }
  return undefined
}

/**
 * Flattens a tree into a visible list (respecting expanded state).
 * Useful for rendering the tree as a flat list with indentation.
 *
 * @param nodes - Array of tree nodes
 * @returns Flat array of visible nodes
 */
export function flattenVisibleNodes(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []

  function traverse(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      result.push(node)
      if (node.isExpanded && node.children.length > 0) {
        traverse(node.children)
      }
    }
  }

  traverse(nodes)
  return result
}

/**
 * Toggles the expanded state of a node in the tree.
 * Returns a new tree with the updated state (immutable).
 *
 * @param nodes - Array of tree nodes
 * @param id - Issue ID to toggle
 * @returns New tree with updated expanded state
 */
export function toggleNodeExpanded(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes.map((node) => {
    if (node.issue.id === id) {
      return { ...node, isExpanded: !node.isExpanded }
    }
    if (node.children.length > 0) {
      return { ...node, children: toggleNodeExpanded(node.children, id) }
    }
    return node
  })
}

/**
 * Expands all nodes in the tree up to the specified node.
 * Useful for revealing a specific node in the tree.
 *
 * @param nodes - Array of tree nodes
 * @param id - Issue ID to expand path to
 * @returns New tree with ancestors expanded
 */
export function expandToNode(nodes: TreeNode[], id: string): TreeNode[] {
  // Get all ancestor IDs that need to be expanded
  const ancestorIds = new Set<string>()
  let currentId: string | null = getParentId(id)
  while (currentId !== null) {
    ancestorIds.add(currentId)
    currentId = getParentId(currentId)
  }

  function expandNodes(nodeList: TreeNode[]): TreeNode[] {
    return nodeList.map((node) => {
      const shouldExpand = ancestorIds.has(node.issue.id)
      const newChildren =
        node.children.length > 0 ? expandNodes(node.children) : node.children
      if (shouldExpand || newChildren !== node.children) {
        return {
          ...node,
          isExpanded: shouldExpand ? true : node.isExpanded,
          children: newChildren,
        }
      }
      return node
    })
  }

  return expandNodes(nodes)
}

/**
 * Counts total nodes in the tree (including nested).
 *
 * @param nodes - Array of tree nodes
 * @returns Total count of nodes
 */
export function countNodes(nodes: TreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    count += 1 + countNodes(node.children)
  }
  return count
}

/**
 * Gets the sibling issues (same parent) of an issue.
 *
 * @param issues - Flat array of issues
 * @param id - Issue ID to find siblings for
 * @returns Array of sibling issues (excluding the issue itself)
 */
export function getSiblings(issues: Issue[], id: string): Issue[] {
  const parentId = getParentId(id)
  return issues.filter(
    (issue) => issue.id !== id && getParentId(issue.id) === parentId
  )
}
