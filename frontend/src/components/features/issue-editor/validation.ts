import type { IssueStatus } from '@/types'

// Form data structure for editing an issue
export interface IssueFormData {
  title: string
  description: string
  status: IssueStatus
  priority: number
  labels: string[]
  assignee: string
}

// Validation errors mapped by field name
export type ValidationErrors = Partial<Record<keyof IssueFormData, string>>

// Validation result
export interface ValidationResult {
  isValid: boolean
  errors: ValidationErrors
}

// Individual field validators
export function validateTitle(title: string): string | undefined {
  const trimmed = title.trim()
  if (!trimmed) {
    return 'Title is required'
  }
  if (trimmed.length < 3) {
    return 'Title must be at least 3 characters'
  }
  if (trimmed.length > 200) {
    return 'Title must be less than 200 characters'
  }
  return undefined
}

export function validateStatus(status: IssueStatus): string | undefined {
  const validStatuses: IssueStatus[] = ['open', 'in_progress', 'blocked', 'deferred', 'closed', 'tombstone']
  if (!validStatuses.includes(status)) {
    return 'Invalid status'
  }
  return undefined
}

export function validatePriority(priority: number): string | undefined {
  if (priority < 0 || priority > 4 || !Number.isInteger(priority)) {
    return 'Priority must be P0-P4'
  }
  return undefined
}

export function validateDescription(description: string): string | undefined {
  if (description.length > 10000) {
    return 'Description must be less than 10000 characters'
  }
  return undefined
}

export function validateLabels(labels: string[]): string | undefined {
  if (labels.length > 20) {
    return 'Maximum 20 labels allowed'
  }
  const invalidLabel = labels.find((label) => label.length > 50)
  if (invalidLabel) {
    return 'Labels must be less than 50 characters'
  }
  return undefined
}

export function validateAssignee(assignee: string): string | undefined {
  // Assignee is optional, so empty is valid
  if (assignee && assignee.length > 100) {
    return 'Assignee name is too long'
  }
  return undefined
}

// Full form validation
export function validateIssueForm(data: IssueFormData): ValidationResult {
  const errors: ValidationErrors = {}

  const titleError = validateTitle(data.title)
  if (titleError) errors.title = titleError

  const statusError = validateStatus(data.status)
  if (statusError) errors.status = statusError

  const priorityError = validatePriority(data.priority)
  if (priorityError) errors.priority = priorityError

  const descriptionError = validateDescription(data.description)
  if (descriptionError) errors.description = descriptionError

  const labelsError = validateLabels(data.labels)
  if (labelsError) errors.labels = labelsError

  const assigneeError = validateAssignee(data.assignee)
  if (assigneeError) errors.assignee = assigneeError

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Check if a field has been touched and should show validation
export function shouldShowError(
  fieldName: keyof IssueFormData,
  errors: ValidationErrors,
  touched: Set<string>
): string | undefined {
  if (touched.has(fieldName) && errors[fieldName]) {
    return errors[fieldName]
  }
  return undefined
}
