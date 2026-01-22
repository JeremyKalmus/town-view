import type { Meta, StoryObj } from '@storybook/react'
import {
  ISSUE_TYPE_CATALOG,
  ISSUE_TYPE_CATEGORIES,
  getIssueTypesByCategory,
  getIssueTypeInfo,
  type IssueTypeInfo,
  AGENT_ROLE_CATALOG,
  type AgentRoleInfo,
} from '@/lib/utils'

/**
 * Bead Type Card - displays a single bead type with all its metadata.
 */
function BeadTypeCard({ info }: { info: IssueTypeInfo }) {
  return (
    <div className="card p-4 flex gap-4 items-start">
      <div className={`text-3xl ${info.colorClass}`}>{info.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-text-primary">{info.label}</span>
          <span className="mono text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
            {info.type}
          </span>
          <span className="text-xs text-text-muted capitalize">
            {info.category}
          </span>
        </div>
        <p className="text-sm text-text-secondary">{info.description}</p>
      </div>
    </div>
  )
}

/**
 * Category Section - groups bead types by category.
 */
function CategorySection({
  category,
  label,
  description,
}: {
  category: IssueTypeInfo['category']
  label: string
  description: string
}) {
  const types = getIssueTypesByCategory(category)
  if (types.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="section-header">{label}</h2>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <div className="grid gap-3">
        {types.map((info) => (
          <BeadTypeCard key={info.type} info={info} />
        ))}
      </div>
    </div>
  )
}

/**
 * Full Bead Type Catalog - shows all types organized by category.
 */
function BeadTypeCatalog() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          BEAD TYPE CATALOG
        </h1>
        <p className="text-text-secondary">
          Complete reference for all bead types in the system. Use this to
          understand what each type represents and where it should appear.
        </p>
      </div>

      {ISSUE_TYPE_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat.id}
          label={cat.label.toUpperCase()}
          description={cat.description}
        />
      ))}

      {/* Summary Stats */}
      <div className="card p-4 mt-8">
        <h3 className="section-header mb-3">SUMMARY</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ISSUE_TYPE_CATEGORIES.map((cat) => {
            const count = getIssueTypesByCategory(cat.id).length
            return (
              <div key={cat.id} className="text-center">
                <div className="text-2xl font-bold text-accent-primary">
                  {count}
                </div>
                <div className="text-xs text-text-muted">{cat.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact Type Grid - all types in a condensed grid for quick reference.
 */
function BeadTypeGrid() {
  return (
    <div className="p-6">
      <h2 className="section-header mb-4">ALL BEAD TYPES</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {ISSUE_TYPE_CATALOG.map((info) => (
          <div
            key={info.type}
            className="card p-3 flex items-center gap-3 hover:bg-bg-tertiary transition-colors"
          >
            <span className={`text-xl ${info.colorClass}`}>{info.icon}</span>
            <div>
              <div className="font-medium text-text-primary text-sm">
                {info.label}
              </div>
              <div className="mono text-xs text-text-muted">{info.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Filter Demo - shows how types can be filtered for different views.
 */
function FilterDemo() {
  return (
    <div className="p-6 max-w-3xl">
      <h2 className="section-header mb-4">FILTERING BY CATEGORY</h2>
      <p className="text-sm text-text-secondary mb-6">
        Use these categories to filter beads for different views:
      </p>

      <div className="space-y-6">
        {/* Planning View */}
        <div className="card p-4">
          <h3 className="font-semibold text-accent-primary mb-2">
            📋 Planning View
          </h3>
          <p className="text-sm text-text-muted mb-3">
            Shows: work + coordination
          </p>
          <div className="flex flex-wrap gap-2">
            {[...getIssueTypesByCategory('work'), ...getIssueTypesByCategory('coordination')].map(
              (info) => (
                <span
                  key={info.type}
                  className={`inline-flex items-center gap-1 text-sm ${info.colorClass} bg-bg-tertiary px-2 py-1 rounded`}
                >
                  {info.icon} {info.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Monitoring View */}
        <div className="card p-4">
          <h3 className="font-semibold text-status-in-progress mb-2">
            🔄 Monitoring View
          </h3>
          <p className="text-sm text-text-muted mb-3">
            Shows: work + agents (infrastructure filtered)
          </p>
          <div className="flex flex-wrap gap-2">
            {[...getIssueTypesByCategory('work'), getIssueTypeInfo('agent')].map(
              (info) => (
                <span
                  key={info.type}
                  className={`inline-flex items-center gap-1 text-sm ${info.colorClass} bg-bg-tertiary px-2 py-1 rounded`}
                >
                  {info.icon} {info.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Audit View */}
        <div className="card p-4">
          <h3 className="font-semibold text-status-closed mb-2">
            📊 Audit View
          </h3>
          <p className="text-sm text-text-muted mb-3">Shows: events + all closed work</p>
          <div className="flex flex-wrap gap-2">
            {[getIssueTypeInfo('event'), ...getIssueTypesByCategory('work')].map(
              (info) => (
                <span
                  key={info.type}
                  className={`inline-flex items-center gap-1 text-sm ${info.colorClass} bg-bg-tertiary px-2 py-1 rounded`}
                >
                  {info.icon} {info.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Storybook metadata
const meta: Meta = {
  title: 'Reference/Bead Type Catalog',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta

// Stories
type Story = StoryObj

export const FullCatalog: Story = {
  render: () => <BeadTypeCatalog />,
}

export const CompactGrid: Story = {
  render: () => <BeadTypeGrid />,
}

export const FilteringDemo: Story = {
  render: () => <FilterDemo />,
}

export const SingleCard: Story = {
  render: () => (
    <div className="p-6 max-w-md">
      <BeadTypeCard info={getIssueTypeInfo('task')} />
    </div>
  ),
}

/**
 * Agent Role Card - displays an agent role with its bead relationships.
 */
function AgentRoleCard({ info }: { info: AgentRoleInfo }) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-3xl">{info.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary">{info.label}</span>
            <span className="mono text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
              {info.role}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              info.level === 'town'
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'bg-accent-secondary/20 text-accent-secondary'
            }`}>
              {info.level}-level
            </span>
          </div>
          <p className="text-sm text-text-secondary">{info.description}</p>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        {/* Works With */}
        <div>
          <div className="text-xs text-text-muted mb-1.5">Works with:</div>
          {info.worksWith.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {info.worksWith.map(type => {
                const typeInfo = getIssueTypeInfo(type)
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-1 text-xs ${typeInfo.colorClass} bg-bg-tertiary px-2 py-0.5 rounded`}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className="text-xs text-text-muted italic">None (oversight role)</span>
          )}
        </div>

        {/* Produces */}
        <div>
          <div className="text-xs text-text-muted mb-1.5">Produces:</div>
          {info.produces.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {info.produces.map(type => {
                const typeInfo = getIssueTypeInfo(type)
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-1 text-xs ${typeInfo.colorClass} bg-bg-tertiary px-2 py-0.5 rounded`}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className="text-xs text-text-muted italic">None</span>
          )}
        </div>

        {/* Monitors */}
        {info.monitors.length > 0 && (
          <div>
            <div className="text-xs text-text-muted mb-1.5">Monitors:</div>
            <div className="flex flex-wrap gap-1.5">
              {info.monitors.map(type => {
                const typeInfo = getIssueTypeInfo(type)
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-1 text-xs ${typeInfo.colorClass} bg-bg-tertiary px-2 py-0.5 rounded`}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Agent Role Catalog - shows all agent roles organized by level.
 */
function AgentRoleCatalog() {
  const townRoles = AGENT_ROLE_CATALOG.filter(r => r.level === 'town')
  const rigRoles = AGENT_ROLE_CATALOG.filter(r => r.level === 'rig')

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          AGENT ROLE CATALOG
        </h1>
        <p className="text-text-secondary">
          Agent roles and their relationships to bead types. Shows what each agent
          works with, produces, and monitors.
        </p>
      </div>

      {/* Town-level roles */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="section-header">TOWN-LEVEL ROLES</h2>
          <p className="text-sm text-text-muted">Operate at the town level, coordinate across rigs</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {townRoles.map(role => (
            <AgentRoleCard key={role.role} info={role} />
          ))}
        </div>
      </div>

      {/* Rig-level roles */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="section-header">RIG-LEVEL ROLES</h2>
          <p className="text-sm text-text-muted">Operate within a specific rig</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rigRoles.map(role => (
            <AgentRoleCard key={role.role} info={role} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Cross-reference matrix showing which agents work with which bead types.
 */
function AgentBeadMatrix() {
  const workBeadTypes = getIssueTypesByCategory('work')
  const coordBeadTypes = getIssueTypesByCategory('coordination')
  const infraBeadTypes = getIssueTypesByCategory('infrastructure')
  const allBeadTypes = [...workBeadTypes, ...coordBeadTypes, ...infraBeadTypes]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="section-header mb-2">AGENT ↔ BEAD TYPE MATRIX</h2>
        <p className="text-sm text-text-muted">
          Cross-reference showing which agents interact with which bead types.
          <span className="text-status-in-progress"> ●</span> = works with,
          <span className="text-status-closed"> ●</span> = produces,
          <span className="text-accent-primary"> ●</span> = monitors
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-text-muted">Agent</th>
              {allBeadTypes.map(type => (
                <th key={type.type} className="text-center py-2 px-2 font-normal">
                  <span className={type.colorClass} title={type.label}>{type.icon}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AGENT_ROLE_CATALOG.map(role => (
              <tr key={role.role} className="border-b border-border/50 hover:bg-bg-tertiary/30">
                <td className="py-2 px-3">
                  <span className="mr-2">{role.icon}</span>
                  <span className="text-text-primary">{role.label}</span>
                </td>
                {allBeadTypes.map(type => {
                  const works = role.worksWith.includes(type.type)
                  const produces = role.produces.includes(type.type)
                  const monitors = role.monitors.includes(type.type)

                  return (
                    <td key={type.type} className="text-center py-2 px-2">
                      <div className="flex justify-center gap-0.5">
                        {works && <span className="text-status-in-progress text-xs">●</span>}
                        {produces && <span className="text-status-closed text-xs">●</span>}
                        {monitors && <span className="text-accent-primary text-xs">●</span>}
                        {!works && !produces && !monitors && <span className="text-text-muted/30">·</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const AgentRoles: Story = {
  render: () => <AgentRoleCatalog />,
}

export const AgentBeadRelationships: Story = {
  render: () => <AgentBeadMatrix />,
}
