import { useEffect, useState, useMemo } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PlanningView } from '@/components/features/PlanningView'
import { MonitoringView } from '@/components/features/MonitoringView'
import { AuditView } from '@/components/features/AuditView'
import { TownDashboard, isHQRig } from '@/components/features/TownDashboard'
import { TownDashboardV2 } from '@/components/features/TownDashboardV2'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast'
import { ViewSwitcher } from '@/components/ui/ViewSwitcher'
import { SimpleViewTransition } from '@/components/ui/ViewTransition'
import { useRigStore } from '@/stores/rig-store'
import { useToastStore } from '@/stores/toast-store'
import { useConnectivityStore } from '@/stores/connectivity-store'
import { useUIStore } from '@/stores/ui-store'
import { useDataStore, selectRigs, selectConnected } from '@/stores/data-store'
import { useOffline } from '@/hooks/useOffline'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getRigs } from '@/services'
import type { Rig } from '@/types'

function App() {
  const { selectedRig, setSelectedRig } = useRigStore()
  const { toast, hideToast } = useToastStore()
  const { status: connectivityStatus } = useConnectivityStore()
  const { viewMode, dashboardVersion, setDashboardVersion } = useUIStore()

  // WebSocket connection for real-time updates
  useWebSocket({ debug: process.env.NODE_ENV === 'development' })

  // Data from WebSocket store
  const wsRigs = useDataStore(selectRigs)
  const wsConnected = useDataStore(selectConnected)

  // HTTP fallback state (used when WebSocket not connected)
  const [httpRigs, setHttpRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedIssueIds] = useState<Set<string>>(new Set())

  // Use WebSocket rigs when connected and available, otherwise HTTP fallback
  const rawRigs = wsConnected && wsRigs.length > 0 ? wsRigs : httpRigs

  // Sort rigs: HQ (Town) first, then alphabetically by name
  const rigs = useMemo(() => {
    return [...rawRigs].sort((a, b) => {
      // HQ always first
      const aIsHQ = isHQRig(a)
      const bIsHQ = isHQRig(b)
      if (aIsHQ && !bIsHQ) return -1
      if (!aIsHQ && bIsHQ) return 1
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    })
  }, [rawRigs])

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
    // Fetch rigs via HTTP as fallback (WebSocket provides real-time updates)
    const fetchRigs = async () => {
      const result = await getRigs()

      if (result.data) {
        // Deduplicate rigs by ID (defensive measure for backend edge cases)
        const uniqueRigs = result.data.filter(
          (rig, index, self) => index === self.findIndex((r) => r.id === rig.id)
        )
        setHttpRigs(uniqueRigs)
        setLoading(false)
        setError(null)
      } else if (result.error) {
        setError(result.error)
        setLoading(false)
      }
    }

    fetchRigs()
  }, [refreshKey])

  // Select first rig by default when rigs become available
  useEffect(() => {
    const currentSelectedRig = useRigStore.getState().selectedRig
    if (rigs.length > 0 && !currentSelectedRig) {
      setSelectedRig(rigs[0])
    }
  }, [rigs, setSelectedRig])

  return (
    <ToastProvider duration={4000}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          rigs={rigs}
          selectedRig={selectedRig}
          onSelectRig={setSelectedRig}
          loading={loading && !wsConnected}
          connected={wsConnected}
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
            <div className="flex items-center gap-4">
              {selectedRig && isHQRig(selectedRig) && (
                <button
                  onClick={() => setDashboardVersion(dashboardVersion === 'v1' ? 'v2' : 'v1')}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-tertiary transition-colors text-text-secondary"
                  title={`Switch to dashboard ${dashboardVersion === 'v1' ? 'V2' : 'V1'}`}
                >
                  {dashboardVersion === 'v1' ? 'Try V2' : 'Use V1'}
                </button>
              )}
              <ViewSwitcher />
            </div>
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
              dashboardVersion === 'v2' ? (
                <TownDashboardV2 refreshKey={refreshKey} />
              ) : (
                <TownDashboard refreshKey={refreshKey} />
              )
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
