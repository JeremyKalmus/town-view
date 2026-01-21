import { FormField, MultiSelect, type MultiSelectOption } from '@/components/ui'

// Common labels that can be suggested
const SUGGESTED_LABELS: MultiSelectOption[] = [
  { value: 'bug', label: 'bug' },
  { value: 'feature', label: 'feature' },
  { value: 'enhancement', label: 'enhancement' },
  { value: 'documentation', label: 'documentation' },
  { value: 'refactor', label: 'refactor' },
  { value: 'test', label: 'test' },
  { value: 'performance', label: 'performance' },
  { value: 'security', label: 'security' },
  { value: 'ux', label: 'ux' },
  { value: 'tech-debt', label: 'tech-debt' },
]

export interface LabelsMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  availableLabels?: MultiSelectOption[]
  error?: string
  disabled?: boolean
}

export function LabelsMultiSelect({
  value,
  onChange,
  availableLabels = SUGGESTED_LABELS,
  error,
  disabled,
}: LabelsMultiSelectProps) {
  return (
    <FormField
      label="Labels"
      htmlFor="labels"
      error={error}
      hint="Add labels to categorize this issue"
    >
      <MultiSelect
        options={availableLabels}
        value={value}
        onChange={onChange}
        placeholder="Add labels..."
        error={!!error}
        disabled={disabled}
        allowCreate
      />
    </FormField>
  )
}
