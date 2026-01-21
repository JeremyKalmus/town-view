# Town View - Project Constitution

> A real-time visualization and management interface for Gas Town

## Vision

Town View provides visibility into the Gas Town multi-agent workspace. It answers:
- **What's happening now?** - Real-time monitoring of agents, work, and progress
- **What happened?** - Audit trail of polecat work vs. assignments
- **What's coming?** - Roadmap view of epics, tasks, and dependencies
- **Can I fix that?** - Direct editing of beads with confirmation

## Principles

### 1. Zero Configuration Discovery
Rigs are discovered automatically from `~/gt/.beads/routes.jsonl` and directory scanning. Adding a new rig to Gas Town automatically makes it visible in Town View. No hardcoded rig lists.

### 2. Beads as Source of Truth
All data flows from beads. Town View is a lens, not a database. Reads use `bd list --json`. Writes use `bd update`, `bd close`, etc. No shadow state.

### 3. Real-Time by Default
Changes in beads appear in the UI within seconds. File watching on `.beads/` directories triggers WebSocket broadcasts. Users see the town as it breathes.

### 4. Confirmed Writes
All mutations require explicit user confirmation. A slide-out diff shows what will change before committing. No accidental status changes.

### 5. Local Only
Town View runs on localhost. Gas Town is a local development environment; Town View matches that constraint. No cloud deployment, no auth complexity.

### 6. Mad Max Aesthetic (Optional)
The Gas Town theme (Mad Max: Fury Road) can inform the visual design - industrial, gritty, functional. But usability trumps theme. If the theme hurts UX, drop it.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (localhost:8080)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React + Vite + TailwindCSS                           │  │
│  │  - Rig Navigator (sidebar)                            │  │
│  │  - Dashboard / Roadmap / Audit views                  │  │
│  │  - Issue Editor (slide-out)                           │  │
│  │  - WebSocket client for live updates                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Go Backend (:8080)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  - REST API: /api/rigs, /api/rigs/:id/issues, etc.   │  │
│  │  - WebSocket hub: /ws                                 │  │
│  │  - File watcher: fsnotify on .beads/ directories     │  │
│  │  - bd CLI executor: shells out for reads/writes      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ exec.Command("bd", ...)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Beads Layer                            │
│  ~/gt/.beads/           - Town-level beads (HQ, mail)      │
│  ~/gt/<rig>/.beads/     - Rig-level beads (per project)    │
│  routes.jsonl           - Prefix → path mapping            │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Views

### 1. Rig Navigator (Sidebar)
- Auto-discovered list of all rigs
- Per-rig summary: open issues, active agents, health indicator
- Click to select, loads rig detail in main area
- "Town" meta-rig for HQ-level beads

### 2. Rig Dashboard
- **Agent Cards**: Each agent (witness, refinery, crew, polecats) with:
  - Current state (idle, working, stuck)
  - Hooked bead (if any)
  - Quick actions (view work, open in terminal)
- **Active Molecules**: In-progress workflows
- **Issue Summary**: Pie/bar chart of status distribution
- **Recent Activity**: Last N state changes

### 3. Roadmap View (Epic Hierarchy)
- Tree visualization: Epic → Task → Subtask
- Expand/collapse with keyboard nav
- Status icons: ○ open, ◐ in_progress, ● blocked, ✓ closed
- Priority color coding: P0 red, P1 orange, P2 yellow, P3 blue, P4 gray
- Click node to edit
- Filter controls: status, type, assignee, priority range
- Dependency arrows (optional toggle)

### 4. Audit View (Work Review)
- **Convoy Selector**: Pick a convoy or date range
- **Assignment vs. Completion**: Side-by-side comparison
  - What was dispatched (original bead state)
  - What was delivered (final bead state + close reason)
- **Agent Timeline**: Who touched what, when
- **Diff View**: Description changes over time
- **Metrics**: Time to complete, re-assignments, conflicts

### 5. Issue Editor (Slide-out Panel)
- Full issue display with all fields
- Editable: status, priority, title, description, labels, assignee
- Read-only: id, created_at, created_by
- **Confirmation Modal**: Shows diff of changes before applying
- Dependencies tab: view/add/remove blockers
- Comments tab: view/add comments
- History tab: audit trail of changes

---

## Data Model Reference

