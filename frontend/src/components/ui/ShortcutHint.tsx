import { cn } from '@/lib/class-utils'

interface ShortcutHintProps {
  /** Keyboard key(s) to display (e.g., "/", "g d", "Esc") */
  keys: string
  /** Optional label to show before the keys */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Additional CSS classes */
  className?: string
}

/**
 * Displays a keyboard shortcut hint inline with other content.
 * Used to show users available shortcuts for actions.
 *
 * @example
 * ```tsx
 * <ShortcutHint keys="/" label="Search" />
 * <ShortcutHint keys="g d" />
 * <ShortcutHint keys="Esc" size="sm" />
 * ```
 */
export function ShortcutHint({ keys, label, size = 'md', className }: ShortcutHintProps) {
  const keyParts = keys.split(' ')

  const sizeClasses = {
    sm: {
      container: 'gap-0.5',
      key: 'min-w-[18px] h-[18px] px-1 text-[10px]',
      label: 'text-[10px]',
      separator: 'text-[10px]',
    },
    md: {
      container: 'gap-1',
      key: 'min-w-[22px] h-[22px] px-1.5 text-xs',
      label: 'text-xs',
      separator: 'text-xs',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <span className={cn('inline-flex items-center', sizes.container, className)}>
      {label && (
        <span className={cn('text-text-muted mr-1', sizes.label)}>{label}</span>
      )}
      {keyParts.map((key, index) => (
        <span key={index} className={cn('inline-flex items-center', sizes.container)}>
          <kbd
            className={cn(
              'inline-flex items-center justify-center',
              'bg-bg-tertiary border border-border rounded',
              'font-mono text-text-secondary',
              'shadow-[0_1px_0_0_rgba(0,0,0,0.2)]',
              sizes.key
            )}
          >
            {key}
          </kbd>
          {index < keyParts.length - 1 && (
            <span className={cn('text-text-muted mx-0.5', sizes.separator)}>+</span>
          )}
        </span>
      ))}
    </span>
  )
}

/**
 * A row displaying a shortcut with its description.
 * Useful for tooltips or inline help.
 */
interface ShortcutRowProps {
  keys: string
  description: string
  className?: string
}

export function ShortcutRow({ keys, description, className }: ShortcutRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="text-sm text-text-secondary">{description}</span>
      <ShortcutHint keys={keys} size="sm" />
    </div>
  )
}
