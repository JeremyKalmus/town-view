import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

type PresetKey = 'today' | 'this_week' | 'this_month'

interface PresetOption {
  key: PresetKey
  label: string
  getRange: () => DateRange
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date()
      const formatted = formatDateForInput(today)
      return { startDate: formatted, endDate: formatted }
    },
  },
  {
    key: 'this_week',
    label: 'This Week',
    getRange: () => {
      const now = new Date()
      return {
        startDate: formatDateForInput(getStartOfWeek(now)),
        endDate: formatDateForInput(getEndOfWeek(now)),
      }
    },
  },
  {
    key: 'this_month',
    label: 'This Month',
    getRange: () => {
      const now = new Date()
      return {
        startDate: formatDateForInput(getStartOfMonth(now)),
        endDate: formatDateForInput(getEndOfMonth(now)),
      }
    },
  },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStart = e.target.value || null
      onChange({
        ...value,
        startDate: newStart,
        endDate: newStart && value.endDate && newStart > value.endDate ? newStart : value.endDate,
      })
    },
    [value, onChange]
  )

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value || null
      onChange({
        ...value,
        endDate: newEnd,
        startDate: newEnd && value.startDate && newEnd < value.startDate ? newEnd : value.startDate,
      })
    },
    [value, onChange]
  )

  const handlePresetClick = useCallback(
    (preset: PresetOption) => {
      onChange(preset.getRange())
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange({ startDate: null, endDate: null })
  }, [onChange])

  const activePreset = useMemo(() => {
    for (const preset of PRESET_OPTIONS) {
      const range = preset.getRange()
      if (range.startDate === value.startDate && range.endDate === value.endDate) {
        return preset.key
      }
    }
    return null
  }, [value])

  const hasValue = value.startDate || value.endDate

  const inputClass = cn(
    'bg-bg-tertiary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary',
    'focus:outline-none focus:ring-2 focus:ring-accent-chrome focus:ring-offset-1 focus:ring-offset-bg-primary',
    'hover:border-border-accent transition-colors',
    '[color-scheme:dark]'
  )

  const presetButtonClass = (isActive: boolean) =>
    cn(
      'px-3 py-1.5 text-sm rounded-md transition-colors',
      isActive
        ? 'bg-accent-rust text-text-primary'
        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 hover:text-text-primary border border-border'
    )

  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {/* Date Inputs */}
      <div className="flex items-center gap-2">
        <label htmlFor="date-range-start" className="text-sm text-text-secondary">
          From:
        </label>
        <input
          id="date-range-start"
          type="date"
          value={value.startDate || ''}
          onChange={handleStartDateChange}
          className={inputClass}
          aria-label="Start date"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="date-range-end" className="text-sm text-text-secondary">
          To:
        </label>
        <input
          id="date-range-end"
          type="date"
          value={value.endDate || ''}
          onChange={handleEndDateChange}
          min={value.startDate || undefined}
          className={inputClass}
          aria-label="End date"
        />
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-2">
        {PRESET_OPTIONS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={presetButtonClass(activePreset === preset.key)}
            aria-pressed={activePreset === preset.key}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Clear Button */}
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-accent-rust hover:text-accent-rust/80 transition-colors underline underline-offset-2"
        >
          Clear
        </button>
      )}
    </div>
  )
}
