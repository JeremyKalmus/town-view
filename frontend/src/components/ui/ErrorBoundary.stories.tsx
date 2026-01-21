import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

const meta: Meta<typeof ErrorBoundary> = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

// Component that throws an error on demand
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error: Component crashed!')
  }
  return (
    <div className="p-4 bg-bg-secondary rounded-md">
      <p className="text-text-primary">This component is working correctly.</p>
    </div>
  )
}

// Component that allows toggling the error state
function ErrorToggle({ variant }: { variant?: 'full' | 'inline' | 'minimal' }) {
  const [hasError, setHasError] = useState(false)
  const [key, setKey] = useState(0)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => {
            setHasError(true)
            setKey(k => k + 1)
          }}
          className="px-4 py-2 bg-status-blocked text-white rounded-md hover:bg-status-blocked/80"
        >
          Trigger Error
        </button>
        <button
          onClick={() => {
            setHasError(false)
            setKey(k => k + 1)
          }}
          className="px-4 py-2 bg-bg-tertiary border border-border rounded-md hover:bg-border"
        >
          Reset
        </button>
      </div>
      <ErrorBoundary
        key={key}
        variant={variant}
        title="Component Error"
        description="The component encountered an unexpected error."
        onError={(error) => console.log('[Story] Error caught:', error.message)}
      >
        <BuggyComponent shouldThrow={hasError} />
      </ErrorBoundary>
    </div>
  )
}

export const Default: Story = {
  render: () => <ErrorToggle />,
}

export const FullVariant: Story = {
  render: () => (
    <div className="h-64">
      <ErrorToggle variant="full" />
    </div>
  ),
}

export const InlineVariant: Story = {
  render: () => <ErrorToggle variant="inline" />,
}

export const MinimalVariant: Story = {
  render: () => <ErrorToggle variant="minimal" />,
}

export const WithCustomFallback: Story = {
  render: () => {
    const [hasError, setHasError] = useState(false)
    const [key, setKey] = useState(0)

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setHasError(true)
              setKey(k => k + 1)
            }}
            className="px-4 py-2 bg-status-blocked text-white rounded-md hover:bg-status-blocked/80"
          >
            Trigger Error
          </button>
          <button
            onClick={() => {
              setHasError(false)
              setKey(k => k + 1)
            }}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-md hover:bg-border"
          >
            Reset
          </button>
        </div>
        <ErrorBoundary
          key={key}
          fallback={
            <div className="p-6 bg-accent-rust/10 border border-accent-rust/30 rounded-md text-center">
              <p className="text-accent-rust font-semibold mb-2">Custom Fallback UI</p>
              <p className="text-sm text-text-secondary">
                This is a completely custom fallback component.
              </p>
            </div>
          }
        >
          <BuggyComponent shouldThrow={hasError} />
        </ErrorBoundary>
      </div>
    )
  },
}

export const WithoutRetry: Story = {
  render: () => {
    const [hasError, setHasError] = useState(false)
    const [key, setKey] = useState(0)

    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setHasError(true)
            setKey(k => k + 1)
          }}
          className="px-4 py-2 bg-status-blocked text-white rounded-md hover:bg-status-blocked/80"
        >
          Trigger Error
        </button>
        <ErrorBoundary
          key={key}
          showRetry={false}
          title="Permanent Error"
          description="This error cannot be recovered from."
        >
          <BuggyComponent shouldThrow={hasError} />
        </ErrorBoundary>
      </div>
    )
  },
}

export const AllVariantsComparison: Story = {
  render: () => {
    // Pre-crashed state for demonstration
    const CrashedContent = () => {
      throw new Error('Demo error')
    }

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Full Variant</h3>
          <div className="h-64 bg-bg-secondary rounded-md">
            <ErrorBoundary variant="full" title="Full Error" description="Full variant with centered layout.">
              <CrashedContent />
            </ErrorBoundary>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Inline Variant</h3>
          <ErrorBoundary variant="inline" title="Inline Error" description="Inline variant with compact layout.">
            <CrashedContent />
          </ErrorBoundary>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Minimal Variant</h3>
          <ErrorBoundary variant="minimal" title="Minimal Error">
            <CrashedContent />
          </ErrorBoundary>
        </div>
      </div>
    )
  },
}
