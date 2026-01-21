import { FormField, Textarea } from '@/components/ui'

export interface DescriptionTextareaProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function DescriptionTextarea({
  value,
  onChange,
  error,
  disabled,
}: DescriptionTextareaProps) {
  return (
    <FormField
      label="Description"
      htmlFor="description"
      error={error}
      hint="Detailed description, acceptance criteria, or context"
    >
      <Textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter issue description..."
        error={!!error}
        disabled={disabled}
        rows={5}
      />
    </FormField>
  )
}
