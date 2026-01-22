// Form field components (consolidated in FormFieldWrapper)
export {
  FormFieldWrapper,
  type FormFieldWrapperProps,
  type FieldConfig,
  // Pre-defined field configurations
  TITLE_FIELD,
  DESCRIPTION_FIELD,
  STATUS_FIELD,
  STATUS_OPTIONS,
  PRIORITY_FIELD,
  PRIORITY_OPTIONS,
  ASSIGNEE_FIELD,
  LABELS_FIELD,
  SUGGESTED_LABELS,
  // Backward-compatible wrapper components
  StatusDropdown,
  type StatusDropdownProps,
  PriorityDropdown,
  type PriorityDropdownProps,
  TitleInput,
  type TitleInputProps,
  DescriptionTextarea,
  type DescriptionTextareaProps,
  LabelsMultiSelect,
  type LabelsMultiSelectProps,
  AssigneeDropdown,
  type AssigneeDropdownProps,
} from './FormFieldWrapper'

// Main form component
export { IssueEditorForm, type IssueEditorFormProps } from './IssueEditorForm'

// Validation utilities
export {
  type IssueFormData,
  type ValidationErrors,
  type ValidationResult,
  validateIssueForm,
  validateTitle,
  validateStatus,
  validatePriority,
  validateDescription,
  validateLabels,
  validateAssignee,
  shouldShowError,
} from './validation'
