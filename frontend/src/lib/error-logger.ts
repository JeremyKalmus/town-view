/**
 * Error logging utility for debugging component crashes.
 * Provides structured error reporting with component context.
 */

interface ErrorLogEntry {
  timestamp: string
  component: string
  error: {
    name: string
    message: string
    stack?: string
  }
  componentStack?: string | null
}

// In-memory error log for debugging (can be accessed via window.__errorLog in dev)
const errorLog: ErrorLogEntry[] = []
const MAX_LOG_ENTRIES = 50

/**
 * Log an error caught by an ErrorBoundary
 */
export function logError(
  component: string,
  error: Error,
  errorInfo?: React.ErrorInfo
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    component,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo?.componentStack,
  }

  // Add to in-memory log
  errorLog.push(entry)

  // Keep log size bounded
  if (errorLog.length > MAX_LOG_ENTRIES) {
    errorLog.shift()
  }

  // Log to console with structured format
  console.group(`[ErrorLog] ${component}`)
  console.error('Error:', error)
  if (errorInfo?.componentStack) {
    console.error('Component Stack:', errorInfo.componentStack)
  }
  console.groupEnd()

  // In development, also expose to window for debugging
  if (process.env.NODE_ENV !== 'production') {
    ;(window as unknown as { __errorLog: ErrorLogEntry[] }).__errorLog = errorLog
  }
}

/**
 * Get all logged errors (useful for debugging)
 */
export function getErrorLog(): readonly ErrorLogEntry[] {
  return errorLog
}

/**
 * Clear the error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0
}

/**
 * Get recent errors for a specific component
 */
export function getComponentErrors(component: string): ErrorLogEntry[] {
  return errorLog.filter((entry) => entry.component === component)
}
