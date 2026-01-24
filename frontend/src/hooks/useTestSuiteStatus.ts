/**
 * Hook for fetching test suite status from the telemetry API.
 * Returns the current status of all tests with filtering and sorting support.
 */

import { useMemo } from 'react'
import { useFetch } from './useFetch'
import type { TestStatus } from '@/types'

export type TestStatusFilter = 'all' | 'passing' | 'failing' | 'regression' | 'skipped';
export type TestSortField = 'name' | 'last_run' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface UseTestSuiteStatusOptions {
  /** Polling interval in milliseconds (0 to disable) */
  pollInterval?: number
  /** Enable fetching */
  enabled?: boolean
}

export interface UseTestSuiteStatusResult {
  /** All test statuses */
  tests: TestStatus[]
  /** Whether fetch is in progress */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Determine if a test is a regression (was passing, now failing).
 * A regression is when a test has failed but has a last_passed_at timestamp.
 */
export function isRegression(test: TestStatus): boolean {
  return test.current_status === 'failed' && !!test.last_passed_at
}

/**
 * Get the display status for a test (includes regression detection).
 */
export function getDisplayStatus(test: TestStatus): 'passing' | 'failing' | 'regression' | 'skipped' {
  if (test.current_status === 'passed') return 'passing'
  if (test.current_status === 'skipped') return 'skipped'
  if (isRegression(test)) return 'regression'
  return 'failing'
}

/**
 * Filter tests by status.
 */
export function filterTests(tests: TestStatus[], filter: TestStatusFilter): TestStatus[] {
  if (filter === 'all') return tests

  return tests.filter((test) => {
    switch (filter) {
      case 'passing':
        return test.current_status === 'passed'
      case 'failing':
        return test.current_status === 'failed' && !isRegression(test)
      case 'regression':
        return isRegression(test)
      case 'skipped':
        return test.current_status === 'skipped'
      default:
        return true
    }
  })
}

/**
 * Sort tests by field.
 */
export function sortTests(
  tests: TestStatus[],
  field: TestSortField,
  direction: SortDirection
): TestStatus[] {
  const sorted = [...tests].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = a.test_name.localeCompare(b.test_name)
        break
      case 'last_run':
        comparison = new Date(a.last_run_at).getTime() - new Date(b.last_run_at).getTime()
        break
      case 'status': {
        // Sort order: regression > failing > skipped > passing
        const statusOrder: Record<string, number> = {
          regression: 0,
          failing: 1,
          skipped: 2,
          passing: 3,
        }
        const aStatus = getDisplayStatus(a)
        const bStatus = getDisplayStatus(b)
        comparison = statusOrder[aStatus] - statusOrder[bStatus]
        break
      }
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Hook for fetching and managing test suite status.
 */
export function useTestSuiteStatus(
  options: UseTestSuiteStatusOptions = {}
): UseTestSuiteStatusResult {
  const { enabled = true } = options

  const { data, loading, error, refetch } = useFetch<TestStatus[]>(
    '/api/telemetry/tests',
    {
      enabled,
      initialData: [],
      errorPrefix: 'Failed to fetch test suite status',
    }
  )

  const tests = useMemo(() => data ?? [], [data])

  return {
    tests,
    loading,
    error,
    refetch,
  }
}
