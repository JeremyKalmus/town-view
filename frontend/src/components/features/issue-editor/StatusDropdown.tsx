import { FormField, Select, type SelectOption } from '@/components/ui'
import type { IssueStatus } from '@/types'
import { getStatusIcon } from '@/lib/utils'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'open', label: `${getStatusIcon('open')} Open` },
  { value: 'in_progress', label: `${getStatusIcon('in_progress')} In Progress` },
  { value: 'blocked', label: `${getStatusIcon('blocked')} Blocked` },
  { value: 'deferred', label: `${getStatusIcon('deferred')} Deferred` },
  { value: 'closed', label: `${getStatusIcon('closed')} Closed` },
]

export interface StatusDropdownProps {
  value: IssueStatus
  onChange: (value: IssueStatus) => void
  error?: string
  disabled?: boolean
}

export function StatusDropdown({
  value,
  onChange,
  error,
  disabled,
}: StatusDropdownProps) {
  return (
    <FormField label="Status" htmlFor="status" error={error} required>
      <Select
        id="status"
        options={STATUS_OPTIONS}
        value={value}
        onChange={(e) => onChange(e.target.value as IssueStatus)}
        error={!!error}
        disabled={disabled}
      />
    </FormField>
  )
}
