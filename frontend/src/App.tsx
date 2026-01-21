import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { RigDashboard } from '@/components/features/RigDashboard'
import { useRigStore } from '@/stores/rig-store'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Rig } from '@/types'

function App() {
  const { selectedRig, setSelectedRig } = useRigStore()
  const [rigs, setRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // WebSocket for real-time updates
  const handleWSMessage = useCallback((msg: { type: string; rigId?: string }) => {
    if (msg.type === 'rig_update' || msg.type === 'issue_update') {
      // Trigger refresh when we get updates
      setRefreshKey((k) => k + 1)
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
          <RigDashboard rig={selectedRig} refreshKey={refreshKey} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted">Select a rig from the sidebar</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
