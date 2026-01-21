// Form field components
export { StatusDropdown, type StatusDropdownProps } from './StatusDropdown'
export { PriorityDropdown, type PriorityDropdownProps } from './PriorityDropdown'
export { TitleInput, type TitleInputProps } from './TitleInput'
export { DescriptionTextarea, type DescriptionTextareaProps } from './DescriptionTextarea'
export { LabelsMultiSelect, type LabelsMultiSelectProps } from './LabelsMultiSelect'
export { AssigneeDropdown, type AssigneeDropdownProps } from './AssigneeDropdown'

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
