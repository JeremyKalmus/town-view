import type { Meta, StoryObj } from '@storybook/react'
import { TownDashboard, isHQRig } from './TownDashboard'
import type { Rig } from '@/types'

const meta: Meta<typeof TownDashboard> = {
  title: 'Features/TownDashboard',
  component: TownDashboard,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TownDashboard>

/**
 * Default view showing the Town Operations Center.
 * Note: This story requires the backend to be running to show real data.
 * In Storybook, it will show loading states or errors if the backend is unavailable.
 */
export const Default: Story = {
  args: {
    refreshKey: 0,
  },
}

/**
 * With refresh trigger - increment refreshKey to trigger data reload.
 */
export const WithRefresh: Story = {
  args: {
    refreshKey: 1,
  },
}

/**
 * Test helper function for HQ detection.
 */
export const HQDetectionTests: Story = {
  render: () => {
    const testRigs: Array<{ rig: Rig | null; expected: boolean; label: string }> = [
      {
        rig: { id: 'hq', name: 'HQ', prefix: 'hq', path: '/hq', beads_path: '/hq/.beads', issue_count: 0, open_count: 0, agent_count: 0 },
        expected: true,
        label: 'rig.id === "hq"',
      },
      {
        rig: { id: 'town-hq', name: 'HQ (Town)', prefix: 'th', path: '/town', beads_path: '/town/.beads', issue_count: 0, open_count: 0, agent_count: 0 },
        expected: true,
        label: 'rig.name === "HQ (Town)"',
      },
      {
        rig: { id: 'headquarters', name: 'HQ', prefix: 'hq', path: '/hq', beads_path: '/hq/.beads', issue_count: 0, open_count: 0, agent_count: 0 },
        expected: true,
        label: 'rig.name.toLowerCase() === "hq"',
      },
      {
        rig: { id: 'townview', name: 'townview', prefix: 'to', path: '/townview', beads_path: '/townview/.beads', issue_count: 0, open_count: 0, agent_count: 0 },
        expected: false,
        label: 'Regular rig',
      },
      {
        rig: null,
        expected: false,
        label: 'null rig',
      },
    ]

    return (
      <div className="p-6 space-y-4">
        <h2 className="section-header mb-4">HQ DETECTION TESTS</h2>
        <div className="card p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3">Test Case</th>
                <th className="text-left py-2 px-3">Expected</th>
                <th className="text-left py-2 px-3">Result</th>
                <th className="text-left py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {testRigs.map(({ rig, expected, label }, i) => {
                const result = isHQRig(rig)
                const passed = result === expected
                return (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-3">{label}</td>
                    <td className="py-2 px-3">{expected ? 'true' : 'false'}</td>
                    <td className="py-2 px-3">{result ? 'true' : 'false'}</td>
                    <td className="py-2 px-3">
                      <span className={passed ? 'text-status-closed' : 'text-status-blocked'}>
                        {passed ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
}
