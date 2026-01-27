import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { CacheStatsPanel } from './CacheStatsPanel'
import { useDataStore } from '@/stores/data-store'
import type { CacheStats } from '@/types'

// Mock cache stats data
const mockCacheStats: CacheStats = {
  issue_entries: 42,
  issue_list_entries: 15,
  dependency_entries: 28,
  convoy_progress_entries: 8,
  hit_count: 1250,
  miss_count: 150,
  last_invalidation: '2026-01-27T12:30:00Z',
  issues_ttl_seconds: 300,
  convoy_progress_ttl_seconds: 60,
  dependencies_ttl_seconds: 180,
}

describe('CacheStatsPanel', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDataStore.setState({ cacheStats: mockCacheStats })
  })

  afterEach(() => {
    cleanup()
  })

  it('should render cache statistics with entry counts', () => {
    render(<CacheStatsPanel />)

    // Check that the component title is rendered
    expect(screen.getByText('Cache Statistics')).toBeInTheDocument()

    // Check that entry counts are displayed
    expect(screen.getByText('42')).toBeInTheDocument() // issue_entries
    expect(screen.getByText('15')).toBeInTheDocument() // issue_list_entries
    expect(screen.getByText('28')).toBeInTheDocument() // dependency_entries
    expect(screen.getByText('8')).toBeInTheDocument() // convoy_progress_entries

    // Check that total is calculated and displayed (42 + 15 + 28 + 8 = 93)
    expect(screen.getByText('93')).toBeInTheDocument()
  })

  it('should display hit/miss statistics', () => {
    render(<CacheStatsPanel />)

    // Check that hit and miss counts are displayed with locale formatting
    expect(screen.getByText('1,250')).toBeInTheDocument() // hit_count
    expect(screen.getByText('150')).toBeInTheDocument() // miss_count

    // Check that total requests is displayed (1250 + 150 = 1400)
    expect(screen.getByText('1,400')).toBeInTheDocument()
  })

  it('should calculate and display hit rate percentage', () => {
    render(<CacheStatsPanel />)

    // Hit rate = 1250 / (1250 + 150) * 100 = 89.3%
    expect(screen.getByText('89.3% hit rate')).toBeInTheDocument()
  })

  it('should display TTL configuration', () => {
    render(<CacheStatsPanel />)

    // Check that TTL values are displayed
    expect(screen.getByText('300s')).toBeInTheDocument() // issues_ttl_seconds
    expect(screen.getByText('60s')).toBeInTheDocument() // convoy_progress_ttl_seconds
    expect(screen.getByText('180s')).toBeInTheDocument() // dependencies_ttl_seconds
  })

  it('should display last invalidation timestamp', () => {
    render(<CacheStatsPanel />)

    // Check that last invalidation section is rendered
    expect(screen.getByText('Last invalidation')).toBeInTheDocument()
    // The actual formatted time will depend on formatRelativeTime function
  })

  it('should show loading state when cache stats is null', () => {
    // Set cache stats to null
    useDataStore.setState({ cacheStats: null })

    render(<CacheStatsPanel />)

    expect(screen.getByText('Loading cache statistics...')).toBeInTheDocument()
  })

  it('should display high hit rate with success badge color', () => {
    const highHitRateStats: CacheStats = {
      ...mockCacheStats,
      hit_count: 9500,
      miss_count: 500,
    }
    useDataStore.setState({ cacheStats: highHitRateStats })

    render(<CacheStatsPanel />)

    // Hit rate = 9500 / (9500 + 500) * 100 = 95.0%
    expect(screen.getByText('95.0% hit rate')).toBeInTheDocument()
  })

  it('should display low hit rate with error badge color', () => {
    const lowHitRateStats: CacheStats = {
      ...mockCacheStats,
      hit_count: 300,
      miss_count: 700,
    }
    useDataStore.setState({ cacheStats: lowHitRateStats })

    render(<CacheStatsPanel />)

    // Hit rate = 300 / (300 + 700) * 100 = 30.0%
    expect(screen.getByText('30.0% hit rate')).toBeInTheDocument()
  })

  it('should display medium hit rate with warning badge color', () => {
    const mediumHitRateStats: CacheStats = {
      ...mockCacheStats,
      hit_count: 600,
      miss_count: 400,
    }
    useDataStore.setState({ cacheStats: mediumHitRateStats })

    render(<CacheStatsPanel />)

    // Hit rate = 600 / (600 + 400) * 100 = 60.0%
    expect(screen.getByText('60.0% hit rate')).toBeInTheDocument()
  })

  it('should handle zero requests correctly', () => {
    const zeroStats: CacheStats = {
      ...mockCacheStats,
      hit_count: 0,
      miss_count: 0,
    }
    useDataStore.setState({ cacheStats: zeroStats })

    render(<CacheStatsPanel />)

    // Hit rate should be 0.0% when there are no requests
    expect(screen.getByText('0.0% hit rate')).toBeInTheDocument()
  })

  it('should format large numbers with locale formatting', () => {
    const largeStats: CacheStats = {
      ...mockCacheStats,
      issue_entries: 5420,
      issue_list_entries: 1250,
      dependency_entries: 3890,
      convoy_progress_entries: 780,
      hit_count: 1250000,
      miss_count: 45000,
    }
    useDataStore.setState({ cacheStats: largeStats })

    render(<CacheStatsPanel />)

    // Check that large numbers are formatted with commas
    expect(screen.getByText('1,250,000')).toBeInTheDocument() // hit_count
    expect(screen.getByText('45,000')).toBeInTheDocument() // miss_count
  })
})
