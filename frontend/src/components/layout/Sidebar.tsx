import { Cog, Fuel } from 'lucide-react'
import type { Rig } from '@/types'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface SidebarProps {
  rigs: Rig[]
  selectedRig: Rig | null
  onSelectRig: (rig: Rig) => void
  loading: boolean
  connected?: boolean
}

export function Sidebar({ rigs, selectedRig, onSelectRig, loading, connected }: SidebarProps) {
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
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Gas Town</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  connected ? 'bg-status-closed animate-pulse' : 'bg-status-blocked'
                )}
              />
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

interface RigItemProps {
  rig: Rig
  selected: boolean
  onClick: () => void
}

function RigItem({ rig, selected, onClick }: RigItemProps) {
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
      <div className="flex items-center gap-1 text-sm text-text-secondary">
        <span>{rig.open_count}</span>
        <span className="w-2 h-2 rounded-full bg-status-open" />
      </div>
    </button>
  )
}
