import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DateRangePicker, type DateRange } from './DateRangePicker'

const meta: Meta<typeof DateRangePicker> = {
  title: 'UI/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-4 bg-bg-primary min-h-[200px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DateRangePicker>

const DEFAULT_RANGE: DateRange = {
  startDate: null,
  endDate: null,
}

function DateRangePickerWithState({ initialValue = DEFAULT_RANGE }: { initialValue?: DateRange }) {
  const [value, setValue] = useState<DateRange>(initialValue)

  return (
    <div className="space-y-4">
      <DateRangePicker value={value} onChange={setValue} />
      <div className="card text-sm">
        <div className="text-text-secondary mb-2">Selected range:</div>
        <pre className="mono text-xs text-text-muted bg-bg-tertiary p-2 rounded overflow-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <DateRangePickerWithState />,
}

export const WithPreselectedDates: Story = {
  render: () => (
    <DateRangePickerWithState
      initialValue={{
        startDate: '2026-01-01',
        endDate: '2026-01-15',
      }}
    />
  ),
}

export const TodayPreset: Story = {
  render: () => {
    const today = new Date().toISOString().split('T')[0]
    return (
      <DateRangePickerWithState
        initialValue={{
          startDate: today,
          endDate: today,
        }}
      />
    )
  },
}

export const ThisWeekPreset: Story = {
  render: () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    return (
      <DateRangePickerWithState
        initialValue={{
          startDate: monday.toISOString().split('T')[0],
          endDate: sunday.toISOString().split('T')[0],
        }}
      />
    )
  },
}

export const ThisMonthPreset: Story = {
  render: () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return (
      <DateRangePickerWithState
        initialValue={{
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
        }}
      />
    )
  },
}

export const Static: Story = {
  args: {
    value: { startDate: '2026-01-10', endDate: '2026-01-20' },
    onChange: () => {},
  },
}
