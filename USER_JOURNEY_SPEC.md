# Town View - User Journey Specification

> Defines how users interact with Town View to plan, monitor, and audit work

---

## User Profile

**Primary User**: The Overseer (human operator of Gas Town)

**Goals**:
1. Plan work effectively - ensure epics/tasks/subtasks fit together coherently
2. Catch pattern violations before work starts - verify Keepers guidance is followed
3. Monitor active work - see what's in flight, spot stuck agents
4. Audit completed work - compare planned vs actual delivery

---

## Priority Stack

| Priority | Use Case | Time Spent | Description |
|----------|----------|------------|-------------|
| **Primary** | Planning | ~70% | Review hierarchy, ensure coherence, verify patterns |
| **Secondary** | Monitoring | ~20% | What's in flight, who's stuck |
| **Tertiary** | Audit | ~10% | Planned vs completed comparison |

---

## Navigation Model

### Global Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Town View]                                    [Settings]      │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  RIG TABS    │           MAIN CONTENT AREA                      │
│              │                                                  │
│  ┌────────┐  │  View depends on selected rig + mode:            │
│  │ Town   │  │  - Planning (Roadmap)                            │
│  ├────────┤  │  - Monitoring (In Flight)                        │
│  │ beads  │  │  - Audit (Review)                                │
│  ├────────┤  │                                                  │
│  │ gastown│  │                                                  │
│  ├────────┤  │                                                  │
│  │townview│◀─│─ Selected                                        │
│  └────────┘  │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Rig Tab Summary

Each rig tab displays at-a-glance health:
- Rig name
- Count of open epics/tasks
- Blocked indicator (if any items blocked)
- Active work indicator (if agents working)

---

## Journey 1: Planning (Primary)

### Purpose
Review the work hierarchy to ensure:
- Tasks break down logically from epics
- Subtasks cover the full scope of tasks
- Keepers guidance is being followed (existing patterns reused)
- Dependencies are correctly ordered

### Entry Flow

```
1. Open Town View
   └─→ See all rigs in sidebar with summary stats

2. Click rig tab (e.g., "townview")
   └─→ Planning view loads (default view for rig)

3. See epic list with progress indicators
   └─→ Each epic shows: title, status, task progress (e.g., "3/7 tasks")
```

### Planning View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  townview                                    [Planning ▼]       │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Status ▼] [Priority ▼] [Type ▼]        [Search 🔍]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▶ Epic: "WebSocket Reliability"                                │
│    ○ open · 2/5 tasks · 1 blocked · P1                         │
│                                                                 │
│  ▼ Epic: "Issue Editor"                                         │
│    ◐ in_progress · 3/4 tasks · P2                              │
│    │                                                            │
│    ├─ ✓ Task: "Slide-out panel component"                      │
│    │    [expand ▼]                                              │
│    │    ┌──────────────────────────────────────────────────┐   │
│    │    │ Uses shadcn Sheet component for the panel.       │   │
│    │    │ Keeper: Reuse existing useSlideOut hook from...  │   │
│    │    └──────────────────────────────────────────────────┘   │
│    │                                                            │
│    ├─ ◐ Task: "Form validation"                                │
│    │    ● blocked by gt-abc                                    │
│    │    ▼ Subtasks (2)                                         │
│    │      ├─ ✓ "Define Zod validation schema"                  │
│    │      └─ ○ "Wire up error display components"              │
│    │                                                            │
│    ├─ ○ Task: "Confirmation modal with diff"                   │
│    │                                                            │
│    └─ ○ Task: "bd CLI integration for writes"                  │
│                                                                 │
│  ▶ Epic: "Audit View"                                           │
│    ○ open · 0/3 tasks · P3                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction: Expand/Collapse

| Action | Result |
|--------|--------|
| Click ▶ on epic | Expand to show child tasks |
| Click ▼ on epic | Collapse to hide child tasks |
| Click ▶ on task | Expand to show subtasks |
| Click [expand ▼] on preview | Show full description inline |
| Click item title | Open editor panel (slide-out) |

### Interaction: Dependencies

| Indicator | Meaning | Action |
|-----------|---------|--------|
| `● blocked by gt-abc` | Item cannot proceed until blocker resolved | Click `gt-abc` to jump to blocker |
| `→ blocks gt-xyz` | Other items waiting on this | Click to see dependents |

### Interaction: Edit (Slide-out Panel)

Clicking any item title opens editor:

```
┌──────────────────────────────────────────┐
│  Task: "Form validation"           [X]   │
├──────────────────────────────────────────┤
│  Status: [in_progress ▼]                 │
│  Priority: [P2 ▼]                        │
│  Assignee: [unassigned ▼]                │
├──────────────────────────────────────────┤
│  Description:                            │
│  ┌────────────────────────────────────┐  │
│  │ Implement form validation for the │  │
│  │ issue editor using Zod schemas.   │  │
│  │                                    │  │
│  │ Keeper Decision:                   │  │
│  │ - Use existing validation utils   │  │
│  │   from src/lib/validation.ts      │  │
│  │ - Follow error display pattern    │  │
│  │   from LoginForm component        │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  [Dependencies]  [Comments]  [History]   │
├──────────────────────────────────────────┤
│  Blocked by:                             │
│  • gt-abc: "Define shared Zod schemas"   │
├──────────────────────────────────────────┤
│                           [Save Changes] │
└──────────────────────────────────────────┘
```

