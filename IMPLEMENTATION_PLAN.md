# Town View - Implementation Plan

> Mapping User Journey Spec to existing components

---

## Component Inventory

### What We Have (Reusable)

| Component | Purpose | Status |
|-----------|---------|--------|
| `Sidebar.tsx` | Rig tabs navigation | Working |
| `SlideOutPanel.tsx` | Generic slide-out container | Working |
| `TreeNode.tsx` | Expandable tree hierarchy | Working (needs enhancement) |
| `FilterBar.tsx` | Status/type/assignee/priority filters | Working |
| `IssueEditorForm.tsx` | Full issue edit form | Working |
| `DependenciesTab.tsx` | View/add/remove blockers | Working |
| `CommentsTab.tsx` | View/add comments | Working |
| `HistoryTab.tsx` | Audit trail display | Working |
| `ConfirmationModal.tsx` | Diff preview before save | Working |
| `AgentCard.tsx` | Agent status display | Working |
| `AssignmentComparison.tsx` | Original vs final diff | Working |
| `ConvoySelector.tsx` | Convoy picker dropdown | Working |
| `DateRangePicker.tsx` | Date range selection | Working |
| `MetricsDisplay.tsx` | Stats/metrics display | Working |
| `VirtualList.tsx` | Virtualized scrolling | Working |
| `IssueRow.tsx` | Flat issue row | Working |

### What Needs Enhancement

| Component | Enhancement Needed |
|-----------|-------------------|
| `TreeNode.tsx` | Add: expandable description preview, blocked-by indicator with link, progress summary for epics |
| `RigDashboard.tsx` | Refactor: extract monitoring view, integrate with view switcher |

### What Needs To Be Created

| Component | Purpose |
|-----------|---------|
| `ViewSwitcher.tsx` | Toggle between Planning/Monitoring/Audit views |
| `PlanningView.tsx` | Tree-based epic/task/subtask view with filters |
| `MonitoringView.tsx` | Agent cards + in-flight work (extract from RigDashboard) |
| `AuditView.tsx` | Convoy selector + assignment comparison + metrics |
| `IssueEditorPanel.tsx` | SlideOutPanel wrapper with tabs (Edit/Dependencies/Comments/History) |

---

## Implementation Tasks

### Phase 1: View Infrastructure

**Task 1.1: Create ViewSwitcher component**
- Simple tab bar: Planning | Monitoring | Audit
- Store active view in state (default: Planning)
- Location: `components/layout/ViewSwitcher.tsx`

**Task 1.2: Refactor App.tsx**
- Add view mode state
- Render appropriate view based on mode
- Keep Sidebar unchanged

**Task 1.3: Create view container components**
- `PlanningView.tsx` - placeholder initially
- `MonitoringView.tsx` - extract from RigDashboard
- `AuditView.tsx` - placeholder initially

---

### Phase 2: Planning View (Primary)

**Task 2.1: Enhance TreeNode.tsx**
- Add expandable description preview (click to toggle)
- Add blocked-by indicator: `● blocked by gt-abc` (clickable link)
- Add progress indicator for parent nodes: "3/7 tasks"
- Preserve existing expand/collapse behavior

**Task 2.2: Create PlanningView.tsx**
- Fetch issues with hierarchy (epics → tasks → subtasks)
- Build tree structure from flat issue list using `parent_id`
- Integrate FilterBar at top
- Render TreeView with enhanced TreeNodes
- Handle node click → open IssueEditorPanel

**Task 2.3: Create IssueEditorPanel.tsx**
- Wrap SlideOutPanel
- Tabs: Edit | Dependencies | Comments | History
- Edit tab: IssueEditorForm + Save button
- Save flow: validate → show ConfirmationModal → API call → close
- Dependencies tab: DependenciesTab component
- Comments tab: CommentsTab component
- History tab: HistoryTab component

**Task 2.4: Wire up issue editing API**
- Use existing `/api/rigs/:rigId/issues/:issueId` PATCH endpoint
- Integrate ConfirmationModal for diff preview
- Handle success/error with Toast notifications

---

### Phase 3: Monitoring View (Secondary)

