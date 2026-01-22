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
 * Returns the CSS class for tree indentation by depth level.
 */
export function getTreeIndentClass(depth: number): string {
  const maxIndent = 5
  const clampedDepth = Math.min(Math.max(0, depth), maxIndent)
  return `tree-indent-${clampedDepth}`
}
