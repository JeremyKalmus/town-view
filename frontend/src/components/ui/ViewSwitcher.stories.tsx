import type { Meta, StoryObj } from '@storybook/react'
import { useEffect } from 'react'
import { ViewSwitcher } from './ViewSwitcher'
import { useUIStore } from '@/stores/ui-store'

const meta: Meta<typeof ViewSwitcher> = {
  title: 'UI/ViewSwitcher',
  component: ViewSwitcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof ViewSwitcher>

export const Default: Story = {
  render: function Render() {
    const { viewMode } = useUIStore()
    return (
      <div className="space-y-4">
        <ViewSwitcher />
        <p className="text-sm text-text-secondary">
          Active view: <span className="font-medium text-text-primary">{viewMode}</span>
        </p>
      </div>
    )
  },
}

export const Planning: Story = {
  render: function Render() {
    const { setViewMode } = useUIStore()
    useEffect(() => {
      setViewMode('planning')
    }, [setViewMode])
    return <ViewSwitcher />
  },
}

export const Monitoring: Story = {
  render: function Render() {
    const { setViewMode } = useUIStore()
    useEffect(() => {
      setViewMode('monitoring')
    }, [setViewMode])
    return <ViewSwitcher />
  },
}

export const Audit: Story = {
  render: function Render() {
    const { setViewMode } = useUIStore()
    useEffect(() => {
      setViewMode('audit')
    }, [setViewMode])
    return <ViewSwitcher />
  },
}

export const InContext: Story = {
  render: function Render() {
    const { viewMode } = useUIStore()
    return (
      <div className="w-[800px] card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-lg font-semibold">Rig Dashboard</h1>
          <ViewSwitcher />
        </div>
        <div className="p-8 text-center text-text-muted">
          <p className="text-lg">
            {viewMode === 'planning' && 'Planning View - Roadmap and issue hierarchy'}
            {viewMode === 'monitoring' && 'Monitoring View - Real-time agent activity'}
            {viewMode === 'audit' && 'Audit View - Historical analysis and metrics'}
          </p>
        </div>
      </div>
    )
  },
}
