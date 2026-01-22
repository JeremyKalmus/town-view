import { useEffect, useCallback } from 'react'
import { X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/class-utils'
import { getShortcutsByCategory } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  general: 'General',
}

const CATEGORY_ORDER = ['navigation', 'actions', 'general']

/**
 * Modal displaying all available keyboard shortcuts.
 * Press ? to open, Escape to close.
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Handle escape key to close
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
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const shortcutsByCategory = getShortcutsByCategory()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-md bg-bg-secondary border border-border rounded-lg shadow-xl',
          'animate-slide-up'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent-rust" />
            <h2 id="shortcuts-modal-title" className="font-display text-lg font-semibold">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent-chrome'
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-auto">
          {CATEGORY_ORDER.map((category) => {
            const shortcuts = shortcutsByCategory[category]
            if (!shortcuts?.length) return null

            return (
              <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-text-secondary">
                        {shortcut.description}
                      </span>
                      <ShortcutKeys keys={shortcut.key} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-bg-tertiary/50 rounded-b-lg">
          <p className="text-xs text-text-muted text-center">
            Press <ShortcutKey>?</ShortcutKey> to show this help at any time
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * Renders keyboard shortcut keys with proper styling.
 */
function ShortcutKeys({ keys }: { keys: string }) {
  // Split keys like "g d" into individual keys
  const keyParts = keys.split(' ')

  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          <ShortcutKey>{key}</ShortcutKey>
          {index < keyParts.length - 1 && (
            <span className="text-text-muted text-xs">then</span>
          )}
        </span>
      ))}
    </div>
  )
}

/**
 * Individual keyboard key badge.
 */
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
        'bg-bg-tertiary border border-border rounded',
        'text-xs font-mono text-text-primary',
        'shadow-[0_1px_0_1px_rgba(0,0,0,0.3)]'
      )}
    >
      {children}
    </kbd>
  )
}

export { ShortcutKey }
