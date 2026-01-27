import type { Meta, StoryObj } from '@storybook/react'
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

const mockCacheStatsHighHitRate: CacheStats = {
  ...mockCacheStats,
  hit_count: 9500,
  miss_count: 500,
}

const mockCacheStatsLowHitRate: CacheStats = {
  ...mockCacheStats,
  hit_count: 300,
  miss_count: 700,
}

const mockCacheStatsEmpty: CacheStats = {
  issue_entries: 0,
  issue_list_entries: 0,
  dependency_entries: 0,
  convoy_progress_entries: 0,
  hit_count: 0,
  miss_count: 0,
  last_invalidation: '2026-01-27T12:00:00Z',
  issues_ttl_seconds: 300,
  convoy_progress_ttl_seconds: 60,
  dependencies_ttl_seconds: 180,
}

const meta: Meta<typeof CacheStatsPanel> = {
  title: 'Features/CacheStatsPanel',
  component: CacheStatsPanel,
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      // Mock the store with different cache stats based on the story
      const mockStats = context.parameters?.cacheStats || mockCacheStats
      useDataStore.setState({ cacheStats: mockStats })

      return (
        <div className="max-w-md">
          <Story />
        </div>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof CacheStatsPanel>

export const Default: Story = {
  parameters: {
    cacheStats: mockCacheStats,
  },
}

export const HighHitRate: Story = {
  parameters: {
    cacheStats: mockCacheStatsHighHitRate,
  },
}

export const LowHitRate: Story = {
  parameters: {
    cacheStats: mockCacheStatsLowHitRate,
  },
}

export const EmptyCache: Story = {
  parameters: {
    cacheStats: mockCacheStatsEmpty,
  },
}

export const Loading: Story = {
  parameters: {
    cacheStats: null,
  },
}

export const LargeCounts: Story = {
  parameters: {
    cacheStats: {
      ...mockCacheStats,
      issue_entries: 5420,
      issue_list_entries: 1250,
      dependency_entries: 3890,
      convoy_progress_entries: 780,
      hit_count: 1250000,
      miss_count: 45000,
      last_invalidation: '2026-01-27T10:15:00Z',
    },
  },
}
