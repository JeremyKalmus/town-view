import { useEffect, useCallback, useRef } from 'react'

export interface ShortcutDefinition {
  key: string
  description: string
  category: 'navigation' | 'actions' | 'general'
}

export interface KeyboardShortcutsConfig {
  /** Called when search shortcut (/) is triggered */
  onSearch?: () => void
  /** Called when dashboard shortcut (g+d) is triggered */
  onNavigateDashboard?: () => void
  /** Called when roadmap shortcut (g+r) is triggered */
  onNavigateRoadmap?: () => void
  /** Called when audit shortcut (g+a) is triggered */
  onNavigateAudit?: () => void
  /** Called when help shortcut (?) is triggered */
  onShowHelp?: () => void
  /** Called when Escape is pressed (for closing modals/panels) */
  onEscape?: () => void
  /** Whether to enable shortcuts (disable when modal is open, etc.) */
  enabled?: boolean
}

/**
 * All available keyboard shortcuts with descriptions.
 */
export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation
  { key: 'g d', description: 'Go to Dashboard', category: 'navigation' },
  { key: 'g r', description: 'Go to Roadmap', category: 'navigation' },
  { key: 'g a', description: 'Go to Audit', category: 'navigation' },
  // Actions
  { key: '/', description: 'Focus search', category: 'actions' },
  { key: 'Esc', description: 'Close panel/modal', category: 'actions' },
  // General
  { key: '?', description: 'Show keyboard shortcuts', category: 'general' },
]

/**
 * Check if the current focus is on an input element that should capture keyboard input.
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  // Check for contenteditable
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true
  }

  return false
}

/**
 * Hook for global keyboard shortcuts.
 *
 * Supports:
 * - Sequence shortcuts (g+d, g+r, g+a)
 * - Single key shortcuts (/, ?, Esc)
 * - Automatic disabling when input elements are focused
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onSearch: () => searchInputRef.current?.focus(),
 *   onNavigateDashboard: () => setView('dashboard'),
 *   onShowHelp: () => setHelpOpen(true),
 *   onEscape: () => closeAllPanels(),
 * })
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onSearch,
    onNavigateDashboard,
    onNavigateRoadmap,
    onNavigateAudit,
    onShowHelp,
    onEscape,
    enabled = true,
  } = config

  // Track sequence state for g+X shortcuts
  const sequenceRef = useRef<{ key: string; timestamp: number } | null>(null)
  const SEQUENCE_TIMEOUT = 500 // ms to wait for second key in sequence

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs (except Escape)
      if (e.key !== 'Escape' && isInputFocused()) {
        // Clear sequence if typing in input
        sequenceRef.current = null
        return
      }

      const now = Date.now()
      const key = e.key.toLowerCase()

      // Handle Escape
      if (e.key === 'Escape') {
        onEscape?.()
        sequenceRef.current = null
        return
      }

      // Check for sequence continuation (g+X)
      if (sequenceRef.current && now - sequenceRef.current.timestamp < SEQUENCE_TIMEOUT) {
        const firstKey = sequenceRef.current.key

        if (firstKey === 'g') {
          e.preventDefault()
          sequenceRef.current = null

          switch (key) {
            case 'd':
              onNavigateDashboard?.()
              return
            case 'r':
              onNavigateRoadmap?.()
              return
            case 'a':
              onNavigateAudit?.()
              return
          }
        }
      }

      // Start a new sequence or handle single-key shortcuts
      switch (key) {
        case 'g':
          // Start g+X sequence
          sequenceRef.current = { key: 'g', timestamp: now }
          return

        case '/':
          e.preventDefault()
          sequenceRef.current = null
          onSearch?.()
          return

        case '?':
          e.preventDefault()
          sequenceRef.current = null
          onShowHelp?.()
          return

        default:
          // Clear sequence on any other key
          sequenceRef.current = null
      }
    },
    [enabled, onSearch, onNavigateDashboard, onNavigateRoadmap, onNavigateAudit, onShowHelp, onEscape]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Get shortcuts grouped by category.
 */
export function getShortcutsByCategory(): Record<string, ShortcutDefinition[]> {
  return KEYBOARD_SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, ShortcutDefinition[]>
  )
}
