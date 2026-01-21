import { FormField, Input } from '@/components/ui'

export interface TitleInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function TitleInput({
  value,
  onChange,
  error,
  disabled,
}: TitleInputProps) {
  return (
    <FormField
      label="Title"
      htmlFor="title"
      error={error}
      required
      hint="A clear, concise summary of the issue"
    >
      <Input
        id="title"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter issue title..."
        error={!!error}
        disabled={disabled}
        maxLength={200}
      />
    </FormField>
  )
}
