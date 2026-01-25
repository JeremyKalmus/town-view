import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestHistoryPanel } from './TestHistoryPanel'
import type { TestHistoryEntry } from '@/types'

// Mock the useFetch hook
vi.mock('@/hooks/useFetch', () => ({
  useFetch: vi.fn(),
}))

// Import the mocked module
import { useFetch } from '@/hooks/useFetch'

const mockUseFetch = vi.mocked(useFetch)

const mockHistoryEntries: TestHistoryEntry[] = [
  {
    test_name: 'should render correctly',
    status: 'passed',
    timestamp: '2026-01-25T10:00:00Z',
    commit_sha: 'abc1234',
    duration_ms: 150,
  },
  {
    test_name: 'should render correctly',
    status: 'failed',
    timestamp: '2026-01-24T10:00:00Z',
    commit_sha: 'def5678',
    duration_ms: 200,
    error_message: 'Expected true to be false',
  },
  {
    test_name: 'should render correctly',
    status: 'skipped',
    timestamp: '2026-01-23T10:00:00Z',
    duration_ms: 0,
  },
]

describe('TestHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render test results with pass/fail indicators', () => {
    mockUseFetch.mockReturnValue({
      data: mockHistoryEntries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="should render correctly" />)

    // Check header is rendered
    expect(screen.getByText('Test History')).toBeInTheDocument()

    // Check test name is displayed
    expect(screen.getByText('should render correctly')).toBeInTheDocument()

    // Check pass/fail badges are rendered
    expect(screen.getByText('Pass')).toBeInTheDocument()
    expect(screen.getByText('Fail')).toBeInTheDocument()
    expect(screen.getByText('Skip')).toBeInTheDocument()

    // Check error message is displayed for failed test
    expect(screen.getByText('Expected true to be false')).toBeInTheDocument()

    // Check results count
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUseFetch.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="test-name" />)

    expect(screen.getByText('Loading test history...')).toBeInTheDocument()
  })

  it('should show error state', () => {
    mockUseFetch.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch test history',
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="test-name" />)

    expect(screen.getByText('Failed to fetch test history')).toBeInTheDocument()
  })

  it('should fetch from correct API endpoint', () => {
    mockUseFetch.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="my-test-name" />)

    expect(mockUseFetch).toHaveBeenCalledWith(
      '/api/telemetry/tests/my-test-name/history',
      expect.objectContaining({
        errorPrefix: 'Failed to fetch test history',
      })
    )
  })

  it('should encode special characters in test name', () => {
    mockUseFetch.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="test/with/slashes" />)

    expect(mockUseFetch).toHaveBeenCalledWith(
      '/api/telemetry/tests/test%2Fwith%2Fslashes/history',
      expect.any(Object)
    )
  })

  it('should show singular result count for one entry', () => {
    mockUseFetch.mockReturnValue({
      data: [mockHistoryEntries[0]],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<TestHistoryPanel testName="test-name" />)

    expect(screen.getByText('1 result')).toBeInTheDocument()
  })
})
