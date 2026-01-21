import { cn } from '@/lib/utils'

interface SpinnerProps {
  /** Size variant: sm (16px), md (20px), lg (24px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

/**
 * Spinner component for inline loading indicators.
 * Uses a rotating circle animation with theme-appropriate colors.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn(
        'animate-spin text-text-muted',
        sizeClasses[size],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface LoadingOverlayProps {
  /** Whether to show the overlay */
  visible?: boolean
  /** Message to display */
  message?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Full-area loading overlay with spinner and optional message.
 * Use for blocking operations that affect the entire view.
 */
export function LoadingOverlay({ visible = true, message, className }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-bg-primary/80 backdrop-blur-sm z-10',
        className
      )}
    >
      <Spinner size="lg" className="text-accent-rust" />
      {message && (
        <p className="mt-3 text-sm text-text-secondary">{message}</p>
      )}
    </div>
  )
}

interface InlineLoadingProps {
  /** Message to display */
  message?: string
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

/**
 * Inline loading indicator with spinner and message.
 * Use for in-context loading states within content areas.
 */
export function InlineLoading({ message = 'Loading...', size = 'md', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 text-text-secondary', className)}>
      <Spinner size={size} />
      <span className="text-sm">{message}</span>
    </div>
  )
}

interface ButtonSpinnerProps {
  /** Size matches button size */
  size?: 'sm' | 'md'
  /** Additional CSS classes */
  className?: string
}

/**
 * Compact spinner designed for button loading states.
 * Use inside buttons to indicate an action is in progress.
 */
export function ButtonSpinner({ size = 'sm', className }: ButtonSpinnerProps) {
  return (
    <Spinner
      size={size}
      className={cn('text-current', className)}
    />
  )
}
