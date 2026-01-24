import type { Meta, StoryObj } from '@storybook/react'
import { useState, useMemo } from 'react'
import type { Issue } from '@/types'

/**
 * Schema definition for the beads data model.
 * This mirrors what you'd see in a SQL "DESCRIBE table" command.
 */
interface FieldSchema {
  name: string
  type: string
  nullable: boolean
  description: string
  enumValues?: string[] | number[]
}

const BEAD_SCHEMA: FieldSchema[] = [
  { name: 'id', type: 'string', nullable: false, description: 'Unique identifier (prefix + 4-char hash)', enumValues: undefined },
  { name: 'title', type: 'string', nullable: false, description: 'Short summary of the issue' },
  { name: 'description', type: 'string', nullable: true, description: 'Detailed description (markdown supported)' },
  { name: 'status', type: 'enum', nullable: false, description: 'Current lifecycle state', enumValues: ['open', 'in_progress', 'blocked', 'deferred', 'closed', 'tombstone'] },
  { name: 'priority', type: 'number', nullable: false, description: '0=critical, 1=high, 2=normal, 3=low', enumValues: [0, 1, 2, 3] },
  { name: 'issue_type', type: 'enum', nullable: false, description: 'Type of bead', enumValues: ['bug', 'task', 'feature', 'epic', 'chore', 'merge-request', 'molecule', 'gate', 'convoy', 'agent', 'event', 'rig'] },
  { name: 'owner', type: 'string', nullable: true, description: 'Email or identifier of the owner' },
  { name: 'assignee', type: 'string', nullable: true, description: 'Agent or person assigned to work on this' },
  { name: 'created_at', type: 'datetime', nullable: false, description: 'ISO 8601 timestamp of creation' },
  { name: 'created_by', type: 'string', nullable: true, description: 'Actor who created this bead (e.g., townview/crew/jeremy)' },
  { name: 'updated_at', type: 'datetime', nullable: false, description: 'ISO 8601 timestamp of last modification' },
  { name: 'closed_at', type: 'datetime', nullable: true, description: 'ISO 8601 timestamp when closed' },
  { name: 'close_reason', type: 'string', nullable: true, description: 'Reason for closing (free text)' },
  { name: 'labels', type: 'string[]', nullable: true, description: 'Array of labels (e.g., gt:agent, gt:rig)' },
  { name: 'dependencies', type: 'string[]', nullable: true, description: 'Array of bead IDs this depends on' },
  { name: 'comments', type: 'object[]', nullable: true, description: 'Array of comment objects' },
  { name: 'notes', type: 'string', nullable: true, description: 'Additional notes field' },
  { name: 'ephemeral', type: 'boolean', nullable: true, description: 'If true, this is a wisp (temporary/auto-cleaned)' },
  { name: 'deleted_at', type: 'datetime', nullable: true, description: 'Soft-delete timestamp' },
  { name: 'deleted_by', type: 'string', nullable: true, description: 'Actor who deleted this bead' },
  { name: 'delete_reason', type: 'string', nullable: true, description: 'Reason for deletion' },
  { name: 'original_type', type: 'string', nullable: true, description: 'Original type before conversion' },
]

// Sample data for demonstration
const SAMPLE_DATA: Partial<Issue>[] = [
  {
    id: 'to-yxth',
    title: 'Active Convoys Panel',
    description: 'Implement real-time convoy monitoring panel',
    status: 'open',
    priority: 1,
    issue_type: 'epic',
    assignee: 'townview/crew/jeremy',
    created_at: '2026-01-22T10:00:00-08:00',
    created_by: 'mayor/',
    updated_at: '2026-01-22T12:14:00-08:00',
    labels: [],
  },
  {
    id: 'to-j9et',
    title: 'Fix activity thresholds',
    status: 'in_progress',
    priority: 2,
    issue_type: 'task',
    assignee: 'townview/polecats/alpha',
    created_at: '2026-01-22T08:30:00-08:00',
    created_by: 'townview/crew/jeremy',
    updated_at: '2026-01-22T11:45:00-08:00',
  },
  {
    id: 'to-abc1',
    title: 'Session ended: polecat-alpha',
    status: 'closed',
    priority: 2,
    issue_type: 'event',
    created_at: '2026-01-21T15:00:00-08:00',
    created_by: 'townview/refinery',
    updated_at: '2026-01-21T15:00:00-08:00',
    closed_at: '2026-01-21T15:00:00-08:00',
    close_reason: 'auto-closed session cost wisp',
  },
  {
    id: 'to-rig-townview',
    title: 'townview',
    status: 'open',
    priority: 2,
    issue_type: 'rig',
    labels: ['gt:rig'],
    created_at: '2026-01-20T09:00:00-08:00',
    created_by: 'system',
    updated_at: '2026-01-22T12:00:00-08:00',
  },
  {
    id: 'to-witness',
    title: 'Witness Agent',
    status: 'open',
    priority: 2,
    issue_type: 'agent',
    labels: ['gt:agent'],
    created_at: '2026-01-20T09:00:00-08:00',
    created_by: 'system',
    updated_at: '2026-01-22T12:00:00-08:00',
  },
]

