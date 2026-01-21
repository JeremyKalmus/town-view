import { FormField, Select, type SelectOption } from '@/components/ui'

export interface AssigneeDropdownProps {
  value: string
  onChange: (value: string) => void
  availableAssignees?: SelectOption[]
  error?: string
  disabled?: boolean
}

export function AssigneeDropdown({
  value,
  onChange,
  availableAssignees = [],
  error,
  disabled,
}: AssigneeDropdownProps) {
  const options: SelectOption[] = [
    { value: '', label: 'Unassigned' },
    ...availableAssignees,
  ]

  return (
    <FormField
      label="Assignee"
      htmlFor="assignee"
      error={error}
      hint="Who is responsible for this issue"
    >
      <Select
        id="assignee"
        options={options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        disabled={disabled}
      />
    </FormField>
  )
}
