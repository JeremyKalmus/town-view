import type { MoleculeProgress } from '@/types'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  /** Progress data from API */
  progress: MoleculeProgress | null
  /** Compact mode for inline display in rows */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Displays molecule step progress with an optional progress bar.
 *
 * @example
 * ```tsx
 * // Full display with progress bar
 * <ProgressIndicator progress={progress} />
 *
 * // Compact inline display (just step text)
 * <ProgressIndicator progress={progress} compact />
 * ```
 */
export function ProgressIndicator({ progress, compact = false, className }: ProgressIndicatorProps) {
  if (!progress) {
    return null
  }

  const percentage = progress.total_steps > 0
    ? Math.round((progress.current_step / progress.total_steps) * 100)
    : 0

  const stepText = `Step ${progress.current_step}/${progress.total_steps}`
  const fullText = progress.step_name
    ? `${stepText} - ${progress.step_name}`
    : stepText

  // Compact mode: just show step text inline
  if (compact) {
    return (
      <span
        className={cn(
          'text-xs text-text-secondary font-mono',
          className
        )}
        title={fullText}
      >
        {stepText}
      </span>
    )
  }

  // Full mode: step text + progress bar
  return (
    <div className={cn('space-y-1', className)}>
      {/* Step text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary truncate" title={fullText}>
          {fullText}
        </span>
        <span className="text-text-muted font-mono ml-2">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            percentage === 100
              ? 'bg-status-closed'
              : 'bg-status-in-progress'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for ProgressIndicator during loading state.
 */
export function ProgressIndicatorSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-block h-4 w-16 bg-bg-tertiary rounded animate-pulse" />
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="h-4 w-32 bg-bg-tertiary rounded animate-pulse" />
        <span className="h-4 w-10 bg-bg-tertiary rounded animate-pulse" />
      </div>
      <div className="h-1.5 bg-bg-tertiary rounded-full" />
    </div>
  )
}
