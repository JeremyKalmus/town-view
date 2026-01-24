import { useState, useCallback, useEffect } from 'react'
import type { Issue } from '@/types'
import type { SelectOption } from '@/components/ui'
import {
  StatusDropdown,
  PriorityDropdown,
  TitleInput,
  DescriptionTextarea,
  LabelsMultiSelect,
  AssigneeDropdown,
} from './FormFieldWrapper'
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Metadata section (read-only) */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary pb-3 mb-1 border-b border-border">
        {issue.created_by && (
          <span title={issue.created_by}>
            <span className="text-text-muted">Created by:</span>{' '}
            <span className="text-text-primary">@{issue.created_by.split('/').pop()}</span>
          </span>
        )}
        {issue.created_at && (
          <span>
            <span className="text-text-secondary">Created:</span>{' '}
            {formatDate(issue.created_at)}
          </span>
        )}
        {issue.updated_at && (
          <span>
            <span className="text-text-secondary">Updated:</span>{' '}
            {formatDate(issue.updated_at)}
          </span>
        )}
      </div>

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
