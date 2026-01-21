import { Cog, Fuel } from 'lucide-react'
import type { Rig } from '@/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { useAgents, healthIndicatorRoles, roleLabels } from '@/hooks/useAgents'

interface SidebarProps {
  rigs: Rig[]
  selectedRig: Rig | null
  onSelectRig: (rig: Rig) => void
  loading: boolean
  connected?: boolean
  httpConnected?: boolean
}

export function Sidebar({ rigs, selectedRig, onSelectRig, loading, connected, httpConnected = true }: SidebarProps) {
  // Determine overall connection status
  // Online = both WS and HTTP connected
  // Degraded = WS connected but HTTP issues (or vice versa)
  // Offline = neither connected (falls through to default case)
  const isFullyConnected = connected && httpConnected
  const isDegraded = (connected && !httpConnected) || (!connected && httpConnected)

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border flex flex-col">
      {/* Logo header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-accent-rust/20 to-transparent">
        <div className="flex items-center gap-2">
          <Fuel className="w-6 h-6 text-accent-rust" />
          <h1 className="font-display text-xl font-bold tracking-wide">TOWN VIEW</h1>
        </div>
      </div>

      {/* Rig list */}
      <div className="flex-1 overflow-auto p-2">
        <h2 className="section-header px-2 py-2">RIGS</h2>

        {loading ? (
          <div className="px-2 py-4">
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-bg-tertiary rounded-md" />
              ))}
            </div>
          </div>
        ) : rigs.length === 0 ? (
          <div className="px-2 py-4 text-text-muted text-sm">
            No rigs discovered
          </div>
        ) : (
          <nav className="space-y-1">
            {rigs.map((rig) => (
              <RigItem
                key={rig.id}
                rig={rig}
                selected={selectedRig?.id === rig.id}
                onClick={() => onSelectRig(rig)}
              />
            ))}
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border text-xs text-text-muted flex items-center justify-between">
        <span>Gas Town</span>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isFullyConnected
                ? 'bg-status-closed animate-pulse'
                : isDegraded
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-status-blocked'
            )}
          />
          <span>
            {isFullyConnected ? 'Live' : isDegraded ? 'Degraded' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  )
}

export type RigItemVariant = 'default' | 'health'

export interface RigItemProps {
  rig: Rig
  selected: boolean
  onClick: () => void
  /** Variant: 'default' shows issue count, 'health' shows agent status dots */
  variant?: RigItemVariant
}

/**
 * Default indicator showing open issue count.
 */
function CountIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 text-sm text-text-secondary">
      <span>{count}</span>
      <span className="w-2 h-2 rounded-full bg-status-open" />
    </div>
  )
}

/**
 * Health indicator with fallback to count.
 * Shows 3 dots for Witness/Refinery/Crew status, falls back to count on error.
 */
function HealthIndicatorWithFallback({ rigId, fallbackCount }: { rigId: string; fallbackCount: number }) {
  const { getRoleHealth, loading, error } = useAgents(rigId)

  // Fallback to count indicator if loading or error
  if (loading || error) {
    return <CountIndicator count={fallbackCount} />
  }

  return (
    <div className="flex items-center gap-1" title="Witness | Refinery | Crew">
      {healthIndicatorRoles.map((role) => {
        const health = getRoleHealth(role)
        return (
          <Badge
            key={role}
            variant="health-dot"
            state={health}
            title={`${roleLabels[role]}: ${health ?? 'not present'}`}
          />
        )
      })}
    </div>
  )
}

export function RigItem({ rig, selected, onClick, variant = 'default' }: RigItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
        selected
          ? 'bg-bg-tertiary border-l-2 border-l-accent-rust'
          : 'hover:bg-bg-tertiary'
      )}
    >
      <Cog className="w-4 h-4 text-text-muted flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{rig.name}</div>
        <div className="text-xs text-text-muted">{rig.prefix}</div>
      </div>
      {variant === 'health' ? (
        <HealthIndicatorWithFallback rigId={rig.id} fallbackCount={rig.open_count} />
      ) : (
        <CountIndicator count={rig.open_count} />
      )}
    </button>
  )
}
