# Town View Design System

> Hybrid aesthetic: Clean dashboard foundation with Mad Max industrial accents

## Design Philosophy

**Functional first, themed second.** The UI must be highly readable and efficient for daily use. The Mad Max theme adds personality without compromising usability. When in doubt, choose clarity over style.

---

## Color Palette

### Core Colors (Semantic)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0D0D0D` | Main background (deep black) |
| `--bg-secondary` | `#1A1A1A` | Cards, panels |
| `--bg-tertiary` | `#262626` | Hover states, elevated surfaces |
| `--border` | `#333333` | Dividers, card borders |
| `--border-accent` | `#4A4A4A` | Active borders |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#F5F5F5` | Primary text |
| `--text-secondary` | `#A3A3A3` | Secondary text, labels |
| `--text-muted` | `#666666` | Disabled, hints |

### Status Colors (Mad Max Inspired)

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `--status-open` | `#71717A` | Zinc | Open/available issues |
| `--status-in-progress` | `#F59E0B` | Chrome Amber | Active work |
| `--status-blocked` | `#B91C1C` | Blood Rust | Blocked/critical |
| `--status-closed` | `#22C55E` | Witness Green | Completed |
| `--status-deferred` | `#3B82F6` | Ice Blue | Deferred/scheduled |

### Priority Colors

| Token | Hex | Priority | Usage |
|-------|-----|----------|-------|
| `--priority-p0` | `#DC2626` | P0 Critical | Emergencies |
| `--priority-p1` | `#F97316` | P1 High | Important |
| `--priority-p2` | `#EAB308` | P2 Medium | Normal |
| `--priority-p3` | `#3B82F6` | P3 Low | Backlog |
| `--priority-p4` | `#6B7280` | P4 Minimal | Nice-to-have |

### Accent Colors (Mad Max Theme)

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `--accent-rust` | `#B7410E` | Rust Orange | Headers, highlights |
| `--accent-chrome` | `#C0C0C0` | Chrome Silver | Interactive elements |
| `--accent-oil` | `#1C1C1C` | Oil Black | Deep backgrounds |
| `--accent-sand` | `#C2B280` | Wasteland Sand | Subtle accents |
| `--accent-warning` | `#FACC15` | Warning Yellow | Alerts, cautions |

---

## Typography

### Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-display: 'Oswald', 'Bebas Neue', sans-serif; /* Headers with attitude */
```

### Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-xs` | 11px | 400 | Timestamps, metadata |
| `--text-sm` | 13px | 400 | Secondary text, labels |
| `--text-base` | 14px | 400 | Body text |
| `--text-lg` | 16px | 500 | Emphasized text |
| `--text-xl` | 18px | 600 | Section headers |
| `--text-2xl` | 24px | 700 | Page titles |
| `--text-display` | 32px | 700 | Display headers (Oswald) |

### Usage Guidelines

- **Body text**: Inter, 14px, regular weight
- **Code/IDs**: JetBrains Mono, 13px (e.g., `gt-abc123`)
- **Headers**: Oswald for major section headers (RIGS, AGENTS)
- **Numbers/Stats**: JetBrains Mono for alignment

---

## Spacing

Based on 4px grid:

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small elements |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 12px | Modals, large containers |

---

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
--shadow-glow-rust: 0 0 20px rgba(183, 65, 14, 0.3); /* Accent glow */
--shadow-glow-chrome: 0 0 20px rgba(192, 192, 192, 0.2);
```

---

## Components

### 1. Card

Base container for content groups.

```
┌─────────────────────────────────────┐
│ [bg-secondary, border, radius-lg]   │
│                                     │
│  Content here                       │
│                                     │
└─────────────────────────────────────┘
```

**Variants:**
- `card-default`: Standard card
- `card-elevated`: With shadow-md
- `card-accent`: Rust left border (4px solid accent-rust)

### 2. Status Badge

Inline status indicator.

```
┌──────────────┐
│ ○ Open       │  ← status-open color, rounded-full icon
└──────────────┘

┌──────────────┐
│ ◐ Working    │  ← status-in-progress, amber
└──────────────┘
```

**States:**
- `open`: Hollow circle (○), zinc
- `in_progress`: Half-filled (◐), amber
- `blocked`: Filled circle (●), rust red
- `closed`: Checkmark (✓), green
- `deferred`: Snowflake (❄), blue

### 3. Priority Indicator

Small colored dot or badge.

```
● P0  ← Red dot, bold label
● P1  ← Orange
● P2  ← Yellow
● P3  ← Blue
● P4  ← Gray
```

### 4. Issue Row

List item for issue display.

```
┌─────────────────────────────────────────────────────────────────┐
│ ● P1  ◐  gt-abc123  Fix authentication timeout        2h ago   │
│        │     │              │                           │       │
│     status  id (mono)    title                     timestamp    │
└─────────────────────────────────────────────────────────────────┘
```

**Hover**: bg-tertiary
**Selected**: border-accent left border

### 5. Agent Card

Display for worker agents.

```
┌─────────────────────────────────────┐
│ ⚙ WITNESS                      ◐   │  ← Header with status
│ ═══════════════════════════════════ │  ← Rust-colored divider
│ Hooked: gt-abc123                   │
│ "Monitoring polecat health..."      │  ← Truncated description
│                                     │
│ [View Work]  [Terminal]             │  ← Action buttons
└─────────────────────────────────────┘
```

**Agent types** get distinct icons:
- Witness: Eye (👁)
- Refinery: Factory (🏭)
- Crew: Wrench (🔧)
- Polecat: Running figure (🏃)
- Deacon: Scroll (📜)

### 6. Button

```
┌─────────────────┐
│  Action Text    │  ← Primary: bg-accent-rust, white text
└─────────────────┘

