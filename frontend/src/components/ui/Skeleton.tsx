import { cn } from '@/lib/class-utils'

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  /** The error message to display */
  message: string
  /** Optional title (defaults to "Something went wrong") */
  title?: string
  /** Optional retry handler - if provided, shows a retry button */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * ErrorState component for displaying error messages consistently.
 * Use this when data fetching fails or an error occurs in a view.
 */
export function ErrorState({
  message,
  title = 'Something went wrong',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Error icon */}
      <div className="w-12 h-12 rounded-full bg-status-blocked/10 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-status-blocked"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-text-primary font-medium mb-1">{title}</h3>

      {/* Message */}
      <p className="text-text-muted text-sm text-center max-w-md mb-4">{message}</p>

      {/* Retry button (optional) */}
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            'bg-bg-tertiary text-text-primary',
            'hover:bg-bg-tertiary/80 transition-colors',
            'flex items-center gap-2'
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try again
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Skeleton Components
// ============================================================================

interface SkeletonProps {
  className?: string
}

/**
 * Skeleton component for loading placeholders.
 * Displays an animated shimmer effect to indicate content is loading.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-bg-tertiary',
        className
      )}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

/**
 * Skeleton for text content with variable line count.
 */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            // Last line is shorter for natural look
            i === lines - 1 && 'w-2/3'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for an issue row in the list.
 */
export function SkeletonIssueRow() {
  return (
    <div className="flex items-center gap-3 py-3 px-2">
      {/* Priority badge */}
      <Skeleton className="w-8 h-5 flex-shrink-0" />

      {/* Status badge */}
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />

      {/* Issue ID */}
      <Skeleton className="w-24 h-4 flex-shrink-0" />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4 mt-1.5" />
      </div>

      {/* Type badge */}
      <Skeleton className="w-12 h-5 flex-shrink-0" />

      {/* Timestamp */}
      <Skeleton className="w-12 h-3 flex-shrink-0" />
    </div>
  )
}

/**
 * Skeleton for multiple issue rows.
 */
export function SkeletonIssueList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonIssueRow key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for stat cards.
 */
export function SkeletonStatCard() {
  return (
    <div className="card">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-12" />
    </div>
  )
}

/**
 * Skeleton for the stat cards grid.
 */
export function SkeletonStatGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>
  )
}

/**
 * Skeleton for a sidebar rig item.
 */
export function SkeletonRigItem() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="w-8 h-4 flex-shrink-0" />
    </div>
  )
}

/**
 * Skeleton for the sidebar rig list.
 */
export function SkeletonRigList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRigItem key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for a tree node item.
 */
export function SkeletonTreeNode({ depth = 0 }: { depth?: number }) {
  return (
    <div
      className="flex items-center gap-2 py-2"
      style={{ paddingLeft: `${depth * 24 + 8}px` }}
    >
      {/* Expand/collapse placeholder */}
      <Skeleton className="w-4 h-4 flex-shrink-0" />

      {/* Status indicator */}
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />

      {/* Issue ID */}
      <Skeleton className="w-20 h-4 flex-shrink-0" />

      {/* Title */}
      <Skeleton className="h-4 flex-1 max-w-xs" />

      {/* Type badge */}
      <Skeleton className="w-12 h-5 flex-shrink-0" />
    </div>
  )
}

/**
 * Skeleton for a tree view with nested structure.
 */
export function SkeletonTreeView({ count = 5 }: { count?: number }) {
  // Generate a realistic tree structure with varied depths
  const nodes = [
    { depth: 0 },
    { depth: 1 },
    { depth: 1 },
    { depth: 2 },
    { depth: 2 },
    { depth: 1 },
    { depth: 0 },
    { depth: 1 },
  ].slice(0, count)

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => (
        <SkeletonTreeNode key={i} depth={node.depth} />
      ))}
    </div>
  )
}

/**
 * Skeleton for an agent card.
 */
export function SkeletonAgentCard() {
  return (
    <div className="card">
      {/* Agent name and role icon */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* State indicator */}
      <Skeleton className="h-3 w-16 mb-2" />

      {/* Hooked bead placeholder */}
      <Skeleton className="h-8 w-full mt-3" />
    </div>
  )
}

/**
 * Skeleton for agent cards grid.
 */
export function SkeletonAgentGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for work row items (in-flight or completed work).
 */
export function SkeletonWorkRow() {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      {/* Issue ID */}
      <Skeleton className="w-24 h-4 flex-shrink-0" />

      {/* Title */}
      <Skeleton className="h-4 flex-1" />

      {/* Agent indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
        <Skeleton className="w-16 h-4" />
      </div>

      {/* Type badge */}
      <Skeleton className="w-12 h-5 flex-shrink-0" />
    </div>
  )
}

/**
 * Skeleton for work list (in-flight or completed).
 */
export function SkeletonWorkList({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonWorkRow key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for completed work item with expand button.
 */
export function SkeletonCompletedWorkItem() {
  return (
    <div className="border border-border rounded-md">
      <div className="px-4 py-3 flex items-center gap-4">
        {/* Status icon */}
        <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />

        {/* Issue ID */}
        <Skeleton className="w-20 h-4 flex-shrink-0" />

        {/* Title */}
        <Skeleton className="h-4 flex-1" />

        {/* Closed date */}
        <Skeleton className="w-20 h-4 flex-shrink-0" />

        {/* Expand indicator */}
        <Skeleton className="w-4 h-4 flex-shrink-0" />
      </div>
    </div>
  )
}

/**
 * Skeleton for completed work list.
 */
export function SkeletonCompletedWorkList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCompletedWorkItem key={i} />
      ))}
    </div>
  )
}