/**
 * Schema Table - Shows field definitions like SQL DESCRIBE
 */
function SchemaTable() {
  const [sortField, setSortField] = useState<'name' | 'type'>('name')
  const [filterType, setFilterType] = useState<string>('all')

  const sortedSchema = useMemo(() => {
    let filtered = BEAD_SCHEMA
    if (filterType !== 'all') {
      filtered = BEAD_SCHEMA.filter(f => f.type === filterType)
    }
    return [...filtered].sort((a, b) => a[sortField].localeCompare(b[sortField]))
  }, [sortField, filterType])

  const uniqueTypes = [...new Set(BEAD_SCHEMA.map(f => f.type))]

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as 'name' | 'type')}
            className="bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary"
          >
            <option value="name">Field Name</option>
            <option value="type">Data Type</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">Filter type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left py-2 px-3 font-mono text-text-primary border-b border-border">Field</th>
              <th className="text-left py-2 px-3 font-mono text-text-primary border-b border-border">Type</th>
              <th className="text-center py-2 px-3 font-mono text-text-primary border-b border-border">Nullable</th>
              <th className="text-left py-2 px-3 text-text-primary border-b border-border">Description</th>
              <th className="text-left py-2 px-3 text-text-primary border-b border-border">Enum Values</th>
            </tr>
          </thead>
          <tbody>
            {sortedSchema.map((field, i) => (
              <tr key={field.name} className={i % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-primary'}>
                <td className="py-2 px-3 font-mono text-amber-400">{field.name}</td>
                <td className="py-2 px-3 font-mono">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    field.type === 'string' ? 'bg-green-500/20 text-green-400' :
                    field.type === 'number' ? 'bg-blue-500/20 text-blue-400' :
                    field.type === 'boolean' ? 'bg-purple-500/20 text-purple-400' :
                    field.type === 'datetime' ? 'bg-orange-500/20 text-orange-400' :
                    field.type === 'enum' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {field.type}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  {field.nullable ? (
                    <span className="text-text-muted">NULL</span>
                  ) : (
                    <span className="text-status-blocked">NOT NULL</span>
                  )}
                </td>
                <td className="py-2 px-3 text-text-primary">{field.description}</td>
                <td className="py-2 px-3 font-mono text-xs">
                  {field.enumValues ? (
                    <div className="flex flex-wrap gap-1">
                      {field.enumValues.map((v) => (
                        <span key={String(v)} className="bg-bg-tertiary text-text-primary px-1.5 py-0.5 rounded">
                          {String(v)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-text-secondary">
        {sortedSchema.length} field(s) • Storage: JSONL (issues.jsonl)
      </div>
    </div>
  )
}

/**
 * Data Table - Shows actual bead data in a spreadsheet-like view
 */
function DataTable({ data }: { data: Partial<Issue>[] }) {
  const [sortColumn, setSortColumn] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['id', 'title', 'status', 'priority', 'issue_type', 'assignee', 'updated_at'])
  )

  const allColumns = ['id', 'title', 'status', 'priority', 'issue_type', 'assignee', 'created_at', 'created_by', 'updated_at', 'closed_at', 'labels']

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = String(a[sortColumn as keyof Issue] ?? '')
      const bVal = String(b[sortColumn as keyof Issue] ?? '')
      const cmp = aVal.localeCompare(bVal)
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [data, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(col)) {
        next.delete(col)
      } else {
        next.add(col)
      }
      return next
    })
  }

  const formatValue = (value: unknown, column: string): string => {
    if (value === null || value === undefined) return '—'
    if (column.includes('_at') && typeof value === 'string') {
      return new Date(value).toLocaleString()
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '—'
    }
    return String(value)
  }

  return (
    <div>
      {/* Column toggles */}
      <div className="mb-4">
        <div className="text-sm text-text-primary mb-2">Visible columns:</div>
        <div className="flex flex-wrap gap-2">
          {allColumns.map(col => (
            <button
              key={col}
              onClick={() => toggleColumn(col)}
              className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
                visibleColumns.has(col)
                  ? 'bg-amber-500 text-bg-primary'
                  : 'bg-bg-tertiary text-text-muted hover:bg-bg-tertiary/80'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary">
            <tr>
              {allColumns.filter(c => visibleColumns.has(c)).map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left py-2 px-3 font-mono text-text-primary border-b border-border cursor-pointer hover:bg-bg-primary select-none"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortColumn === col && (
                      <span className="text-amber-400">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr key={row.id} className={`${i % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-primary'} hover:bg-bg-tertiary/50`}>
                {allColumns.filter(c => visibleColumns.has(c)).map(col => (
                  <td key={col} className="py-2 px-3 font-mono text-xs">
                    {col === 'status' ? (
                      <span className={`px-1.5 py-0.5 rounded ${
                        row.status === 'open' ? 'bg-status-open/20 text-status-open' :
                        row.status === 'in_progress' ? 'bg-status-in-progress/20 text-status-in-progress' :
                        row.status === 'closed' ? 'bg-status-closed/20 text-status-closed' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {row.status}
                      </span>
                    ) : col === 'issue_type' ? (
                      <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-primary">
                        {row.issue_type}
                      </span>
                    ) : col === 'priority' ? (
                      <span className={`px-1.5 py-0.5 rounded ${
                        row.priority === 0 ? 'bg-red-500/20 text-red-400' :
                        row.priority === 1 ? 'bg-orange-500/20 text-orange-400' :
                        row.priority === 2 ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        P{row.priority}
                      </span>
                    ) : (
                      <span className="text-text-primary">
                        {formatValue(row[col as keyof Issue], col)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-text-secondary">
        {sortedData.length} row(s) • Sorted by {sortColumn} ({sortDirection})
      </div>
    </div>
  )
}

/**
 * Field Statistics - Shows unique value counts per field
 */
function FieldStatistics({ data }: { data: Partial<Issue>[] }) {
  const stats = useMemo(() => {
    const fieldStats: Record<string, { total: number; unique: number; nullCount: number; values: Map<string, number> }> = {}

    const fieldsToAnalyze = ['status', 'priority', 'issue_type', 'created_by', 'assignee', 'labels']

    for (const field of fieldsToAnalyze) {
      fieldStats[field] = { total: 0, unique: 0, nullCount: 0, values: new Map() }

      for (const row of data) {
        const value = row[field as keyof Issue]
        fieldStats[field].total++

        if (value === null || value === undefined) {
          fieldStats[field].nullCount++
        } else if (Array.isArray(value)) {
          for (const v of value) {
            const key = String(v)
            fieldStats[field].values.set(key, (fieldStats[field].values.get(key) ?? 0) + 1)
          }
        } else {
          const key = String(value)
          fieldStats[field].values.set(key, (fieldStats[field].values.get(key) ?? 0) + 1)
        }
      }

      fieldStats[field].unique = fieldStats[field].values.size
    }

    return fieldStats
  }, [data])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(stats).map(([field, stat]) => (
        <div key={field} className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-amber-400">{field}</span>
            <span className="text-xs text-text-secondary">
              {stat.unique} unique / {stat.total} total
            </span>
          </div>

          <div className="space-y-1">
            {Array.from(stat.values.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([value, count]) => (
                <div key={value} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-text-primary truncate mr-2">{value}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-amber-500/50 rounded"
                      style={{ width: `${(count / stat.total) * 60}px` }}
                    />
                    <span className="text-xs text-text-secondary w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {stat.nullCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-text-muted italic">NULL</span>
                <span className="text-xs text-text-muted">{stat.nullCount}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Full Data Explorer - combines all views
 */
function DataExplorer() {
  const [activeTab, setActiveTab] = useState<'schema' | 'data' | 'stats'>('schema')

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-2">
          DATA EXPLORER
        </h1>
        <p className="text-text-primary">
          Explore the beads data model like a database. View schema definitions,
          browse actual data, and analyze field statistics.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['schema', 'data', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab === 'schema' && '📋 Schema'}
            {tab === 'data' && '📊 Data Table'}
            {tab === 'stats' && '📈 Field Statistics'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'schema' && (
        <div>
          <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-sm">
            <code className="text-amber-400">DESCRIBE</code>{' '}
            <code className="text-text-primary">beads</code>
            <span className="text-text-secondary ml-2">— Shows all fields in the beads table</span>
          </div>
          <SchemaTable />
        </div>
      )}

      {activeTab === 'data' && (
        <div>
          <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-sm">
            <code className="text-amber-400">SELECT</code>{' '}
            <code className="text-text-primary">* FROM beads LIMIT 5</code>
            <span className="text-text-secondary ml-2">— Sample data from townview rig</span>
          </div>
          <DataTable data={SAMPLE_DATA} />
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-sm">
            <code className="text-amber-400">SELECT</code>{' '}
            <code className="text-text-primary">field, COUNT(DISTINCT value) FROM beads GROUP BY field</code>
            <span className="text-text-secondary ml-2">— Unique values per field</span>
          </div>
          <FieldStatistics data={SAMPLE_DATA} />
        </div>
      )}
    </div>
  )
}

// Storybook metadata
const meta: Meta = {
  title: 'Reference/Data Explorer',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj

export const FullExplorer: Story = {
  render: () => <DataExplorer />,
}

export const SchemaOnly: Story = {
  render: () => (
    <div className="p-6 max-w-5xl">
      <h2 className="section-header mb-4">BEAD SCHEMA</h2>
      <SchemaTable />
    </div>
  ),
}

export const DataTableOnly: Story = {
  render: () => (
    <div className="p-6 max-w-5xl">
      <h2 className="section-header mb-4">DATA TABLE</h2>
      <DataTable data={SAMPLE_DATA} />
    </div>
  ),
}

export const FieldStatsOnly: Story = {
  render: () => (
    <div className="p-6 max-w-5xl">
      <h2 className="section-header mb-4">FIELD STATISTICS</h2>
      <FieldStatistics data={SAMPLE_DATA} />
    </div>
  ),
}
