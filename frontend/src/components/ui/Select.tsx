import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  placeholder?: string
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-9 w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-accent-chrome focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors cursor-pointer',
          'appearance-none bg-no-repeat bg-right',
          // Chevron down icon as background
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A3A3A3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px_16px] bg-[right_8px_center]",
          error
            ? 'border-status-blocked focus:ring-status-blocked'
            : 'border-border hover:border-border-accent',
          className
        )}
        ref={ref}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    )
  }
)

Select.displayName = 'Select'
