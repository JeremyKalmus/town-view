import {
  FormField,
  Input,
  Textarea,
  Select,
  MultiSelect,
  type SelectOption,
  type MultiSelectOption,
} from '@/components/ui'
import type { IssueStatus } from '@/types'
import { getStatusIcon } from '@/lib/status-utils'

// ============================================================================
// Field Type Discriminated Unions
// ============================================================================

interface InputFieldSpec {
  type: 'input'
  inputType?: string
  placeholder?: string
  maxLength?: number
}

interface TextareaFieldSpec {
  type: 'textarea'
  placeholder?: string
  rows?: number
}

interface SelectFieldSpec {
  type: 'select'
  options: SelectOption[]
}

interface MultiSelectFieldSpec {
  type: 'multiselect'
  options: MultiSelectOption[]
  placeholder?: string
  allowCreate?: boolean
}

type FieldSpec = InputFieldSpec | TextareaFieldSpec | SelectFieldSpec | MultiSelectFieldSpec

// ============================================================================
// Field Configuration
// ============================================================================

interface BaseFieldConfig {
  label: string
  id: string
  hint?: string
  required?: boolean
}

export type FieldConfig<T extends FieldSpec = FieldSpec> = BaseFieldConfig & T

// ============================================================================
// Pre-defined Field Configurations
// ============================================================================

export const TITLE_FIELD: FieldConfig<InputFieldSpec> = {
  type: 'input',
  label: 'Title',
  id: 'title',
  required: true,
  hint: 'A clear, concise summary of the issue',
  placeholder: 'Enter issue title...',
  maxLength: 200,
}

export const DESCRIPTION_FIELD: FieldConfig<TextareaFieldSpec> = {
  type: 'textarea',
  label: 'Description',
  id: 'description',
  hint: 'Detailed description, acceptance criteria, or context',
  placeholder: 'Enter issue description...',
  rows: 5,
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'open', label: `${getStatusIcon('open')} Open` },
  { value: 'in_progress', label: `${getStatusIcon('in_progress')} In Progress` },
  { value: 'blocked', label: `${getStatusIcon('blocked')} Blocked` },
  { value: 'deferred', label: `${getStatusIcon('deferred')} Deferred` },
  { value: 'closed', label: `${getStatusIcon('closed')} Closed` },
]

export const STATUS_FIELD: FieldConfig<SelectFieldSpec> = {
  type: 'select',
  label: 'Status',
  id: 'status',
  required: true,
  options: STATUS_OPTIONS,
}

export const PRIORITY_OPTIONS: SelectOption[] = [
  { value: '0', label: 'P0 - Critical' },
  { value: '1', label: 'P1 - High' },
  { value: '2', label: 'P2 - Medium' },
  { value: '3', label: 'P3 - Low' },
  { value: '4', label: 'P4 - Minimal' },
]

export const PRIORITY_FIELD: FieldConfig<SelectFieldSpec> = {
  type: 'select',
  label: 'Priority',
  id: 'priority',
  required: true,
  options: PRIORITY_OPTIONS,
}

export const ASSIGNEE_FIELD: FieldConfig<SelectFieldSpec> = {
  type: 'select',
  label: 'Assignee',
  id: 'assignee',
  hint: 'Who is responsible for this issue',
  options: [], // Populated dynamically
}

