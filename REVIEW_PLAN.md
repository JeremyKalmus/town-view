# Town View Completion Review Plan

> Executed by: townview/crew/jeremy
> Triggered by: Mayor completion signal for convoy hq-gtdp
> Purpose: Verify implementation against USER_JOURNEY_SPEC.md

## Current Convoy

**Convoy ID:** hq-gtdp
**Convoy Name:** Town View User Journey Implementation
**Epics:** 5 (to-cdih, to-8qpk, to-dqb7, to-f6fn, to-rzsy)
**Tasks:** 29 total

## Status: STANDBY

Waiting for Mayor to signal convoy completion.

---

## User Journey Spec Verification (PRIMARY)

### Journey 1: Planning View (70% of usage)

Per USER_JOURNEY_SPEC.md:

| Requirement | Playwright Check | Pass/Fail |
|-------------|------------------|-----------|
| ViewSwitcher shows Planning \| Monitoring \| Audit | Verify 3 tabs visible | |
| Default view is Planning | On load, Planning tab active | |
| Epic list with progress (e.g., "3/7 tasks") | Verify progress text on epics | |
| Expand epic → shows tasks | Click chevron, verify children | |
| Expand task → shows subtasks | Click chevron, verify children | |
| Expandable description preview | Click preview toggle, verify text | |
| Blocked-by indicator (● blocked by gt-abc) | Find blocked item, verify link | |
| Click blocker link → navigates | Click link, verify navigation | |
| FilterBar at top | Verify Status/Type/Assignee/Priority | |
| Click item → slide-out editor | Click node, verify panel opens | |
| Editor tabs: Edit \| Dependencies \| Comments \| History | Verify 4 tabs | |
| Edit field → Save → ConfirmationModal | Change field, save, verify diff | |

### Journey 2: Monitoring View (20% of usage)

| Requirement | Playwright Check | Pass/Fail |
|-------------|------------------|-----------|
| Agent cards grid | Verify AgentCards render | |
| State badges (🟢 idle, 🟡 working, 🔴 stuck) | Verify badge colors | |
| Hooked bead display on card | Verify bead ID shown | |
| Stuck highlight (>15m same bead) | If exists, verify highlight | |
| In-flight work section | Verify in_progress list | |
| Recently completed section | Verify closed issues list | |
| Click agent → opens hooked bead in editor | Click card, verify panel | |

### Journey 3: Audit View (10% of usage)

| Requirement | Playwright Check | Pass/Fail |
|-------------|------------------|-----------|
| ConvoySelector dropdown | Verify dropdown exists | |
| DateRangePicker | Verify date filter exists | |
| Completed work list | Verify AssignmentComparison items | |
| MetricsDisplay summary | Verify stats at bottom | |
| Convoy filter works | Select convoy, verify filter | |

### Journey 4: Polish

| Requirement | Playwright Check | Pass/Fail |
|-------------|------------------|-----------|
| Arrow keys navigate tree | Press arrows in Planning | |
| Enter opens editor | Navigate to item, press Enter | |
| Escape closes panel | Open editor, press Escape | |
| Loading skeletons | Refresh, observe skeletons | |
| Smooth view transitions | Switch views, observe | |

---

---

## Phase 1: Functional Verification

