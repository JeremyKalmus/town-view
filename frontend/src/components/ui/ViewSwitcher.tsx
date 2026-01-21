import { cn } from '@/lib/utils'
import { useUIStore, type ViewMode } from '@/stores/ui-store'

interface ViewTab {
  id: ViewMode
  label: string
}

const TABS: ViewTab[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'audit', label: 'Audit' },
]

export interface ViewSwitcherProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * ViewSwitcher component for switching between Planning, Monitoring, and Audit views.
 * Uses tab-style navigation with state managed in uiStore.
 */
export function ViewSwitcher({ className }: ViewSwitcherProps) {
  const { viewMode, setViewMode } = useUIStore()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 bg-bg-tertiary rounded-lg',
        className
      )}
      role="tablist"
      aria-label="View switcher"
    >
      {TABS.map((tab) => {
        const isActive = viewMode === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.id}-view`}
            onClick={() => setViewMode(tab.id)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-chrome',
              isActive
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
