import { useRef, useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/class-utils'

interface ViewTransitionProps {
  /** The current view key - changes trigger transition */
  viewKey: string
  /** The view content to render */
  children: ReactNode
  /** Optional CSS class for the container */
  className?: string
}

/**
 * ViewTransition component provides smooth fade/slide transitions
 * when switching between views. Uses the viewKey prop to detect changes
 * and applies enter animation on mount/change.
 */
export function ViewTransition({ viewKey, children, className }: ViewTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentKey, setCurrentKey] = useState(viewKey)
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (viewKey !== currentKey) {
      // View is changing - trigger exit animation briefly, then enter
      setIsAnimating(true)

      // Short delay for exit effect, then switch content and animate in
      timeoutRef.current = window.setTimeout(() => {
        setCurrentKey(viewKey)
        setDisplayedChildren(children)
        // Reset animation after enter completes
        timeoutRef.current = window.setTimeout(() => {
          setIsAnimating(false)
        }, 200) // Match animation duration
      }, 50) // Brief exit delay
    } else {
      // Same view, just update children
      setDisplayedChildren(children)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [viewKey, children, currentKey])

  return (
    <div
      key={currentKey}
      className={cn(
        'w-full h-full',
        isAnimating ? 'animate-view-enter' : '',
        className
      )}
    >
      {displayedChildren}
    </div>
  )
}

/**
 * SimpleViewTransition is a lighter alternative that just applies
 * the enter animation when the key changes. No exit animation.
 */
interface SimpleViewTransitionProps {
  /** The current view key - changes trigger animation */
  viewKey: string
  /** The view content to render */
  children: ReactNode
  /** Optional CSS class for the container */
  className?: string
}

export function SimpleViewTransition({ viewKey, children, className }: SimpleViewTransitionProps) {
  return (
    <div
      key={viewKey}
      className={cn(
        'w-full h-full animate-view-enter',
        className
      )}
    >
      {children}
    </div>
  )
}
