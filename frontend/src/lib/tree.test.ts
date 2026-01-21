import { describe, it, expect } from 'vitest'
import type { Issue } from '@/types'
import {
  getParentId,
  isRootNode,
  buildTree,
  getChildren,
  getAncestors,
  getDescendants,
  findNode,
  flattenVisibleNodes,
  toggleNodeExpanded,
  expandToNode,
  countNodes,
  getSiblings,
} from './tree'

// Helper to create test issues
function createIssue(id: string, title: string): Issue {
  return {
    id,
    title,
    description: '',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    dependency_count: 0,
    dependent_count: 0,
  }
}

describe('getParentId', () => {
  it('returns null for root-level IDs', () => {
    expect(getParentId('to-abc')).toBeNull()
    expect(getParentId('proj-123')).toBeNull()
  })

  it('returns parent ID for nested IDs', () => {
    expect(getParentId('to-abc.1')).toBe('to-abc')
    expect(getParentId('to-abc.1.2')).toBe('to-abc.1')
    expect(getParentId('to-abc.1.2.3')).toBe('to-abc.1.2')
  })
})

describe('isRootNode', () => {
  it('returns true for root-level IDs', () => {
    expect(isRootNode('to-abc')).toBe(true)
    expect(isRootNode('proj-123')).toBe(true)
  })

  it('returns false for nested IDs', () => {
    expect(isRootNode('to-abc.1')).toBe(false)
    expect(isRootNode('to-abc.1.2')).toBe(false)
  })
})

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree([])).toEqual([])
  })

  it('creates root nodes for issues without parents', () => {
    const issues = [createIssue('to-a', 'Epic A'), createIssue('to-b', 'Epic B')]

    const tree = buildTree(issues)

    expect(tree).toHaveLength(2)
    expect(tree[0].issue.id).toBe('to-a')
    expect(tree[1].issue.id).toBe('to-b')
    expect(tree[0].children).toEqual([])
    expect(tree[1].children).toEqual([])
  })

  it('nests children under their parents', () => {
    const issues = [
      createIssue('to-a', 'Epic A'),
      createIssue('to-a.1', 'Task 1'),
      createIssue('to-a.2', 'Task 2'),
    ]

    const tree = buildTree(issues)

    expect(tree).toHaveLength(1)
    expect(tree[0].issue.id).toBe('to-a')
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].issue.id).toBe('to-a.1')
    expect(tree[0].children[1].issue.id).toBe('to-a.2')
  })

  it('handles deeply nested hierarchies', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
      createIssue('to-a.1.1.1', 'Subtask'),
    ]

    const tree = buildTree(issues)

    expect(tree).toHaveLength(1)
    expect(tree[0].children[0].children[0].children[0].issue.id).toBe(
      'to-a.1.1.1'
    )
  })

  it('sets depth correctly', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
    ]

    const tree = buildTree(issues)

    expect(tree[0].depth).toBe(0)
    expect(tree[0].children[0].depth).toBe(1)
    expect(tree[0].children[0].children[0].depth).toBe(2)
  })

  it('treats orphan children as roots', () => {
    const issues = [
      createIssue('to-a.1', 'Orphan child'), // Parent to-a doesn't exist
    ]

    const tree = buildTree(issues)

    expect(tree).toHaveLength(1)
    expect(tree[0].issue.id).toBe('to-a.1')
  })

  it('expands root nodes by default', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task'),
    ]

    const tree = buildTree(issues)

    expect(tree[0].isExpanded).toBe(true)
    expect(tree[0].children[0].isExpanded).toBeFalsy()
  })
})

describe('getChildren', () => {
  it('returns empty array when no children exist', () => {
    const issues = [createIssue('to-a', 'Epic')]
    expect(getChildren(issues, 'to-a')).toEqual([])
  })

  it('returns direct children only', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task 1'),
      createIssue('to-a.2', 'Task 2'),
      createIssue('to-a.1.1', 'Subtask'), // grandchild, should not be included
    ]

    const children = getChildren(issues, 'to-a')

    expect(children).toHaveLength(2)
    expect(children.map((c) => c.id)).toEqual(['to-a.1', 'to-a.2'])
  })
})

