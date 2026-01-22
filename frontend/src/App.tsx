import { useEffect, useState, useCallback, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PlanningView } from '@/components/features/PlanningView'
import { MonitoringView } from '@/components/features/MonitoringView'
import { AuditView } from '@/components/features/AuditView'
import { TownDashboard, isHQRig } from '@/components/features/TownDashboard'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast'
import { ViewSwitcher } from '@/components/ui/ViewSwitcher'
import { SimpleViewTransition } from '@/components/ui/ViewTransition'
import { useRigStore } from '@/stores/rig-store'
import { useToastStore } from '@/stores/toast-store'
import { useConnectivityStore } from '@/stores/connectivity-store'
import { useUIStore } from '@/stores/ui-store'
import { useEventSource } from '@/hooks/useEventSource'
import { useOffline } from '@/hooks/useOffline'
import { cachedFetch } from '@/services/cache'
import type { Rig, WSMessage } from '@/types'

function App() {
  const { selectedRig, setSelectedRig } = useRigStore()
  const { toast, hideToast } = useToastStore()
  const { status: connectivityStatus } = useConnectivityStore()
  const { viewMode } = useUIStore()
  const [rigs, setRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedIssueIds, setUpdatedIssueIds] = useState<Set<string>>(new Set())
  const [_isFromCache, setIsFromCache] = useState(false)
  const clearTimeoutRef = useRef<Map<string, number>>(new Map())
  const refreshDebounceRef = useRef<number | null>(null)

  // Debounced refresh to prevent flickering from rapid WebSocket messages
  const triggerDebouncedRefresh = useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current)
    }
    refreshDebounceRef.current = window.setTimeout(() => {
      setRefreshKey((k) => k + 1)
      refreshDebounceRef.current = null
    }, 500) // 500ms debounce
  }, [])

  // WebSocket for real-time updates
  const handleWSMessage = useCallback((msg: WSMessage) => {
    console.log('[WS] Received message:', msg)

    if (msg.type === 'beads_changed' || msg.type === 'rig_update' || msg.type === 'issue_update' || msg.type === 'issue_changed') {
      // Trigger debounced refresh when beads change
      triggerDebouncedRefresh()
    } else if (msg.type === 'rig_discovered') {
      // Refresh rig list when new rig discovered
      triggerDebouncedRefresh()
    } else if (msg.type === 'agent_state_changed') {
      // Refresh when agent state changes
      triggerDebouncedRefresh()
    } else if (msg.type === 'convoy_progress_changed') {
      // Dispatch to registered convoy progress handlers (in MonitoringView)
      const handlers = (window as unknown as { __convoyProgressHandlers?: Array<(msg: WSMessage) => void> }).__convoyProgressHandlers
      if (handlers) {
        handlers.forEach(handler => handler(msg))
      }
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
  }, [triggerDebouncedRefresh])

  const { connected } = useEventSource({
    onMessage: handleWSMessage,
    onConnect: () => console.log('[SSE] Connected to Town View'),
    onDisconnect: () => console.log('[SSE] Disconnected'),
  })

  // Offline detection and connectivity management
  const { tryReconnect } = useOffline({
    onReconnect: () => {
      console.log('[Connectivity] Reconnected - refreshing data')
      setRefreshKey((k) => k + 1)
    },
    onDisconnect: () => {
      console.log('[Connectivity] Disconnected - using cached data')
    },
  })

  useEffect(() => {
    // Fetch rigs on mount or when refresh triggered
    const fetchRigs = async () => {
      const result = await cachedFetch<Rig[]>('/api/rigs', {
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        returnStaleOnError: true,
      })

      if (result.data) {
        // Deduplicate rigs by ID (defensive measure for backend edge cases)
        const uniqueRigs = result.data.filter(
          (rig, index, self) => index === self.findIndex((r) => r.id === rig.id)
        )
        setRigs(uniqueRigs)
        setIsFromCache(result.fromCache)
        // Select first rig by default (only if none selected)
        // Use getState() to read current value without adding to dependencies
        const currentSelectedRig = useRigStore.getState().selectedRig
        if (uniqueRigs.length > 0 && !currentSelectedRig) {
          setSelectedRig(uniqueRigs[0])
        }
        setLoading(false)
        // Clear error if we have data (even cached)
        if (result.fromCache && result.error) {
          // Keep error for display but don't block UI
          console.warn('[Rigs] Using cached data:', result.error)
        } else {
          setError(null)
        }
      } else if (result.error) {
        setError(result.error)
        setLoading(false)
      }
    }

    fetchRigs()
  }, [setSelectedRig, refreshKey]) // Removed selectedRig - use getState() instead

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
          httpConnected={connectivityStatus === 'online'}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Offline banner */}
          <OfflineBanner onRetry={tryReconnect} />

          {/* View switcher header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
            <h1 className="font-display text-lg font-semibold tracking-wide">
              {selectedRig?.name.toUpperCase() || 'TOWN VIEW'}
            </h1>
            <ViewSwitcher />
          </div>

          {/* Main content area */}
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
            ) : !selectedRig ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-muted">Select a rig from the sidebar</p>
              </div>
            ) : isHQRig(selectedRig) ? (
              <TownDashboard refreshKey={refreshKey} />
            ) : (
              <SimpleViewTransition viewKey={viewMode}>
                {viewMode === 'planning' ? (
                  <PlanningView refreshKey={refreshKey} updatedIssueIds={updatedIssueIds} />
                ) : viewMode === 'monitoring' ? (
                  <MonitoringView rig={selectedRig} refreshKey={refreshKey} updatedIssueIds={updatedIssueIds} />
                ) : (
                  <AuditView updatedIssueIds={updatedIssueIds} />
                )}
              </SimpleViewTransition>
            )}
          </main>
        </div>
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
    </ToastProvider>
  )
}

export default App