┌─────────────────┐
│  Action Text    │  ← Secondary: bg-tertiary, border
└─────────────────┘

┌─────────────────┐
│  Action Text    │  ← Ghost: transparent, text only
└─────────────────┘
```

**Sizes:** sm (28px), md (36px), lg (44px)

### 7. Sidebar Navigation

```
┌──────────────────────────┐
│  ⛽ TOWN VIEW            │  ← Logo area with gradient
├──────────────────────────┤
│                          │
│  RIGS                    │  ← Section header (Oswald)
│  ┌────────────────────┐  │
│  │ ⚙ gastown    12 ○  │  │  ← Rig item
│  │ ⚙ townview    7 ○  │  │
│  │ ⚙ heyhey     23 ○  │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│  HQ (Town)         89 ○  │  ← Special item
└──────────────────────────┘
```

**Selected state**: bg-tertiary, left border accent-rust

### 8. Tree Node (Roadmap)

```
▼ Epic: User Authentication          ● P1  ◐
  ├─ Task: Implement login flow       ● P2  ✓
  ├─ Task: Add OAuth providers        ● P2  ○
  │   ├─ Subtask: Google OAuth        ● P3  ○
  │   └─ Subtask: GitHub OAuth        ● P3  ○
  └─ Task: Session management         ● P2  ○
```

**Expand/collapse**: ▶ / ▼ icons
**Indentation**: 20px per level
**Connection lines**: border-left dotted

### 9. Confirmation Modal

```
┌─────────────────────────────────────────────────┐
│  ⚠ Confirm Changes                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  You are about to update gt-abc123:             │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ - status: open → in_progress             │  │
│  │ - priority: P2 → P1                      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│              [Cancel]  [Confirm Update]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Diff display**: Red for removed, green for added

### 10. Toast Notification

```
┌─────────────────────────────────────────┐
│ ✓ Issue gt-abc123 updated successfully  │  ← Success: green left border
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✗ Failed to update issue: timeout       │  ← Error: red left border
└─────────────────────────────────────────┘
```

---

## Iconography

### System Icons (Lucide React)
- Navigation: `ChevronRight`, `ChevronDown`, `Menu`
- Actions: `Edit`, `Trash`, `Plus`, `RefreshCw`
- Status: `Circle`, `CircleHalf`, `CircleDot`, `Check`, `Snowflake`
- Types: `Bug`, `Sparkles` (feature), `ListTodo` (task), `Target` (epic)

### Custom / Themed Icons
- Rig: Gear (⚙) or custom war rig silhouette
- Fuel gauge: For progress indicators
- War boy: Polecat avatar

---

## Animations

Keep animations subtle and functional:

```css
--transition-fast: 100ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

**Usage:**
- Hover states: transition-fast
- Panel open/close: transition-normal
- Page transitions: transition-slow

**No decorative animations.** Every animation should provide feedback or improve perceived performance.

---

## Responsive Behavior

**Desktop-first** (minimum 1280px assumed)

| Breakpoint | Layout |
|------------|--------|
| < 1024px | Sidebar collapses to icons |
| < 768px | Not officially supported |

---

## Accessibility

- **Contrast**: All text meets WCAG AA (4.5:1 for body, 3:1 for large)
- **Focus states**: Visible focus rings (2px solid accent-chrome)
- **Keyboard nav**: Full keyboard support for all interactions
- **Screen readers**: Proper ARIA labels, semantic HTML

---

## Component Checklist

Core components to build:

- [ ] `Card` - Base container
- [ ] `Button` - Primary, secondary, ghost variants
- [ ] `Badge` - Status and priority badges
- [ ] `IssueRow` - List item for issues
- [ ] `AgentCard` - Worker status display
- [ ] `TreeNode` - Expandable tree item
- [ ] `Sidebar` - Navigation sidebar
- [ ] `Modal` - Confirmation dialogs
- [ ] `Toast` - Notifications
- [ ] `Input` - Form inputs
- [ ] `Select` - Dropdowns
- [ ] `Tabs` - View switching

---

## File Structure

```
src/
├── components/
│   ├── ui/           # Base components (Button, Card, etc.)
│   ├── features/     # Feature components (AgentCard, IssueRow)
│   └── layout/       # Layout components (Sidebar, Header)
├── styles/
│   ├── tokens.css    # CSS custom properties
│   ├── base.css      # Reset, typography, globals
│   └── utilities.css # Utility classes
└── stories/          # Storybook stories
```

---

*Design System v0.1 - 2026-01-20*
