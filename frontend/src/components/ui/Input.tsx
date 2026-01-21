import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm',
          'placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent-chrome focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          error
            ? 'border-status-blocked focus:ring-status-blocked'
            : 'border-border hover:border-border-accent',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
