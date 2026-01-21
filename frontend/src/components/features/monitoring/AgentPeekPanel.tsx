/**
 * AgentPeekPanel - Slide-out panel showing live terminal output from an agent.
 * Displays the output of `gt peek` in a terminal-style interface.
 */

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Terminal } from 'lucide-react'
import { SlideOutPanel } from '@/components/layout/SlideOutPanel'
import { useAgentPeek } from '@/hooks/useAgentPeek'
import { cn } from '@/lib/utils'

interface AgentPeekPanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose: () => void
  /** ID of the rig containing the agent */
  rigId: string
  /** ID of the agent to peek */
  agentId: string
  /** Agent name for display in title */
  agentName?: string
}

type LineCount = 50 | 100 | 200
const LINE_OPTIONS: LineCount[] = [50, 100, 200]
const AUTO_REFRESH_INTERVAL = 5000 // 5 seconds

export function AgentPeekPanel({
  isOpen,
  onClose,
  rigId,
  agentId,
  agentName,
}: AgentPeekPanelProps) {
  const [lineCount, setLineCount] = useState<LineCount>(50)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Use 0 poll interval when auto-refresh is disabled
  const pollInterval = autoRefresh ? AUTO_REFRESH_INTERVAL : 0

  const { output, loading, error, selectAgent, refetch } = useAgentPeek(
    rigId,
    lineCount,
    pollInterval
  )

  // Select agent when panel opens
  useEffect(() => {
    if (isOpen && agentId) {
      selectAgent(agentId)
    } else if (!isOpen) {
      selectAgent(null)
    }
  }, [isOpen, agentId, selectAgent])

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current && output?.lines) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output?.lines])

  const title = agentName ? `Terminal: ${agentName}` : 'Agent Terminal'

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="w-[600px] max-w-[90vw]"
    >
      <div className="flex flex-col h-full">
        {/* Controls bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary">
          {/* Line count selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Lines:</span>
            <div className="flex rounded-md border border-border overflow-hidden">
              {LINE_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => setLineCount(count)}
                  className={cn(
                    'px-2 py-1 text-xs transition-colors',
                    lineCount === count
                      ? 'bg-accent-chrome text-bg-primary'
                      : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-refresh toggle and manual refresh */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-bg-secondary accent-accent-chrome"
              />
              <span className="text-xs text-text-secondary">
                Auto-refresh (5s)
              </span>
            </label>
            <button
              onClick={refetch}
              disabled={loading}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                loading && 'animate-spin'
              )}
              aria-label="Refresh output"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal output area */}
        <div
          ref={terminalRef}
          className={cn(
            'flex-1 overflow-auto',
            'bg-[#1a1a1a] text-[#d4d4d4]',
            'font-mono text-sm',
            'p-4'
          )}
        >
          {loading && !output && (
            <div className="flex items-center justify-center h-32 text-text-muted">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading terminal output...
            </div>
          )}

          {error && (
            <div className="text-status-blocked p-4 rounded bg-status-blocked/10">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {!loading && !error && !output?.lines?.length && (
            <div className="flex flex-col items-center justify-center h-32 text-text-muted">
              <Terminal className="w-8 h-8 mb-2 opacity-50" />
              <span>No terminal output available</span>
            </div>
          )}

          {output?.lines && output.lines.length > 0 && (
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              {output.lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    'hover:bg-white/5 px-1 -mx-1 rounded',
                    // Highlight error-like lines
                    /error|fail|fatal/i.test(line) && 'text-status-blocked',
                    // Highlight warning-like lines
                    /warn|warning/i.test(line) && 'text-status-deferred',
                    // Highlight success-like lines
                    /success|complete|done|pass/i.test(line) && 'text-status-closed'
                  )}
                >
                  {line || '\u00A0'}
                </div>
              ))}
            </pre>
          )}
        </div>

        {/* Status bar */}
        {output && (
          <div className="px-4 py-2 border-t border-border bg-bg-tertiary text-xs text-text-muted flex justify-between">
            <span>{output.lines.length} lines</span>
            <span>
              Last updated: {new Date(output.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </SlideOutPanel>
  )
}
