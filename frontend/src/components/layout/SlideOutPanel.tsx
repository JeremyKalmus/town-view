import { X } from 'lucide-react'
import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/class-utils'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { logError } from '@/lib/error-logger'

interface SlideOutPanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  children,
  className,
}: SlideOutPanelProps) {
  // Handle escape key to close panel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[400px] bg-bg-secondary border-l border-border shadow-lg',
          'transform transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'panel-title' : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-accent-rust/10 to-transparent">
          {title && (
            <h2
              id="panel-title"
              className="font-display text-lg font-semibold tracking-wide"
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent-chrome',
              !title && 'ml-auto'
            )}
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with error boundary */}
        <div className="flex-1 overflow-auto h-[calc(100%-57px)]">
          <ErrorBoundary
            variant="inline"
            title="Panel Error"
            description="Something went wrong loading this content."
            onError={(error, errorInfo) => logError('SlideOutPanel', error, errorInfo)}
            className="m-4"
          >
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </>
  )
}