### Planning Workflow Summary

```
See epics → Expand epic → Review tasks → Expand task → Review subtasks
                                │                            │
                                ▼                            ▼
                         Check description           Check description
                         (Keepers, scope)            (Keepers, scope)
                                │                            │
                                ▼                            ▼
                         Looks wrong?                Looks wrong?
                                │                            │
                        ┌───────┴───────┐            ┌───────┴───────┐
                        ▼               ▼            ▼               ▼
                   Edit bead      Add comment   Edit bead      Add comment
                   directly       for agent     directly       for agent
```

---

## Journey 2: Monitoring (Secondary)

### Purpose
- See which agents are currently working
- Check what's hooked to each agent
- Detect stuck agents
- Quick overview of in-flight work

### Monitoring View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  townview                                    [Monitoring ▼]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AGENTS                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🟢 witness          idle                               │   │
│  │  🟢 refinery         idle                               │   │
│  │  🟡 crew/jeremy      working    → gt-xyz "Form valid.." │   │
│  │  🟡 polecat-alpha    working    → gt-abc "API endpoint" │   │
│  │  🔴 polecat-beta     stuck (15m) → gt-def "Auth flow"   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IN FLIGHT (3 items)                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ◐ gt-xyz  "Form validation"        crew/jeremy    12m  │   │
│  │  ◐ gt-abc  "API endpoint for..."    polecat-alpha  8m   │   │
│  │  ◐ gt-def  "Auth flow integration"  polecat-beta   15m ⚠│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECENTLY COMPLETED (last 24h)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ gt-ghi  "Slide-out panel"        polecat-gamma  2h ago│   │
│  │  ✓ gt-jkl  "WebSocket reconnect"    crew/jeremy    5h ago│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 idle | Agent has no hooked work |
| 🟡 working | Agent actively processing hooked work |
| 🔴 stuck | Agent has had same work hooked for extended period |
| ⚠ | Warning indicator for items needing attention |

### Monitoring Interactions

| Action | Result |
|--------|--------|
| Click agent row | Expand to show agent details, hooked work |
| Click work item | Open editor panel for that item |
| Click stuck agent | Show options: view work, ping agent, reassign |

---

## Journey 3: Audit (Tertiary)

### Purpose
- Review what was planned vs what was completed
- Understand how work evolved during execution
- Identify patterns in estimation, scope changes, blocks

### Audit View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  townview                                    [Audit ▼]          │
├─────────────────────────────────────────────────────────────────┤
│  Date Range: [Last 7 days ▼]    Convoy: [All ▼]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COMPLETED WORK                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  gt-xyz: "Implement WebSocket reconnection"             │   │
│  │  ├─ Planned: 2 subtasks                                 │   │
│  │  ├─ Actual: 3 subtasks (1 added during work)           │   │
│  │  ├─ Assigned: polecat-alpha → reassigned → crew/jeremy │   │
│  │  ├─ Duration: 4 hours (blocked 2h on gt-abc)           │   │
│  │  └─ [View full history]                                 │   │
│  │                                                         │   │
│  │  gt-abc: "Define shared validation schemas"             │   │
│  │  ├─ Planned: 1 task                                     │   │
│  │  ├─ Actual: 1 task (no changes)                        │   │
│  │  ├─ Assigned: polecat-beta                              │   │
│  │  ├─ Duration: 45 minutes                                │   │
│  │  └─ [View full history]                                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SUMMARY                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Completed: 12 items    Scope changes: 3                │   │
│  │  Blocked time: 4.5h     Reassignments: 2                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Interactions

| Action | Result |
|--------|--------|
| Click "View full history" | Expand to show timeline of changes |
| Click convoy filter | Filter to specific convoy's work |
| Click date range | Adjust time window |

---

## State Indicators (Global)

Used consistently across all views:

| Icon | Status | Meaning |
|------|--------|---------|
| ○ | open | Not started |
| ◐ | in_progress | Currently being worked |
| ● | blocked | Waiting on dependency |
| ◑ | deferred | Postponed |
| ✓ | closed | Completed |

| Color | Priority | Usage |
|-------|----------|-------|
| Red | P0 | Critical |
| Orange | P1 | High |
| Yellow | P2 | Medium |
| Blue | P3 | Low |
| Gray | P4 | Backlog |

---

## Key Principles

### 1. Progressive Disclosure
- Overview first (epic titles, progress)
- Expand for detail (tasks, subtasks)
- Click for full edit (slide-out panel)

### 2. Keepers Visibility
- Description previews surface Keeper decisions
- Pattern guidance visible without deep drilling
- Supports coherence review workflow

### 3. Dependency Awareness
- Blocked status clearly indicated
- Links to blockers are clickable
- Can trace dependency chains

### 4. Minimal Clicks to Edit
- Click any item title → editor opens
- Changes require confirmation (diff shown)
- Comments accessible in same panel

### 5. Context Preservation
- Sidebar stays visible during rig work
- Rig switching preserves view mode
- Editor panel doesn't obscure hierarchy

---

## Open Questions

1. **Keyboard navigation** - Should arrow keys navigate the tree? Vim-style bindings?

2. **Bulk operations** - Select multiple items and change status/priority together?

3. **Search scope** - Search within current rig or across all rigs?

4. **Notification of changes** - When bead changes externally (agent updates), how to notify user viewing that rig?

---

*Spec created: 2025-01-21*
