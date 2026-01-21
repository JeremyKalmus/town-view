import type { Meta, StoryObj } from '@storybook/react'
import { RigHealthGrid, HealthDot } from './RigHealthGrid'
import type { Rig, Agent } from '@/types'

// Mock data for stories
const mockRigs: Rig[] = [
  {
    id: 'townview',
    name: 'townview',
    prefix: 'to',
    path: '/projects/townview',
    beads_path: '/projects/townview/.beads',
    issue_count: 45,
    open_count: 12,
    agent_count: 5,
  },
  {
    id: 'gas-town',
    name: 'gas-town',
    prefix: 'gt',
    path: '/projects/gas-town',
    beads_path: '/projects/gas-town/.beads',
    issue_count: 78,
    open_count: 23,
    agent_count: 8,
  },
  {
    id: 'bullet-farm',
    name: 'bullet-farm',
    prefix: 'bf',
    path: '/projects/bullet-farm',
    beads_path: '/projects/bullet-farm/.beads',
    issue_count: 34,
    open_count: 5,
    agent_count: 3,
  },
  {
    id: 'citadel',
    name: 'citadel',
    prefix: 'ct',
    path: '/projects/citadel',
    beads_path: '/projects/citadel/.beads',
    issue_count: 120,
    open_count: 0,
    agent_count: 6,
  },
]

