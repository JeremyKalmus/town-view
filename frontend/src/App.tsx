import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PlanningView } from '@/components/features/PlanningView'
import { MonitoringView } from '@/components/features/MonitoringView'
import { AuditView } from '@/components/features/AuditView'
import { TownDashboard, isHQRig } from '@/components/features/TownDashboard'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast'
import { ViewSwitcher } from '@/components/ui/ViewSwitcher'
import { SimpleViewTransition } from '@/components/ui/ViewTransition'
import { useRigStore } from '@/stores/rig-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import { cachedFetch } from '@/services/cache'
import type { Rig } from '@/types'

function App() {
  const { selectedRig, setSelectedRig } = useRigStore()
  const { toast, hideToast } = useToastStore()
  const { viewMode } = useUIStore()
  const [rigs, setRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedIssueIds] = useState<Set<string>>(new Set())
  const [_isFromCache, setIsFromCache] = useState(false)

  // Manual refresh function - exposed to child components
  const triggerRefresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    // Fetch rigs on mount or when refresh triggered
    const fetchRigs = async () => {
      const result = await cachedFetch<Rig[]>('/api/rigs', {
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        returnStaleOnError: true,
        skipCache: refreshKey > 0, // Skip cache on manual refresh
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
  }, [setSelectedRig, refreshKey])

  return (
    <ToastProvider duration={4000}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          rigs={rigs}
          selectedRig={selectedRig}
          onSelectRig={setSelectedRig}
          loading={loading}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View switcher header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
            <h1 className="font-display text-lg font-semibold tracking-wide">
              {selectedRig?.name.toUpperCase() || 'TOWN VIEW'}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={triggerRefresh}
                className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
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
