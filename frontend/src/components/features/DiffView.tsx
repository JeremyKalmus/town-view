import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Columns, AlignLeft } from 'lucide-react'
import type { ContentVersion } from '@/types'
import { cn, formatRelativeTime } from '@/lib/utils'

export type { ContentVersion }

interface DiffViewProps {
  /** Array of content versions, ordered from oldest to newest */
  versions: ContentVersion[]
  /** Optional CSS class name */
  className?: string
}

type ViewMode = 'unified' | 'split'

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'header'
  content: string
  lineNumber?: {
    old?: number
    new?: number
  }
}

/**
 * Computes a unified diff between two strings.
 * Uses a simple line-by-line comparison with LCS for better diffs.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Use longest common subsequence algorithm for better diffs
  const lcs = computeLCS(oldLines, newLines)
  const result: DiffLine[] = []

  let oldIdx = 0
  let newIdx = 0
  let lcsIdx = 0
  let oldLineNum = 1
  let newLineNum = 1

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldLines[oldIdx] === lcs[lcsIdx] && newLines[newIdx] === lcs[lcsIdx]) {
      // Line is in both - unchanged
      result.push({
        type: 'unchanged',
        content: oldLines[oldIdx],
        lineNumber: { old: oldLineNum, new: newLineNum }
      })
      oldIdx++
      newIdx++
      lcsIdx++
      oldLineNum++
      newLineNum++
    } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
      // Line only in old - removed
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        lineNumber: { old: oldLineNum }
      })
      oldIdx++
      oldLineNum++
    } else if (newIdx < newLines.length) {
      // Line only in new - added
      result.push({
        type: 'added',
        content: newLines[newIdx],
        lineNumber: { new: newLineNum }
      })
      newIdx++
      newLineNum++
    }
  }

  return result
}

/**
 * Computes the longest common subsequence of two arrays.
 */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

/**
 * Basic markdown syntax highlighting.
 * Highlights headers, code blocks, links, bold, italic, and inline code.
 */
