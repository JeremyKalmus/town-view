import { useEffect, useState, useCallback, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { RigDashboard } from '@/components/features/RigDashboard'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast'
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal'
import { useRigStore } from '@/stores/rig-store'
import { useToastStore } from '@/stores/toast-store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { Rig, WSMessage } from '@/types'

function App() {
  const { selectedRig, setSelectedRig } = useRigStore()
  const { toast, hideToast } = useToastStore()
  const [rigs, setRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedIssueIds, setUpdatedIssueIds] = useState<Set<string>>(new Set())
  const clearTimeoutRef = useRef<Map<string, number>>(new Map())
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShortcutsModalOpen(true),
    onEscape: () => setShortcutsModalOpen(false),
    // Navigation shortcuts - placeholder for future views
    onNavigateDashboard: () => {
      console.log('[Keyboard] Navigate to Dashboard')
      // Future: switch to dashboard view
    },
    onNavigateRoadmap: () => {
      console.log('[Keyboard] Navigate to Roadmap')
      // Future: switch to roadmap view
    },
    onNavigateAudit: () => {
      console.log('[Keyboard] Navigate to Audit')
      // Future: switch to audit view
    },
    onSearch: () => {
      console.log('[Keyboard] Focus search')
      // Future: focus search input
    },
    enabled: !shortcutsModalOpen, // Disable shortcuts when modal is open (except Escape)
  })

  // WebSocket for real-time updates
  const handleWSMessage = useCallback((msg: WSMessage) => {
    console.log('[WS] Received message:', msg)

    if (msg.type === 'beads_changed' || msg.type === 'rig_update' || msg.type === 'issue_update' || msg.type === 'issue_changed') {
      // Trigger refresh when beads change
      setRefreshKey((k) => k + 1)
    } else if (msg.type === 'rig_discovered') {
      // Refresh rig list when new rig discovered
      setRefreshKey((k) => k + 1)
    } else if (msg.type === 'agent_state_changed') {
      // Refresh when agent state changes
      setRefreshKey((k) => k + 1)
    }

    // Track updated issue ID for flash animation
    if (msg.type === 'issue_changed' && msg.payload?.id) {
      const issueId = msg.payload.id as string
      setUpdatedIssueIds((prev) => new Set(prev).add(issueId))

      // Clear existing timeout for this issue if any
      const existingTimeout = clearTimeoutRef.current.get(issueId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Clear the flash after animation completes (1.5s)
      const timeoutId = window.setTimeout(() => {
        setUpdatedIssueIds((prev) => {
          const next = new Set(prev)
          next.delete(issueId)
          return next
        })
        clearTimeoutRef.current.delete(issueId)
      }, 1500)

      clearTimeoutRef.current.set(issueId, timeoutId)
    }
  }, [])

  const { connected } = useWebSocket({
    onMessage: handleWSMessage,
    onConnect: () => console.log('[WS] Connected to Town View'),
    onDisconnect: () => console.log('[WS] Disconnected'),
  })

  useEffect(() => {
    // Fetch rigs on mount or when refresh triggered
    fetch('/api/rigs')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch rigs')
        return res.json()
      })
      .then((data) => {
        setRigs(data)
        // Select first rig by default
        if (data.length > 0 && !selectedRig) {
          setSelectedRig(data[0])
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedRig, setSelectedRig, refreshKey])

  return (
    <ToastProvider duration={4000}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          rigs={rigs}
          selectedRig={selectedRig}
          onSelectRig={setSelectedRig}
          loading={loading}
          connected={connected}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="card-accent p-6 max-w-md">
                <h2 className="text-lg font-semibold text-status-blocked mb-2">
                  Connection Error
                </h2>
                <p className="text-text-secondary mb-4">{error}</p>
                <p className="text-sm text-text-muted">
                  Make sure the Town View server is running on port 8080.
                </p>
              </div>
            </div>
          ) : selectedRig ? (
            <RigDashboard rig={selectedRig} refreshKey={refreshKey} updatedIssueIds={updatedIssueIds} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-muted">Select a rig from the sidebar</p>
            </div>
          )}
        </main>
      </div>

      {/* Toast notifications */}
      <Toast
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
        open={toast.open}
        onOpenChange={(open) => !open && hideToast()}
      />
      <ToastViewport />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </ToastProvider>
  )
}

export default App
