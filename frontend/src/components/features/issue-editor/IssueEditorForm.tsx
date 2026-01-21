import { useState, useCallback, useEffect } from 'react'
import type { Issue } from '@/types'
import type { SelectOption } from '@/components/ui'
import { StatusDropdown } from './StatusDropdown'
import { PriorityDropdown } from './PriorityDropdown'
import { TitleInput } from './TitleInput'
import { DescriptionTextarea } from './DescriptionTextarea'
import { LabelsMultiSelect } from './LabelsMultiSelect'
import { AssigneeDropdown } from './AssigneeDropdown'
import {
  type IssueFormData,
  type ValidationErrors,
  validateIssueForm,
  shouldShowError,
} from './validation'

export interface IssueEditorFormProps {
  issue: Issue
  availableAssignees?: SelectOption[]
  onChange?: (data: IssueFormData, isValid: boolean) => void
  disabled?: boolean
}

export function IssueEditorForm({
  issue,
  availableAssignees = [],
  onChange,
  disabled = false,
}: IssueEditorFormProps) {
  // Form state
  const [formData, setFormData] = useState<IssueFormData>({
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    labels: issue.labels ?? [],
    assignee: issue.assignee ?? '',
  })

  // Track which fields have been touched for validation display
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Validate form whenever data changes
  useEffect(() => {
    const result = validateIssueForm(formData)
    setErrors(result.errors)
    onChange?.(formData, result.isValid)
  }, [formData, onChange])

  // Reset form when issue changes
  useEffect(() => {
    setFormData({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      labels: issue.labels ?? [],
      assignee: issue.assignee ?? '',
    })
    setTouched(new Set())
  }, [issue.id, issue.title, issue.description, issue.status, issue.priority, issue.labels, issue.assignee])

  // Field change handlers
  const handleFieldChange = useCallback(
    <K extends keyof IssueFormData>(field: K, value: IssueFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setTouched((prev) => new Set(prev).add(field))
    },
    []
  )

  // Mark field as touched on blur
  const markTouched = useCallback((field: keyof IssueFormData) => {
    setTouched((prev) => new Set(prev).add(field))
  }, [])

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Title - most important field */}
      <div onBlur={() => markTouched('title')}>
        <TitleInput
          value={formData.title}
          onChange={(value) => handleFieldChange('title', value)}
          error={shouldShowError('title', errors, touched)}
          disabled={disabled}
        />
      </div>

      {/* Status and Priority - side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div onBlur={() => markTouched('status')}>
          <StatusDropdown
            value={formData.status}
            onChange={(value) => handleFieldChange('status', value)}
            error={shouldShowError('status', errors, touched)}
            disabled={disabled}
          />
        </div>
        <div onBlur={() => markTouched('priority')}>
          <PriorityDropdown
            value={formData.priority}
            onChange={(value) => handleFieldChange('priority', value)}
            error={shouldShowError('priority', errors, touched)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Description */}
      <div onBlur={() => markTouched('description')}>
        <DescriptionTextarea
          value={formData.description}
          onChange={(value) => handleFieldChange('description', value)}
          error={shouldShowError('description', errors, touched)}
          disabled={disabled}
        />
      </div>

      {/* Labels */}
      <div onBlur={() => markTouched('labels')}>
        <LabelsMultiSelect
          value={formData.labels}
          onChange={(value) => handleFieldChange('labels', value)}
          error={shouldShowError('labels', errors, touched)}
          disabled={disabled}
        />
      </div>

      {/* Assignee */}
      <div onBlur={() => markTouched('assignee')}>
        <AssigneeDropdown
          value={formData.assignee}
          onChange={(value) => handleFieldChange('assignee', value)}
          availableAssignees={availableAssignees}
          error={shouldShowError('assignee', errors, touched)}
          disabled={disabled}
        />
      </div>
    </form>
  )
}
