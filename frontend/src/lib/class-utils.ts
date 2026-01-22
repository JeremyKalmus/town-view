import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge.
 * Useful for conditional classes and merging Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a type-safe mapper function that maps values to strings.
 * Replaces repetitive switch statements for class/icon mappings.
 *
 * @param mapping - Object mapping keys to their string values
 * @param defaultValue - Value returned for unmatched keys
 * @returns A function that maps input values to strings
 *
 * @example
 * ```ts
 * const getStatusClass = createClassMapper<IssueStatus>(
 *   { open: 'text-status-open', closed: 'text-status-closed' },
 *   'text-status-open'
 * )
 * getStatusClass('open') // 'text-status-open'
 * getStatusClass('unknown') // 'text-status-open' (default)
 * ```
 */
export function createClassMapper<T extends string | number>(
  mapping: Partial<Record<T, string>>,
  defaultValue: string
): (value: T) => string {
  return (value: T): string => mapping[value] ?? defaultValue
}

/**
 * Returns the CSS class for tree indentation by depth level.
 */
export function getTreeIndentClass(depth: number): string {
  const maxIndent = 5
  const clampedDepth = Math.min(Math.max(0, depth), maxIndent)
  return `tree-indent-${clampedDepth}`
}