const mockAgentsHealthy: Record<string, Agent[]> = {
  townview: [
    { id: 'to-witness', name: 'witness', role_type: 'witness', rig: 'townview', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'to-refinery', name: 'refinery', role_type: 'refinery', rig: 'townview', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'to-polecat-1', name: 'capable', role_type: 'polecat', rig: 'townview', state: 'working', hook_bead: 'to-c133.4', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'to-polecat-2', name: 'swift', role_type: 'polecat', rig: 'townview', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'to-crew-1', name: 'team-alpha', role_type: 'crew', rig: 'townview', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
  ],
  'gas-town': [
    { id: 'gt-witness', name: 'overseer', role_type: 'witness', rig: 'gas-town', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-refinery', name: 'processor', role_type: 'refinery', rig: 'gas-town', state: 'working', hook_bead: 'gt-batch-001', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-1', name: 'runner-1', role_type: 'polecat', rig: 'gas-town', state: 'working', hook_bead: 'gt-t42.1', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-2', name: 'runner-2', role_type: 'polecat', rig: 'gas-town', state: 'working', hook_bead: 'gt-t43.2', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-3', name: 'runner-3', role_type: 'polecat', rig: 'gas-town', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-crew-1', name: 'team-bravo', role_type: 'crew', rig: 'gas-town', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-crew-2', name: 'team-charlie', role_type: 'crew', rig: 'gas-town', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-deacon', name: 'scheduler', role_type: 'deacon', rig: 'gas-town', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
  ],
  'bullet-farm': [
    { id: 'bf-witness', name: 'watcher', role_type: 'witness', rig: 'bullet-farm', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'bf-refinery', name: 'builder', role_type: 'refinery', rig: 'bullet-farm', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'bf-polecat-1', name: 'worker-1', role_type: 'polecat', rig: 'bullet-farm', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
  ],
  citadel: [
    { id: 'ct-witness', name: 'sentinel', role_type: 'witness', rig: 'citadel', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'ct-refinery', name: 'forge', role_type: 'refinery', rig: 'citadel', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'ct-polecat-1', name: 'elite-1', role_type: 'polecat', rig: 'citadel', state: 'working', hook_bead: 'ct-m99.1', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'ct-polecat-2', name: 'elite-2', role_type: 'polecat', rig: 'citadel', state: 'working', hook_bead: 'ct-m99.2', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'ct-crew-1', name: 'war-boys', role_type: 'crew', rig: 'citadel', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'ct-mayor', name: 'immortan', role_type: 'mayor', rig: 'citadel', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
  ],
}

const mockAgentsWithStuck: Record<string, Agent[]> = {
  ...mockAgentsHealthy,
  'gas-town': [
    { id: 'gt-witness', name: 'overseer', role_type: 'witness', rig: 'gas-town', state: 'stuck', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-refinery', name: 'processor', role_type: 'refinery', rig: 'gas-town', state: 'working', hook_bead: 'gt-batch-001', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-1', name: 'runner-1', role_type: 'polecat', rig: 'gas-town', state: 'stuck', hook_bead: 'gt-t42.1', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-2', name: 'runner-2', role_type: 'polecat', rig: 'gas-town', state: 'working', hook_bead: 'gt-t43.2', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-polecat-3', name: 'runner-3', role_type: 'polecat', rig: 'gas-town', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-crew-1', name: 'team-bravo', role_type: 'crew', rig: 'gas-town', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-crew-2', name: 'team-charlie', role_type: 'crew', rig: 'gas-town', state: 'stuck', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'gt-deacon', name: 'scheduler', role_type: 'deacon', rig: 'gas-town', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
  ],
  'bullet-farm': [
    { id: 'bf-witness', name: 'watcher', role_type: 'witness', rig: 'bullet-farm', state: 'stuck', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'bf-refinery', name: 'builder', role_type: 'refinery', rig: 'bullet-farm', state: 'stuck', updated_at: '2026-01-21T10:00:00Z' },
    { id: 'bf-polecat-1', name: 'worker-1', role_type: 'polecat', rig: 'bullet-farm', state: 'stuck', updated_at: '2026-01-21T10:00:00Z' },
  ],
}

const meta: Meta<typeof RigHealthGrid> = {
  title: 'Features/RigHealthGrid',
  component: RigHealthGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof RigHealthGrid>

export const Default: Story = {
  args: {
    mockRigs,
    mockAgents: mockAgentsHealthy,
    onRigClick: (rig) => console.log('Clicked rig:', rig.name),
  },
}

export const WithStuckAgents: Story = {
  args: {
    mockRigs,
    mockAgents: mockAgentsWithStuck,
    onRigClick: (rig) => console.log('Clicked rig:', rig.name),
  },
}

export const Loading: Story = {
  args: {
    mockRigs: [],
    mockLoading: true,
  },
}

export const Error: Story = {
  args: {
    mockRigs: [],
    mockError: 'Failed to connect to server. Please check if the Town View backend is running.',
  },
}

export const Empty: Story = {
  args: {
    mockRigs: [],
    mockAgents: {},
  },
}

export const SingleRig: Story = {
  args: {
    mockRigs: [mockRigs[0]],
    mockAgents: { townview: mockAgentsHealthy.townview },
    onRigClick: (rig) => console.log('Clicked rig:', rig.name),
  },
}

export const ManyRigs: Story = {
  args: {
    mockRigs: [
      ...mockRigs,
      {
        id: 'wasteland-1',
        name: 'wasteland-north',
        prefix: 'wn',
        path: '/projects/wasteland-north',
        beads_path: '/projects/wasteland-north/.beads',
        issue_count: 56,
        open_count: 18,
        agent_count: 4,
      },
      {
        id: 'wasteland-2',
        name: 'wasteland-south',
        prefix: 'ws',
        path: '/projects/wasteland-south',
        beads_path: '/projects/wasteland-south/.beads',
        issue_count: 42,
        open_count: 7,
        agent_count: 3,
      },
      {
        id: 'fury-road',
        name: 'fury-road',
        prefix: 'fr',
        path: '/projects/fury-road',
        beads_path: '/projects/fury-road/.beads',
        issue_count: 89,
        open_count: 31,
        agent_count: 10,
      },
    ],
    mockAgents: {
      ...mockAgentsHealthy,
      'wasteland-1': [
        { id: 'wn-witness', name: 'scout', role_type: 'witness', rig: 'wasteland-north', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'wn-polecat-1', name: 'nomad-1', role_type: 'polecat', rig: 'wasteland-north', state: 'working', hook_bead: 'wn-t1.1', updated_at: '2026-01-21T10:00:00Z' },
      ],
      'wasteland-2': [
        { id: 'ws-witness', name: 'lookout', role_type: 'witness', rig: 'wasteland-south', state: 'idle', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'ws-refinery', name: 'assembler', role_type: 'refinery', rig: 'wasteland-south', state: 'paused', updated_at: '2026-01-21T10:00:00Z' },
      ],
      'fury-road': [
        { id: 'fr-witness', name: 'tracker', role_type: 'witness', rig: 'fury-road', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'fr-refinery', name: 'war-rig', role_type: 'refinery', rig: 'fury-road', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'fr-polecat-1', name: 'max', role_type: 'polecat', rig: 'fury-road', state: 'working', hook_bead: 'fr-chase.1', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'fr-polecat-2', name: 'furiosa', role_type: 'polecat', rig: 'fury-road', state: 'working', hook_bead: 'fr-chase.2', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'fr-polecat-3', name: 'nux', role_type: 'polecat', rig: 'fury-road', state: 'stuck', hook_bead: 'fr-chase.3', updated_at: '2026-01-21T10:00:00Z' },
        { id: 'fr-crew-1', name: 'war-party', role_type: 'crew', rig: 'fury-road', state: 'working', updated_at: '2026-01-21T10:00:00Z' },
      ],
    },
    onRigClick: (rig) => console.log('Clicked rig:', rig.name),
  },
}

// Separate story for HealthDot component
export const HealthDotStates: Story = {
  render: () => (
    <div className="p-6 space-y-4">
      <h2 className="section-header mb-4">HEALTH DOT STATES</h2>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <HealthDot state={null} />
          <span className="text-sm text-text-secondary">No agent</span>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot state="idle" />
          <span className="text-sm text-text-secondary">Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot state="working" />
          <span className="text-sm text-text-secondary">Working</span>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot state="stuck" />
          <span className="text-sm text-text-secondary">Stuck</span>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot state="paused" />
          <span className="text-sm text-text-secondary">Paused</span>
        </div>
      </div>
    </div>
  ),
}