describe('getAncestors', () => {
  it('returns empty array for root nodes', () => {
    const issues = [createIssue('to-a', 'Epic')]
    expect(getAncestors(issues, 'to-a')).toEqual([])
  })

  it('returns ancestors from parent to root', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
    ]

    const ancestors = getAncestors(issues, 'to-a.1.1')

    expect(ancestors).toHaveLength(2)
    expect(ancestors[0].id).toBe('to-a.1') // immediate parent first
    expect(ancestors[1].id).toBe('to-a') // root last
  })

  it('skips missing ancestors', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1.1', 'Task'), // parent to-a.1 is missing
    ]

    const ancestors = getAncestors(issues, 'to-a.1.1')

    expect(ancestors).toHaveLength(1)
    expect(ancestors[0].id).toBe('to-a')
  })
})

describe('getDescendants', () => {
  it('returns all descendants', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
      createIssue('to-a.2', 'Issue 2'),
      createIssue('to-b', 'Another Epic'),
    ]

    const descendants = getDescendants(issues, 'to-a')

    expect(descendants).toHaveLength(3)
    expect(descendants.map((d) => d.id).sort()).toEqual([
      'to-a.1',
      'to-a.1.1',
      'to-a.2',
    ])
  })
})

describe('findNode', () => {
  it('finds a root node', () => {
    const issues = [createIssue('to-a', 'Epic')]
    const tree = buildTree(issues)

    const found = findNode(tree, 'to-a')

    expect(found).toBeDefined()
    expect(found?.issue.id).toBe('to-a')
  })

  it('finds a nested node', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
    ]
    const tree = buildTree(issues)

    const found = findNode(tree, 'to-a.1.1')

    expect(found).toBeDefined()
    expect(found?.issue.id).toBe('to-a.1.1')
  })

  it('returns undefined for non-existent node', () => {
    const issues = [createIssue('to-a', 'Epic')]
    const tree = buildTree(issues)

    expect(findNode(tree, 'to-xyz')).toBeUndefined()
  })
})

describe('flattenVisibleNodes', () => {
  it('returns all nodes when all are expanded', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task 1'),
      createIssue('to-a.2', 'Task 2'),
    ]
    const tree = buildTree(issues)
    // Root is expanded by default

    const visible = flattenVisibleNodes(tree)

    expect(visible).toHaveLength(3)
    expect(visible.map((n) => n.issue.id)).toEqual(['to-a', 'to-a.1', 'to-a.2'])
  })

  it('hides children of collapsed nodes', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task 1'),
      createIssue('to-a.2', 'Task 2'),
    ]
    const tree = buildTree(issues)
    tree[0].isExpanded = false

    const visible = flattenVisibleNodes(tree)

    expect(visible).toHaveLength(1)
    expect(visible[0].issue.id).toBe('to-a')
  })
})

describe('toggleNodeExpanded', () => {
  it('toggles expanded state of a node', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task'),
    ]
    const tree = buildTree(issues)
    expect(tree[0].isExpanded).toBe(true)

    const toggled = toggleNodeExpanded(tree, 'to-a')

    expect(toggled[0].isExpanded).toBe(false)
    // Original should be unchanged (immutable)
    expect(tree[0].isExpanded).toBe(true)
  })

  it('toggles nested node', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
    ]
    const tree = buildTree(issues)
    tree[0].children[0].isExpanded = true

    const toggled = toggleNodeExpanded(tree, 'to-a.1')

    expect(toggled[0].children[0].isExpanded).toBe(false)
  })
})

describe('expandToNode', () => {
  it('expands all ancestors to reveal a node', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
    ]
    const tree = buildTree(issues)
    tree[0].isExpanded = false
    tree[0].children[0].isExpanded = false

    const expanded = expandToNode(tree, 'to-a.1.1')

    expect(expanded[0].isExpanded).toBe(true)
    expect(expanded[0].children[0].isExpanded).toBe(true)
  })
})

describe('countNodes', () => {
  it('counts all nodes in tree', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Issue'),
      createIssue('to-a.1.1', 'Task'),
      createIssue('to-b', 'Epic 2'),
    ]
    const tree = buildTree(issues)

    expect(countNodes(tree)).toBe(4)
  })
})

describe('getSiblings', () => {
  it('returns sibling issues', () => {
    const issues = [
      createIssue('to-a', 'Epic'),
      createIssue('to-a.1', 'Task 1'),
      createIssue('to-a.2', 'Task 2'),
      createIssue('to-a.3', 'Task 3'),
    ]

    const siblings = getSiblings(issues, 'to-a.2')

    expect(siblings).toHaveLength(2)
    expect(siblings.map((s) => s.id).sort()).toEqual(['to-a.1', 'to-a.3'])
  })

  it('returns empty for root nodes with no siblings', () => {
    const issues = [createIssue('to-a', 'Epic')]

    expect(getSiblings(issues, 'to-a')).toEqual([])
  })
})
