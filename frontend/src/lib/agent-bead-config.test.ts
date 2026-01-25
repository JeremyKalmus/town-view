import { describe, it, expect } from 'vitest'
import type { Issue, IssueType } from '@/types'
import {
  TOWN_WORK_TYPES,
  isTownWorkType,
  filterToTownWork,
} from './agent-bead-config'

// Helper to create test issues
function createIssue(id: string, type: IssueType): Issue {
  return {
    id,
    title: `Test ${type}`,
    description: '',
    status: 'open',
    priority: 2,
    issue_type: type,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    dependency_count: 0,
    dependent_count: 0,
  }
}

describe('TOWN_WORK_TYPES constant', () => {
  it('should include all town-level work types', () => {
    // Town work types should include coordination beads (epic, convoy)
    // and individual work items (task, bug, feature, chore, molecule)
    expect(TOWN_WORK_TYPES).toContain('epic')
    expect(TOWN_WORK_TYPES).toContain('task')
    expect(TOWN_WORK_TYPES).toContain('bug')
    expect(TOWN_WORK_TYPES).toContain('feature')
    expect(TOWN_WORK_TYPES).toContain('chore')
    expect(TOWN_WORK_TYPES).toContain('convoy')
    expect(TOWN_WORK_TYPES).toContain('molecule')
  })

  it('should not include non-work types', () => {
    expect(TOWN_WORK_TYPES).not.toContain('mail')
    expect(TOWN_WORK_TYPES).not.toContain('event')
    expect(TOWN_WORK_TYPES).not.toContain('agent')
    expect(TOWN_WORK_TYPES).not.toContain('rig')
  })

  it('should have exactly 7 work types', () => {
    expect(TOWN_WORK_TYPES).toHaveLength(7)
  })
})

describe('isTownWorkType', () => {
  describe('should return true for town work types', () => {
    it.each([
      'epic',
      'task',
      'bug',
      'feature',
      'chore',
      'convoy',
      'molecule',
    ] as IssueType[])('should return true for %s', (type) => {
      expect(isTownWorkType(type)).toBe(true)
    })
  })

  describe('should return false for non-work types', () => {
    it.each([
      'mail',
      'event',
      'agent',
      'rig',
    ] as IssueType[])('should return false for %s', (type) => {
      expect(isTownWorkType(type)).toBe(false)
    })
  })

  it('should return false for merge-request (agent-level work, not town-level)', () => {
    // merge-request is in WORK_BEAD_TYPES but not TOWN_WORK_TYPES
    // because it's specific to refinery/polecat workflow, not town-wide view
    expect(isTownWorkType('merge-request' as IssueType)).toBe(false)
  })
})

describe('filterToTownWork', () => {
  it('should filter issues to only town work types', () => {
    const issues: Issue[] = [
      createIssue('epic-1', 'epic'),
      createIssue('task-1', 'task'),
      createIssue('event-1', 'event'),
      createIssue('convoy-1', 'convoy'),
      createIssue('mail-1', 'mail'),
      createIssue('bug-1', 'bug'),
    ]

    const townWork = filterToTownWork(issues)

    expect(townWork).toHaveLength(4)
    expect(townWork.map(i => i.id).sort()).toEqual([
      'bug-1',
      'convoy-1',
      'epic-1',
      'task-1',
    ])
  })

  it('should return empty array when no town work types exist', () => {
    const issues: Issue[] = [
      createIssue('event-1', 'event'),
      createIssue('mail-1', 'mail'),
    ]

    const townWork = filterToTownWork(issues)

    expect(townWork).toHaveLength(0)
  })

  it('should return all issues when all are town work types', () => {
    const issues: Issue[] = [
      createIssue('epic-1', 'epic'),
      createIssue('task-1', 'task'),
      createIssue('bug-1', 'bug'),
      createIssue('feature-1', 'feature'),
      createIssue('chore-1', 'chore'),
      createIssue('convoy-1', 'convoy'),
      createIssue('molecule-1', 'molecule'),
    ]

    const townWork = filterToTownWork(issues)

    expect(townWork).toHaveLength(7)
  })

  it('should handle empty input', () => {
    const townWork = filterToTownWork([])
    expect(townWork).toHaveLength(0)
  })
})