### Issue (Bead)
```json
{
  "id": "gt-xyz",
  "title": "string",
  "description": "string (may contain key: value fields)",
  "status": "open | in_progress | blocked | deferred | closed | tombstone",
  "priority": 0-4,
  "issue_type": "bug | feature | task | epic | chore | merge-request | molecule | gate | convoy | agent",
  "owner": "string",
  "assignee": "string",
  "created_at": "ISO8601",
  "created_by": "string",
  "updated_at": "ISO8601",
  "closed_at": "ISO8601",
  "close_reason": "string",
  "labels": ["string"],
  "dependency_count": number,
  "dependent_count": number
}
```

### Rig Discovery
Source: `~/gt/.beads/routes.jsonl`
```json
{"prefix": "gt-", "path": "."}
{"prefix": "to-", "path": "townview"}
{"prefix": "he-", "path": "heyhey/mayor/rig"}
```

Also scan for directories with `.beads/config.yaml` containing `prefix:`.

---

## API Endpoints (Draft)

### Rigs
- `GET /api/rigs` - List all discovered rigs
- `GET /api/rigs/:rigId` - Rig details + summary stats

### Issues
- `GET /api/rigs/:rigId/issues` - List issues (with filters)
- `GET /api/rigs/:rigId/issues/:issueId` - Single issue detail
- `PATCH /api/rigs/:rigId/issues/:issueId` - Update issue (confirmed)
- `GET /api/rigs/:rigId/issues/:issueId/history` - Audit trail

### Agents
- `GET /api/rigs/:rigId/agents` - List agents for rig

### WebSocket
- `ws://localhost:8080/ws` - Subscribe to change events
  - `{type: "issue_changed", rig: "...", issue: {...}}`
  - `{type: "rig_discovered", rig: "..."}`

---

## Roadmap

### Phase 1: Tracer Bullet
- [ ] Go backend with single endpoint: `GET /api/rigs`
- [ ] Rig discovery from routes.jsonl
- [ ] React frontend with rig list sidebar
- [ ] Click rig → show raw JSON of issues
- [ ] Prove end-to-end data flow

### Phase 2: Dashboard View
- [ ] Rig dashboard with agent cards
- [ ] Issue list with status/priority badges
- [ ] Basic filtering (status, type)
- [ ] File watching + WebSocket for live updates

### Phase 3: Roadmap View
- [ ] Epic hierarchy tree component
- [ ] Expand/collapse navigation
- [ ] Status/priority indicators
- [ ] Filter controls

### Phase 4: Issue Editor
- [ ] Slide-out panel with full issue display
- [ ] Editable fields with form validation
- [ ] Confirmation modal with diff
- [ ] bd CLI integration for writes

### Phase 5: Audit View
- [ ] Convoy selector
- [ ] Assignment vs completion comparison
- [ ] Agent timeline
- [ ] Change history diff

### Phase 6: Polish
- [ ] Keyboard navigation
- [ ] Dark mode
- [ ] Performance optimization
- [ ] Error handling and offline resilience

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18 + Vite | Fast dev, modern React |
| Styling | TailwindCSS | Utility-first, rapid iteration |
| Components | shadcn/ui | High-quality, customizable |
| State | Zustand or React Query | Lightweight, good for real-time |
| Backend | Go (net/http) | Matches Gas Town, fast, single binary |
| File Watch | fsnotify | Cross-platform file watching |
| WebSocket | gorilla/websocket | Battle-tested Go WS library |
| CLI Bridge | os/exec → bd | Leverage existing beads CLI |

---

## Design Direction (TBD)

Options to discuss:
1. **Industrial/Mad Max** - Rust textures, warning stripes, gauges, gritty fonts
2. **Clean Dashboard** - Minimal, lots of whitespace, focus on data
3. **Terminal Aesthetic** - Monospace, green-on-black, hacker vibe
4. **Hybrid** - Clean layout with subtle Mad Max accents (colors, icons)

See discussion in project thread.

---

## Non-Goals

- Cloud deployment or multi-user auth
- Mobile-responsive design (desktop-first)
- Replacing the bd CLI (this is a complement)
- Real-time collaboration features
- Storing state outside of beads

---

## Open Questions

1. Should Town View have its own bead prefix for meta-issues?
2. How to handle very large issue counts (pagination vs virtual scroll)?
3. Should we support multiple browser tabs with synced state?
4. Integration with tmux - click agent → open terminal pane?

---

*Document created: 2026-01-20*
*Last updated: 2026-01-20*