function highlightMarkdown(text: string): React.ReactNode {
  // Handle empty lines
  if (!text.trim()) {
    return <span className="text-text-muted">{text || ' '}</span>
  }

  // Headers (# through ######)
  const headerMatch = text.match(/^(#{1,6})\s+(.*)$/)
  if (headerMatch) {
    return (
      <span>
        <span className="text-accent-rust font-semibold">{headerMatch[1]}</span>
        <span className="text-text-primary font-semibold"> {headerMatch[2]}</span>
      </span>
    )
  }

  // Code block fence
  if (text.match(/^```/)) {
    return <span className="text-status-deferred">{text}</span>
  }

  // Bullet points
  if (text.match(/^\s*[-*+]\s/)) {
    const match = text.match(/^(\s*)([-*+])(\s)(.*)$/)
    if (match) {
      return (
        <span>
          <span>{match[1]}</span>
          <span className="text-accent-rust">{match[2]}</span>
          <span>{match[3]}</span>
          {highlightInlineMarkdown(match[4])}
        </span>
      )
    }
  }

  // Numbered lists
  if (text.match(/^\s*\d+\.\s/)) {
    const match = text.match(/^(\s*)(\d+\.)(\s)(.*)$/)
    if (match) {
      return (
        <span>
          <span>{match[1]}</span>
          <span className="text-accent-rust">{match[2]}</span>
          <span>{match[3]}</span>
          {highlightInlineMarkdown(match[4])}
        </span>
      )
    }
  }

  // Blockquote
  if (text.match(/^>\s/)) {
    return (
      <span className="text-text-secondary italic">
        <span className="text-accent-sand">&gt;</span>
        {text.slice(1)}
      </span>
    )
  }

  return highlightInlineMarkdown(text)
}

/**
 * Highlights inline markdown elements.
 */
function highlightInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(
        <span key={key++} className="px-1 py-0.5 bg-bg-tertiary text-status-deferred rounded text-xs mono">
          {codeMatch[1]}
        </span>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)([^*_]+)(\*\*|__)/)
    if (boldMatch) {
      parts.push(
        <span key={key++} className="font-bold text-text-primary">{boldMatch[2]}</span>
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)(\*|_)/)
    if (italicMatch) {
      parts.push(
        <span key={key++} className="italic text-text-secondary">{italicMatch[2]}</span>
      )
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <span key={key++} className="text-status-deferred underline">{linkMatch[1]}</span>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Regular character
    parts.push(remaining[0])
    remaining = remaining.slice(1)
  }

  return <>{parts}</>
}

/**
 * DiffView displays description changes over time as unified diff.
 * Supports split view (before/after), syntax highlighting for markdown,
 * and navigation between change versions.
 */
export function DiffView({ versions, className }: DiffViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('unified')
  const [currentIndex, setCurrentIndex] = useState(versions.length > 1 ? versions.length - 1 : 0)

  // Get the two versions to compare
  const { oldVersion, newVersion } = useMemo(() => {
    if (versions.length === 0) {
      return { oldVersion: null, newVersion: null }
    }
    if (versions.length === 1) {
      return { oldVersion: null, newVersion: versions[0] }
    }
    return {
      oldVersion: versions[currentIndex - 1] || null,
      newVersion: versions[currentIndex]
    }
  }, [versions, currentIndex])

  // Compute diff between versions
  const diffLines = useMemo(() => {
    if (!newVersion) return []
    if (!oldVersion) {
      // First version - show all as added
      return newVersion.content.split('\n').map((line, idx): DiffLine => ({
        type: 'added',
        content: line,
        lineNumber: { new: idx + 1 }
      }))
    }
    return computeDiff(oldVersion.content, newVersion.content)
  }, [oldVersion, newVersion])

  // Stats for the diff
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length
    const removed = diffLines.filter(l => l.type === 'removed').length
    return { added, removed }
  }, [diffLines])

  if (versions.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No version history available
      </div>
    )
  }

  const canGoBack = currentIndex > 1
  const canGoForward = currentIndex < versions.length - 1

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with navigation and view toggle */}
      <div className="flex items-center justify-between gap-4 px-3 py-2 border-b border-border bg-bg-secondary">
        {/* Version navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex(i => Math.max(1, i - 1))}
            disabled={!canGoBack}
            className={cn(
              'p-1 rounded transition-colors',
              canGoBack
                ? 'hover:bg-bg-tertiary text-text-secondary'
                : 'text-text-muted cursor-not-allowed'
            )}
            aria-label="Previous version"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-text-secondary mono">
            {versions.length === 1
              ? 'Initial version'
              : `v${currentIndex} → v${currentIndex + 1}`}
          </span>
          <button
            onClick={() => setCurrentIndex(i => Math.min(versions.length - 1, i + 1))}
            disabled={!canGoForward}
            className={cn(
              'p-1 rounded transition-colors',
              canGoForward
                ? 'hover:bg-bg-tertiary text-text-secondary'
                : 'text-text-muted cursor-not-allowed'
            )}
            aria-label="Next version"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Version info */}
        <div className="flex-1 flex items-center justify-center gap-2 text-xs text-text-muted">
          {newVersion && (
            <>
              <span className="truncate max-w-[150px]" title={newVersion.actor}>
                {newVersion.actor}
              </span>
              <span>·</span>
              <span title={newVersion.timestamp}>
                {formatRelativeTime(newVersion.timestamp)}
              </span>
            </>
          )}
        </div>

        {/* View mode toggle and stats */}
        <div className="flex items-center gap-3">
          {/* Diff stats */}
          <div className="flex items-center gap-2 text-xs mono">
            {stats.added > 0 && (
              <span className="text-status-closed">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-status-blocked">-{stats.removed}</span>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'unified'
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              aria-label="Unified view"
              title="Unified view"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'split'
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              aria-label="Split view"
              title="Split view"
            >
              <Columns size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'unified' ? (
          <UnifiedDiffView lines={diffLines} />
        ) : (
          <SplitDiffView
            oldContent={oldVersion?.content || ''}
            newContent={newVersion?.content || ''}
            oldLabel={oldVersion ? `v${currentIndex}` : 'empty'}
            newLabel={`v${currentIndex + 1}`}
          />
        )}
      </div>
    </div>
  )
}

interface UnifiedDiffViewProps {
  lines: DiffLine[]
}

function UnifiedDiffView({ lines }: UnifiedDiffViewProps) {
  return (
    <div className="text-sm mono">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            'flex px-3 py-0.5 border-l-2',
            line.type === 'added' && 'bg-status-closed/10 border-l-status-closed',
            line.type === 'removed' && 'bg-status-blocked/10 border-l-status-blocked',
            line.type === 'unchanged' && 'border-l-transparent',
            line.type === 'header' && 'bg-bg-secondary border-l-accent-rust'
          )}
        >
          {/* Line number gutter */}
          <div className="w-16 flex-shrink-0 flex text-text-muted text-xs select-none">
            <span className="w-8 text-right pr-1">
              {line.lineNumber?.old || ''}
            </span>
            <span className="w-8 text-right pr-1">
              {line.lineNumber?.new || ''}
            </span>
          </div>

          {/* Change indicator */}
          <div className="w-4 flex-shrink-0 text-center select-none">
            {line.type === 'added' && <span className="text-status-closed">+</span>}
            {line.type === 'removed' && <span className="text-status-blocked">-</span>}
            {line.type === 'unchanged' && <span className="text-text-muted"> </span>}
          </div>

          {/* Content with syntax highlighting */}
          <div className="flex-1 whitespace-pre-wrap break-words min-w-0">
            {highlightMarkdown(line.content)}
          </div>
        </div>
      ))}
    </div>
  )
}

interface SplitDiffViewProps {
  oldContent: string
  newContent: string
  oldLabel: string
  newLabel: string
}

function SplitDiffView({ oldContent, newContent, oldLabel, newLabel }: SplitDiffViewProps) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLines = Math.max(oldLines.length, newLines.length)

  // Compute which lines changed for highlighting
  const diff = computeDiff(oldContent, newContent)
  const removedLineNums = new Set(diff.filter(l => l.type === 'removed').map(l => l.lineNumber?.old))
  const addedLineNums = new Set(diff.filter(l => l.type === 'added').map(l => l.lineNumber?.new))

  return (
    <div className="flex h-full">
      {/* Old version (left) */}
      <div className="flex-1 border-r border-border overflow-auto">
        <div className="sticky top-0 px-3 py-1.5 bg-bg-secondary border-b border-border text-xs text-text-muted">
          {oldLabel}
        </div>
        <div className="text-sm mono">
          {Array.from({ length: maxLines }, (_, idx) => {
            const lineNum = idx + 1
            const line = oldLines[idx] ?? ''
            const isRemoved = removedLineNums.has(lineNum)

            return (
              <div
                key={idx}
                className={cn(
                  'flex px-3 py-0.5 border-l-2',
                  isRemoved
                    ? 'bg-status-blocked/10 border-l-status-blocked'
                    : 'border-l-transparent'
                )}
              >
                <div className="w-8 flex-shrink-0 text-right pr-2 text-text-muted text-xs select-none">
                  {idx < oldLines.length ? lineNum : ''}
                </div>
                <div className="flex-1 whitespace-pre-wrap break-words min-w-0">
                  {idx < oldLines.length ? highlightMarkdown(line) : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* New version (right) */}
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 px-3 py-1.5 bg-bg-secondary border-b border-border text-xs text-text-muted">
          {newLabel}
        </div>
        <div className="text-sm mono">
          {Array.from({ length: maxLines }, (_, idx) => {
            const lineNum = idx + 1
            const line = newLines[idx] ?? ''
            const isAdded = addedLineNums.has(lineNum)

            return (
              <div
                key={idx}
                className={cn(
                  'flex px-3 py-0.5 border-l-2',
                  isAdded
                    ? 'bg-status-closed/10 border-l-status-closed'
                    : 'border-l-transparent'
                )}
              >
                <div className="w-8 flex-shrink-0 text-right pr-2 text-text-muted text-xs select-none">
                  {idx < newLines.length ? lineNum : ''}
                </div>
                <div className="flex-1 whitespace-pre-wrap break-words min-w-0">
                  {idx < newLines.length ? highlightMarkdown(line) : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