**Task 3.1: Create MonitoringView.tsx**
- Extract agent cards grid from RigDashboard
- Extract "in-flight" work list
- Add stuck detection highlighting (agent working >15m on same item)
- Add "recently completed" section

**Task 3.2: Enhance AgentCard**
- Already has hooked bead display
- Consider: click agent → view hooked issue in editor panel

---

### Phase 4: Audit View (Tertiary)

**Task 4.1: Create AuditView.tsx**
- ConvoySelector at top
- DateRangePicker for filtering
- List of completed work with AssignmentComparison
- MetricsDisplay summary at bottom

**Task 4.2: Fetch audit data**
- Need API endpoint for completed work by convoy/date range
- May need to add convoy filtering to backend

---

### Phase 5: Polish & Integration

**Task 5.1: Keyboard navigation**
- Arrow keys navigate tree
- Enter opens editor
- Escape closes panels

**Task 5.2: Real-time updates**
- WebSocket already connected in App.tsx
- Ensure tree view updates when beads change

**Task 5.3: Loading states**
- Use existing Skeleton components
- Ensure smooth transitions between views

---

## File Structure (After Implementation)

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           (existing)
│   │   ├── SlideOutPanel.tsx     (existing)
│   │   ├── ViewSwitcher.tsx      (NEW)
│   │   └── OfflineBanner.tsx     (existing)
│   │
│   ├── features/
│   │   ├── PlanningView.tsx      (NEW)
│   │   ├── MonitoringView.tsx    (NEW)
│   │   ├── AuditView.tsx         (NEW)
│   │   ├── IssueEditorPanel.tsx  (NEW)
│   │   ├── TreeNode.tsx          (ENHANCE)
│   │   ├── AgentCard.tsx         (existing)
│   │   ├── FilterBar.tsx         (existing)
│   │   ├── DependenciesTab.tsx   (existing)
│   │   ├── CommentsTab.tsx       (existing)
│   │   ├── HistoryTab.tsx        (existing)
│   │   ├── AssignmentComparison.tsx (existing)
│   │   ├── ConvoySelector.tsx    (existing)
│   │   └── issue-editor/         (existing)
│   │
│   └── ui/
│       ├── ConfirmationModal.tsx (existing)
│       ├── VirtualList.tsx       (existing)
│       └── ...                   (existing)
│
└── App.tsx                       (MODIFY - add view routing)
```

---

## Task Summary for Mayor

### Epic: Town View User Journey Implementation

**Phase 1: View Infrastructure** (Foundation)
1. Create ViewSwitcher component
2. Refactor App.tsx for view routing
3. Create view container placeholders

**Phase 2: Planning View** (Primary - ~70% of work)
1. Enhance TreeNode with preview + blocked indicator + progress
2. Create PlanningView with hierarchical tree
3. Create IssueEditorPanel with tabs
4. Wire up issue editing API

**Phase 3: Monitoring View** (Secondary)
1. Extract MonitoringView from RigDashboard
2. Enhance with stuck detection

**Phase 4: Audit View** (Tertiary)
1. Create AuditView combining existing components
2. Add convoy/date filtering

**Phase 5: Polish**
1. Keyboard navigation
2. Real-time update handling
3. Loading state improvements

---

## Dependencies Between Tasks

```
Phase 1 (View Infrastructure)
    │
    ├──→ Phase 2 (Planning View) ─┐
    │                             │
    ├──→ Phase 3 (Monitoring)  ───┼──→ Phase 5 (Polish)
    │                             │
    └──→ Phase 4 (Audit) ─────────┘
```

Phases 2, 3, 4 can proceed in parallel after Phase 1 is complete.

---

## Questions for Overseer

1. **Backend support**: Does the API currently return `parent_id` for issues to build the hierarchy? Or do we need to infer from `issue_type`?

2. **Convoy data**: Is there an API endpoint for fetching completed work by convoy? Or do we filter client-side?

3. **Priority**: Should we do all of Phase 2 (Planning) before starting Monitoring/Audit? Or interleave?

4. **Scope**: Should the initial MVP skip the Audit view entirely and focus on Planning + Monitoring?

---

*Plan created: 2025-01-21*
