import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/class-utils'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback UI to show when an error occurs */
  fallback?: ReactNode
  /** Title shown in the default fallback UI */
  title?: string
  /** Description shown in the default fallback UI */
  description?: string
  /** Called when an error is caught - useful for logging */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Whether to show the retry button in the default fallback */
  showRetry?: boolean
  /** Custom className for the error container */
  className?: string
  /** Variant affects the visual style */
  variant?: 'full' | 'inline' | 'minimal'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    const {
      children,
      fallback,
      title = 'Something went wrong',
      description = 'An unexpected error occurred in this section.',
      showRetry = true,
      className,
      variant = 'full',
    } = this.props

    if (this.state.hasError) {
      // Custom fallback takes precedence
      if (fallback) {
        return fallback
      }

      // Default fallback UI based on variant
      if (variant === 'minimal') {
        return (
          <div className={cn('flex items-center gap-2 text-status-blocked text-sm p-2', className)}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{title}</span>
            {showRetry && (
              <button
                onClick={this.handleRetry}
                className="text-text-secondary hover:text-text-primary ml-auto"
                aria-label="Retry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      }

      if (variant === 'inline') {
        return (
          <div
            className={cn(
              'rounded-md border border-status-blocked/30 bg-status-blocked/10 p-4',
              className
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-blocked flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-status-blocked">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
                {showRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      // Full variant (default)
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center p-8 text-center',
            className
          )}
        >
          <div className="w-16 h-16 rounded-full bg-status-blocked/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-status-blocked" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          <p className="text-text-secondary max-w-md mb-4">{description}</p>
          {showRetry && (
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-bg-tertiary border border-border text-text-primary hover:bg-border transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          )}
          {this.state.error && (
            <details className="mt-4 text-left max-w-md w-full">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
                Technical details
              </summary>
              <pre className="mt-2 p-3 bg-bg-tertiary rounded-md text-xs text-text-muted overflow-auto max-h-32 mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return children
  }
}

export type { ErrorBoundaryProps }
