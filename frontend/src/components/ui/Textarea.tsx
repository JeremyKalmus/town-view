import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/class-utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm',
          'placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent-chrome focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y transition-colors',
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

Textarea.displayName = 'Textarea'