### 1.1 Backend API Endpoints
Verify all endpoints from CONSTITUTION.md respond correctly:

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/rigs` | GET | Returns all discovered rigs with counts |
| `/api/rigs/:rigId` | GET | Returns rig details + summary stats |
| `/api/rigs/:rigId/issues` | GET | Returns issues with filters working |
| `/api/rigs/:rigId/issues/:issueId` | GET | Returns single issue detail |
| `/api/rigs/:rigId/issues/:issueId` | PATCH | Updates issue (with confirmation) |
| `/api/rigs/:rigId/issues/:issueId/history` | GET | Returns audit trail |
| `/api/rigs/:rigId/agents` | GET | Returns agents for rig |
| `/ws` | WebSocket | Connects, receives live updates |

**Test commands:**
```bash
curl http://localhost:8080/api/rigs
curl http://localhost:8080/api/rigs/hq/issues
curl http://localhost:8080/api/rigs/hq/agents
```

### 1.2 WebSocket Real-time Updates
- [ ] WebSocket connects successfully
- [ ] Issue changes broadcast to connected clients
- [ ] Rig discovery events broadcast
- [ ] Connection status shown in UI

---

## Phase 2: Visual Verification with Playwright

### 2.1 Rig Navigator (Sidebar)
Per CONSTITUTION.md Section "Core Views > 1. Rig Navigator":

**Expected appearance:**
- Auto-discovered list of all rigs in left sidebar
- Each rig shows: name, open issue count, agent count
- Click to select loads rig detail in main area
- "HQ (Town)" appears for town-level beads
- Visual indicator for selected rig

**Playwright checks:**
```javascript
// Verify sidebar exists with rigs
await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
await expect(page.locator('[data-testid="rig-item"]')).toHaveCount.greaterThan(0)
// Verify HQ exists
await expect(page.getByText('HQ (Town)')).toBeVisible()
// Verify counts displayed
await expect(page.locator('.issue-count')).toBeVisible()
```

### 2.2 Rig Dashboard
Per CONSTITUTION.md Section "Core Views > 2. Rig Dashboard":

**Expected appearance:**
- **Agent Cards**: Grid of cards showing each agent type
  - witness, refinery, crew, polecats
  - State indicator: idle (green), working (amber), stuck (red)
  - Hooked bead ID if present
- **Issue Summary**: Stats showing open/in_progress/blocked/closed counts
- **Issue List**: Scrollable list with:
  - Status badges (colored by status)
  - Priority badges (P0 red → P4 gray)
  - Title and ID visible

**Playwright checks:**
```javascript
// Agent cards
await expect(page.locator('[data-testid="agent-card"]')).toHaveCount.greaterThan(0)
// Status badges
await expect(page.locator('.status-badge')).toBeVisible()
// Priority badges
await expect(page.locator('.priority-badge')).toBeVisible()
// Filter controls
await expect(page.locator('[data-testid="status-filter"]')).toBeVisible()
await expect(page.locator('[data-testid="type-filter"]')).toBeVisible()
```

### 2.3 Roadmap View (Epic Hierarchy)
Per CONSTITUTION.md Section "Core Views > 3. Roadmap View":

**Expected appearance:**
- Tree structure: Epic → Issue → Task
- Expand/collapse icons on parent nodes
- Status icons: ○ open, ◐ in_progress, ● blocked, ✓ closed
- Priority colors on nodes
- Filter controls at top

**Playwright checks:**
```javascript
// Tree exists
await expect(page.locator('[data-testid="roadmap-tree"]')).toBeVisible()
// Expandable nodes
await expect(page.locator('[data-testid="tree-node-toggle"]')).toBeVisible()
// Status icons
await expect(page.locator('.status-icon')).toBeVisible()
```

### 2.4 Issue Editor (Slide-out Panel)
Per CONSTITUTION.md Section "Core Views > 5. Issue Editor":

**Expected appearance:**
- Slide-out panel from right side
- Full issue display with all fields
- Editable: status, priority, title, description, labels, assignee
- Read-only: id, created_at, created_by
- Confirmation modal before save
- Tabs: Details, Dependencies, Comments, History

**Playwright checks:**
```javascript
// Click an issue to open editor
await page.locator('[data-testid="issue-row"]').first().click()
// Panel slides out
await expect(page.locator('[data-testid="issue-editor-panel"]')).toBeVisible()
// Editable fields
await expect(page.locator('[data-testid="edit-title"]')).toBeVisible()
await expect(page.locator('[data-testid="edit-status"]')).toBeVisible()
// Tabs
await expect(page.getByRole('tab', { name: 'Dependencies' })).toBeVisible()
await expect(page.getByRole('tab', { name: 'Comments' })).toBeVisible()
```

### 2.5 Audit View
Per CONSTITUTION.md Section "Core Views > 4. Audit View":

**Expected appearance:**
- Convoy selector dropdown
- Date range picker
- Side-by-side comparison (assigned vs completed)
- Agent timeline
- Metrics display

**Playwright checks:**
```javascript
// Navigate to audit view
await page.locator('[data-testid="nav-audit"]').click()
// Convoy selector
await expect(page.locator('[data-testid="convoy-selector"]')).toBeVisible()
// Timeline
await expect(page.locator('[data-testid="agent-timeline"]')).toBeVisible()
```

### 2.6 Design System Compliance
Per DESIGN_SYSTEM.md:

**Color tokens to verify:**
- Background: `bg-primary (#1a1a1a)`, `bg-secondary (#252525)`, `bg-tertiary (#2f2f2f)`
- Text: `text-primary (#e5e5e5)`, `text-secondary (#a3a3a3)`, `text-muted (#666666)`
- Status colors: open (amber), in_progress (blue), blocked (red), closed (green)
- Priority: P0 (red), P1 (orange), P2 (yellow), P3 (blue), P4 (gray)
- Accent: rust (#b45309)

**Playwright visual regression:**
```javascript
// Take screenshots for visual comparison
await page.screenshot({ path: 'dashboard-view.png' })
await page.screenshot({ path: 'roadmap-view.png' })
await page.screenshot({ path: 'issue-editor.png' })
```

---

## Phase 3: Keeper Pattern Verification

### 3.1 Frontend Pattern Check
Run keeper-review against frontend changes to verify:

- [ ] Components follow naming convention (PascalCase)
- [ ] Components in correct directories (features/, ui/, layout/)
- [ ] Hooks follow `use*` pattern
- [ ] State management uses Zustand store pattern
- [ ] Design tokens used (not hardcoded colors)
- [ ] TypeScript types defined for all props

**Verification command:**
```bash
# List all new components
find frontend/src/components -name "*.tsx" -newer .git/refs/heads/main~50

# Check for hardcoded colors (should be none)
grep -r "#[0-9a-fA-F]\{6\}" frontend/src/components --include="*.tsx" | grep -v tailwind
```

### 3.2 Backend Pattern Check
Verify backend follows discovered patterns:

- [ ] API routes follow RESTful conventions
- [ ] Services have clear boundaries
- [ ] Structured logging used throughout
- [ ] Error types consistent

**Verification:**
```bash
# Check all handlers follow pattern
grep -r "func.*Handler" server/internal/handlers/

# Check logging consistency
grep -r "slog\." server/
```

### 3.3 Data Pattern Check
Verify data structures match schema:

- [ ] Issue type matches CONSTITUTION.md data model
- [ ] All status values are valid enum members
- [ ] Priority range is 0-4
- [ ] Timestamps in ISO8601 format

---

## Phase 4: Acceptance Criteria Verification

### Phase 2: Dashboard View (to-l13)
From epic description:
- [ ] Agent cards component renders for each agent type
- [ ] Agent state displayed (idle/working/stuck) with visual indicators
- [ ] Hooked bead shown on each agent card
- [ ] Issue list shows status badges with color coding
- [ ] Issue list shows priority badges (P0 red → P4 gray)
- [ ] Filter controls work for status dropdown
- [ ] Filter controls work for issue_type dropdown
- [ ] Live updates reflected in UI without page refresh
- [ ] Visual feedback when data updates via WebSocket

### Phase 3: Roadmap View (to-b1e)
- [ ] Tree component renders epic → issue → task hierarchy
- [ ] Nodes expand/collapse on click
- [ ] Keyboard navigation works (arrow keys, enter)
- [ ] Status icons displayed: ○ open, ◐ in_progress, ● blocked, ✓ closed
- [ ] Priority color coding applied
- [ ] Filter controls work

### Phase 4: Issue Editor (to-a96)
- [ ] Slide-out panel opens when clicking issue
- [ ] Editable fields: status, priority, title, description, labels, assignee
- [ ] Read-only fields: id, created_at, created_by
- [ ] Confirmation modal shows diff
- [ ] Save executes bd CLI command
- [ ] Dependencies tab works
- [ ] Comments tab works
- [ ] History tab works

### Phase 5: Audit View (to-w2y)
- [ ] Convoy selector lists convoys
- [ ] Date range picker works
- [ ] Assignment vs completion shown
- [ ] Agent timeline displayed
- [ ] Diff view works
- [ ] Metrics displayed

### Phase 6: Polish (to-oaz)
- [ ] Keyboard navigation throughout
- [ ] Dark mode toggle works
- [ ] Performance acceptable (no jank)
- [ ] Error boundaries catch failures
- [ ] Loading states shown
- [ ] Offline resilience

---

## Execution Checklist

When Mayor signals completion:

1. **Start servers**
   ```bash
   make dev
   ```

2. **Run API verification**
   ```bash
   curl http://localhost:8080/api/rigs | jq
   curl http://localhost:8080/api/rigs/hq/issues | jq
   curl http://localhost:8080/api/rigs/hq/agents | jq
   ```

3. **Run Playwright visual verification**
   - Navigate to http://localhost:3000
   - Take snapshots of each view
   - Verify against expected appearance

4. **Run Keeper pattern checks**
   - Frontend patterns
   - Backend patterns
   - Data patterns

5. **Check all acceptance criteria**
   - Walk through each epic's criteria
   - Mark as PASS/FAIL

6. **Generate report**
   - Summary of findings
   - Screenshots of each view
   - List of any discrepancies

---

## Expected Final State

When complete, Town View should provide:

### Visual Summary
```
┌─────────────────────────────────────────────────────────────────┐
│ 🏭 TOWN VIEW                                    [Dark] [?]      │
├───────────┬─────────────────────────────────────────────────────┤
│           │  HEYHEY                                             │
│ HQ (Town) │  ┌──────────┬──────────┬──────────┬──────────┐     │
│   12 open │  │ Witness  │ Refinery │  Crew    │ Polecats │     │
│   3 agents│  │ 🟢 idle  │ 🟡 work  │ 🟢 idle  │ 🔴 stuck │     │
│           │  │ -        │ he-abc   │ -        │ he-xyz   │     │
│ heyhey    │  └──────────┴──────────┴──────────┴──────────┘     │
│   45 open │                                                     │
│   5 agents│  ┌─ Filters ─────────────────────────────────┐     │
│           │  │ Status: [All ▼]  Type: [All ▼]  Search: [    ] │ │
│ keeper    │  └───────────────────────────────────────────────┘  │
│   8 open  │                                                     │
│   2 agents│  ISSUES (45)                                        │
│           │  ┌───────────────────────────────────────────────┐  │
│ townview  │  │ 🟡 P1 │ he-abc │ Fix authentication bug      │──┤
│   23 open │  │ 🔵 P2 │ he-def │ Add user metrics dashboard  │  │
│   4 agents│  │ 🟢 P3 │ he-ghi │ Update documentation        │  │
│           │  │ ● P0  │ he-jkl │ Critical: DB connection     │  │
│           │  └───────────────────────────────────────────────┘  │
└───────────┴─────────────────────────────────────────────────────┘
```

### Key Interactions
1. Click rig in sidebar → loads that rig's dashboard
2. Click issue → slide-out editor panel
3. Edit issue → confirmation modal with diff
4. Real-time updates flash/highlight on change
5. Roadmap view shows tree hierarchy
6. Audit view shows convoy work comparison

---

---

## Issue Reporting (if failures found)

For any failures, create a bug bead and notify Mayor:

```bash
# Create bug bead
bd new --type bug --title "Planning View: [issue description]" --body "
## Expected (from USER_JOURNEY_SPEC.md)
[What the spec says]

## Actual
[What actually happens]

## Steps to Reproduce
1. Navigate to...
2. Click...
3. Observe...

## Spec Reference
USER_JOURNEY_SPEC.md, section: [section]
"

# Notify Mayor
gt mail send mayor/ -s "REVIEW ISSUES: Convoy hq-gtdp" -m "
Found X issues during review. Please assign polecats:
- to-XXXX: [description]
"
```

---

## Post-Review Actions

### If All Pass:
```bash
gt mail send mayor/ -s "REVIEW COMPLETE: Convoy hq-gtdp APPROVED" -m "
All checks passed. Implementation matches USER_JOURNEY_SPEC.md.
Convoy hq-gtdp approved.
"
```

### If Failures:
1. Create bug beads for each failure
2. Mail Mayor with bug list
3. Wait for fixes
4. Re-review

---

*Plan created: 2026-01-20*
*Updated: 2026-01-21 - Added USER_JOURNEY_SPEC.md checks for convoy hq-gtdp*
*Status: STANDBY - Awaiting Mayor completion signal*
