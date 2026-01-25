import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { GitChangesTimeline } from './GitChangesTimeline'
import type { GitChange } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create successful fetch response
function mockSuccessResponse<T>(data: T) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

// Sample git changes for testing
const mockGitChanges: GitChange[] = [
  {
    agent_id: 'townview/polecats/amber',
    bead_id: 'to-abc.1',
    timestamp: '2026-01-25T10:30:00Z',
    commit_sha: 'abc123def456789',
    branch: 'main',
    files_changed: 3,
    insertions: 45,
    deletions: 12,
    message: 'feat: Add user authentication',
  },
  {
    agent_id: 'townview/crew/jeremy',
    timestamp: '2026-01-25T09:15:00Z',
    commit_sha: 'def789abc123456',
    branch: 'feature/login',
    files_changed: 2,
    insertions: 30,
    deletions: 5,
    message: 'fix: Resolve login redirect issue',
  },
  {
    agent_id: 'townview/polecats/cobalt',
    bead_id: 'to-xyz.2',
    timestamp: '2026-01-24T14:00:00Z',
    commit_sha: '789xyz123abc456',
    branch: 'main',
    files_changed: 1,
    insertions: 10,
    deletions: 0,
    message: 'docs: Update README',
  },
]

describe('GitChangesTimeline', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default mock that returns git changes for all requests
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGitChanges),
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should render commits with diff stats and timestamps', async () => {
    // Uses default mock from beforeEach
    render(<GitChangesTimeline />)

    // Wait for loading to complete and commits to render
    await waitFor(() => {
      expect(screen.queryByText('Loading git changes...')).not.toBeInTheDocument()
    })

    // Check that commits are rendered with messages
    expect(await screen.findByText('feat: Add user authentication')).toBeInTheDocument()
    expect(screen.getByText('fix: Resolve login redirect issue')).toBeInTheDocument()
    expect(screen.getByText('docs: Update README')).toBeInTheDocument()

    // Check that diff stats are displayed (files changed, insertions, deletions)
    // The numbers should appear in the rendered output
    expect(screen.getByText('3')).toBeInTheDocument() // files_changed for first commit
    expect(screen.getByText('45')).toBeInTheDocument() // insertions for first commit
    expect(screen.getByText('12')).toBeInTheDocument() // deletions for first commit

    // Check that short SHAs are displayed
    expect(screen.getByText('abc123d')).toBeInTheDocument()
    expect(screen.getByText('def789a')).toBeInTheDocument()

    // Check that branch names are displayed
    // Two commits are on main branch, so use getAllByText
    expect(screen.getAllByText(/on main/).length).toBeGreaterThan(0)
    expect(screen.getByText('on feature/login')).toBeInTheDocument()

    // Check that agent badges are displayed (extracted agent names)
    expect(screen.getByText('amber')).toBeInTheDocument()
    expect(screen.getByText('jeremy')).toBeInTheDocument()
    expect(screen.getByText('cobalt')).toBeInTheDocument()
  })

  it('should display loading state while fetching', () => {
    // Override mock for pending fetch
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<GitChangesTimeline />)

    expect(screen.getByText('Loading git changes...')).toBeInTheDocument()
  })

  it('should display error state on fetch failure', async () => {
    // Override mock for failed fetch
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    )

    render(<GitChangesTimeline />)

    expect(await screen.findByText(/Failed to fetch git changes/)).toBeInTheDocument()
  })

  it('should display empty state when no commits', async () => {
    // Override mock for empty response
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )

    render(<GitChangesTimeline />)

    expect(await screen.findByText('No git changes found')).toBeInTheDocument()
  })

  it('should filter commits by date range', async () => {
    // Test that when date range excludes all commits, empty state is shown
    // Use a date range that excludes all test commits
    mockFetch.mockImplementation(() => mockSuccessResponse(mockGitChanges))

    const dateRange = {
      startDate: '2026-01-26', // After all test commits
      endDate: '2026-01-27',
    }

    render(<GitChangesTimeline dateRange={dateRange} />)

    // Wait for loading to complete and empty state to appear
    expect(await screen.findByText(/No git changes found/)).toBeInTheDocument()
    expect(screen.getByText(/for the selected date range/)).toBeInTheDocument()
  })

  it('should include query parameters in API request', async () => {
    // Override mock for empty response to test URL construction
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )

    const dateRange = {
      startDate: '2026-01-20',
      endDate: '2026-01-25',
    }

    render(
      <GitChangesTimeline
        dateRange={dateRange}
        agentId="townview/polecats/amber"
        beadId="to-abc.1"
      />
    )

    // Check that fetch was called with correct URL parameters
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('agent_id=townview%2Fpolecats%2Famber')
    expect(calledUrl).toContain('bead_id=to-abc.1')
    expect(calledUrl).toContain('since=2026-01-20')
    expect(calledUrl).toContain('until=2026-01-25')
  })
})