export const SUGGESTED_LABELS: MultiSelectOption[] = [
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

export const LABELS_FIELD: FieldConfig<MultiSelectFieldSpec> = {
  type: 'multiselect',
  label: 'Labels',
  id: 'labels',
  hint: 'Add labels to categorize this issue',
  options: SUGGESTED_LABELS,
  placeholder: 'Add labels...',
  allowCreate: true,
}

// ============================================================================
// FormFieldWrapper Component
// ============================================================================

// Value types for each field type
type FieldValue<T extends FieldSpec> = T extends MultiSelectFieldSpec
  ? string[]
  : string

// Props with discriminated union for type safety
export interface FormFieldWrapperProps<T extends FieldSpec> {
  config: FieldConfig<T>
  value: FieldValue<T>
  onChange: (value: FieldValue<T>) => void
  error?: string
  disabled?: boolean
  // Allow overriding options dynamically (for assignee dropdown)
  options?: T extends SelectFieldSpec
    ? SelectOption[]
    : T extends MultiSelectFieldSpec
      ? MultiSelectOption[]
      : never
}

export function FormFieldWrapper<T extends FieldSpec>({
  config,
  value,
  onChange,
  error,
  disabled,
  options,
}: FormFieldWrapperProps<T>) {
  const renderField = () => {
    switch (config.type) {
      case 'input': {
        const inputConfig = config as FieldConfig<InputFieldSpec>
        return (
          <Input
            id={inputConfig.id}
            type={inputConfig.inputType ?? 'text'}
            value={value as string}
            onChange={(e) => onChange(e.target.value as FieldValue<T>)}
            placeholder={inputConfig.placeholder}
            error={!!error}
            disabled={disabled}
            maxLength={inputConfig.maxLength}
          />
        )
      }

      case 'textarea': {
        const textareaConfig = config as FieldConfig<TextareaFieldSpec>
        return (
          <Textarea
            id={textareaConfig.id}
            value={value as string}
            onChange={(e) => onChange(e.target.value as FieldValue<T>)}
            placeholder={textareaConfig.placeholder}
            error={!!error}
            disabled={disabled}
            rows={textareaConfig.rows}
          />
        )
      }

      case 'select': {
        const selectConfig = config as FieldConfig<SelectFieldSpec>
        const selectOptions = (options as SelectOption[] | undefined) ?? selectConfig.options
        return (
          <Select
            id={selectConfig.id}
            options={selectOptions}
            value={value as string}
            onChange={(e) => onChange(e.target.value as FieldValue<T>)}
            error={!!error}
            disabled={disabled}
          />
        )
      }

      case 'multiselect': {
        const multiConfig = config as FieldConfig<MultiSelectFieldSpec>
        const multiOptions = (options as MultiSelectOption[] | undefined) ?? multiConfig.options
        return (
          <MultiSelect
            options={multiOptions}
            value={value as string[]}
            onChange={(v) => onChange(v as FieldValue<T>)}
            placeholder={multiConfig.placeholder}
            error={!!error}
            disabled={disabled}
            allowCreate={multiConfig.allowCreate}
          />
        )
      }

      default:
        return null
    }
  }

  return (
    <FormField
      label={config.label}
      htmlFor={config.id}
      error={error}
      required={config.required}
      hint={config.hint}
    >
      {renderField()}
    </FormField>
  )
}

// ============================================================================
// Convenience Wrapper Components (backward compatibility)
// ============================================================================

export interface TitleInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function TitleInput({ value, onChange, error, disabled }: TitleInputProps) {
  return (
    <FormFieldWrapper
      config={TITLE_FIELD}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  )
}

export interface DescriptionTextareaProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function DescriptionTextarea({ value, onChange, error, disabled }: DescriptionTextareaProps) {
  return (
    <FormFieldWrapper
      config={DESCRIPTION_FIELD}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  )
}

export interface StatusDropdownProps {
  value: IssueStatus
  onChange: (value: IssueStatus) => void
  error?: string
  disabled?: boolean
}

export function StatusDropdown({ value, onChange, error, disabled }: StatusDropdownProps) {
  return (
    <FormFieldWrapper
      config={STATUS_FIELD}
      value={value}
      onChange={(v) => onChange(v as IssueStatus)}
      error={error}
      disabled={disabled}
    />
  )
}

export interface PriorityDropdownProps {
  value: number
  onChange: (value: number) => void
  error?: string
  disabled?: boolean
}

export function PriorityDropdown({ value, onChange, error, disabled }: PriorityDropdownProps) {
  return (
    <FormFieldWrapper
      config={PRIORITY_FIELD}
      value={String(value)}
      onChange={(v) => onChange(parseInt(v, 10))}
      error={error}
      disabled={disabled}
    />
  )
}

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
  const options: SelectOption[] = [{ value: '', label: 'Unassigned' }, ...availableAssignees]
  return (
    <FormFieldWrapper
      config={ASSIGNEE_FIELD}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      options={options}
    />
  )
}

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
    <FormFieldWrapper
      config={LABELS_FIELD}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      options={availableLabels}
    />
  )
}
