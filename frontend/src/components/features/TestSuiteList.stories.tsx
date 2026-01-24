import type { Meta, StoryObj } from '@storybook/react'
import { TestSuiteList } from './TestSuiteList'
import type { TestStatus } from '@/types'

// Mock data for stories
const mockTests: TestStatus[] = [
  {
    test_name: 'TestUserAuthentication',
    test_file: 'auth/auth_test.go',
    current_status: 'passed',
    last_run_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    last_passed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_passed_commit: 'a1b2c3d4e5f6',
    fail_count: 0,
    total_runs: 42,
  },
  {
    test_name: 'TestDatabaseConnection',
    test_file: 'db/connection_test.go',
    current_status: 'passed',
    last_run_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    last_passed_commit: 'b2c3d4e5f6a7',
    fail_count: 0,
    total_runs: 156,
  },
  {
    test_name: 'TestAPIEndpointValidation',
    test_file: 'api/validation_test.go',
    current_status: 'failed',
    last_run_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    last_passed_commit: 'c3d4e5f6a7b8',
    fail_count: 3,
    total_runs: 89,
  },
  {
    test_name: 'TestCacheInvalidation',
    test_file: 'cache/invalidation_test.go',
    current_status: 'failed',
    last_run_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    fail_count: 12,
    total_runs: 34,
  },
  {
    test_name: 'TestRateLimiting',
    test_file: 'middleware/ratelimit_test.go',
    current_status: 'skipped',
    last_run_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    last_passed_commit: 'd4e5f6a7b8c9',
    fail_count: 0,
    total_runs: 23,
  },
  {
    test_name: 'TestWebSocketBroadcast',
    test_file: 'ws/broadcast_test.go',
    current_status: 'passed',
    last_run_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    last_passed_commit: 'e5f6a7b8c9d0',
    fail_count: 0,
    total_runs: 67,
  },
  {
    test_name: 'TestSessionTimeout',
    test_file: 'auth/session_test.go',
    current_status: 'failed',
    last_run_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    last_passed_commit: 'f6a7b8c9d0e1',
    fail_count: 5,
    total_runs: 112,
  },
  {
    test_name: 'TestDataMigration',
    test_file: 'db/migration_test.go',
    current_status: 'passed',
    last_run_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    last_passed_commit: 'a7b8c9d0e1f2',
    fail_count: 0,
    total_runs: 28,
  },
  {
    test_name: 'TestFileUpload',
    test_file: 'storage/upload_test.go',
    current_status: 'passed',
    last_run_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    last_passed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    last_passed_commit: 'b8c9d0e1f2a3',
    fail_count: 0,
    total_runs: 45,
  },
  {
    test_name: 'TestNotificationDelivery',
    test_file: 'notifications/delivery_test.go',
    current_status: 'skipped',
    last_run_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    fail_count: 0,
    total_runs: 15,
  },
]

const meta: Meta<typeof TestSuiteList> = {
  title: 'Features/TestSuiteList',
  component: TestSuiteList,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] bg-bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TestSuiteList>

export const Default: Story = {
  args: {
    mockTests,
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const AllPassing: Story = {
  args: {
    mockTests: mockTests
      .filter((t) => t.current_status === 'passed' || t.current_status === 'skipped')
      .map((t) => ({ ...t, current_status: 'passed' as const, fail_count: 0 })),
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const WithRegressions: Story = {
  args: {
    mockTests: mockTests.filter(
      (t) =>
        t.current_status === 'failed' && t.last_passed_at || t.current_status === 'passed'
    ),
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const AllFailing: Story = {
  args: {
    mockTests: mockTests.map((t) => ({
      ...t,
      current_status: 'failed' as const,
      fail_count: Math.floor(Math.random() * 10) + 1,
    })),
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const Loading: Story = {
  args: {
    mockTests: [],
    mockLoading: true,
  },
}

export const Error: Story = {
  args: {
    mockTests: [],
    mockError: 'Failed to connect to telemetry service. Please check if the backend is running.',
  },
}

export const Empty: Story = {
  args: {
    mockTests: [],
  },
}

export const SingleTest: Story = {
  args: {
    mockTests: [mockTests[0]],
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const ManyTests: Story = {
  args: {
    mockTests: [
      ...mockTests,
      ...mockTests.map((t, i) => ({
        ...t,
        test_name: `${t.test_name}_Copy${i + 1}`,
        test_file: t.test_file.replace('_test.go', `_copy${i + 1}_test.go`),
      })),
      ...mockTests.map((t, i) => ({
        ...t,
        test_name: `${t.test_name}_Extra${i + 1}`,
        test_file: t.test_file.replace('_test.go', `_extra${i + 1}_test.go`),
      })),
    ],
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}

export const MixedStatuses: Story = {
  args: {
    mockTests: [
      // 3 passing
      { ...mockTests[0], test_name: 'TestPass1' },
      { ...mockTests[1], test_name: 'TestPass2' },
      { ...mockTests[5], test_name: 'TestPass3' },
      // 2 failing (no prior pass = not regression)
      { ...mockTests[3], test_name: 'TestFail1' },
      { ...mockTests[3], test_name: 'TestFail2', test_file: 'other/fail_test.go' },
      // 3 regressions (failing with prior pass)
      { ...mockTests[2], test_name: 'TestRegression1' },
      { ...mockTests[6], test_name: 'TestRegression2' },
      { ...mockTests[2], test_name: 'TestRegression3', test_file: 'another/regress_test.go' },
      // 2 skipped
      { ...mockTests[4], test_name: 'TestSkip1' },
      { ...mockTests[9], test_name: 'TestSkip2' },
    ],
    onTestClick: (test) => console.log('Clicked test:', test.test_name),
  },
}
