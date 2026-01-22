import { Cog, Fuel } from 'lucide-react'
import type { Rig, AgentState, AgentHealth } from '@/types'
import { cn } from '@/lib/class-utils'
import { Badge } from '@/components/ui'

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

export interface RigItemProps {
  rig: Rig
  selected: boolean
  onClick: () => void
}

/** Role labels for tooltips */
const roleLabels = {
  witness: 'Witness',
  refinery: 'Refinery',
  crew: 'Crew',
}

/**
 * Health indicator showing agent status dots.
 * Uses agent_health from rig data (no extra API calls).
 * Shows dots only for roles that exist for this rig.
 */
function HealthIndicator({ health }: { health?: AgentHealth }) {
  // If no health data, show nothing (not even gray dots)
  if (!health) {
    return null
  }

  // Only show dots for roles that exist (non-null state)
  const roles = [
    { key: 'witness' as const, state: health.witness },
    { key: 'refinery' as const, state: health.refinery },
    { key: 'crew' as const, state: health.crew },
  ].filter(r => r.state !== null)

  if (roles.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1" title="Witness | Refinery | Crew">
      {roles.map(({ key, state }) => (
        <Badge
          key={key}
          variant="health-dot"
          state={state as AgentState}
          title={`${roleLabels[key]}: ${state}`}
        />
      ))}
    </div>
  )
}

export function RigItem({ rig, selected, onClick }: RigItemProps) {
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
      <HealthIndicator health={rig.agent_health} />
    </button>
  )
}
