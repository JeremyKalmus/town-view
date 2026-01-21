import { FormField, Select, type SelectOption } from '@/components/ui'

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: '0', label: 'P0 - Critical' },
  { value: '1', label: 'P1 - High' },
  { value: '2', label: 'P2 - Medium' },
  { value: '3', label: 'P3 - Low' },
  { value: '4', label: 'P4 - Minimal' },
]

export interface PriorityDropdownProps {
  value: number
  onChange: (value: number) => void
  error?: string
  disabled?: boolean
}

export function PriorityDropdown({
  value,
  onChange,
  error,
  disabled,
}: PriorityDropdownProps) {
  return (
    <FormField label="Priority" htmlFor="priority" error={error} required>
      <Select
        id="priority"
        options={PRIORITY_OPTIONS}
        value={String(value)}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        error={!!error}
        disabled={disabled}
      />
    </FormField>
  )
}
