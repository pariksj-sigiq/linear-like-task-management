# Linear Clone → shadcn/ui Blocks Rebuild Plan

**Goal**: Rebuild Linear clone using shadcn/ui blocks from https://ui.shadcn.com/blocks while maintaining 100% visual fidelity to Linear reference at https://linear.app/eltsuh/team/ELT/active.

**Status**: Current implementation uses custom components. This plan maps them to shadcn blocks.

---

## 1. Current Architecture Analysis

### Current Component Structure (38 components)

**Layout Components:**
- `AppRoot.tsx` - Main shell with sidebar provider
- `app-sidebar.tsx` - Left navigation sidebar (244px wide)
- `site-header.tsx` - Top navigation bar (88px tall)
- `LinearShell.tsx` - Wrapper alias for AppRoot

**Feature Components:**
- `IssueExplorer.tsx` - Issue list/board views with filters
- `QuickCreateModal.tsx` - Issue creation modal (⌘K, C key)
- `CommandPalette.tsx` - Global command search (⌘K)
- Navigation: `nav-main.tsx`, `nav-documents.tsx`, `nav-secondary.tsx`, `nav-user.tsx`
- Charts: `chart-area-interactive.tsx`, `section-cards.tsx`
- Table: `data-table.tsx`

**UI Primitives (24 shadcn components):**
Already using: avatar, badge, breadcrumb, button, card, chart, checkbox, dialog, drawer, dropdown-menu, input, label, select, separator, sheet, sidebar, skeleton, tabs

**Pages (WorkspacePages.tsx):**
- HomePage, MyIssuesPage, TeamIssuesPage
- InboxPage (split-pane design)
- ProjectsPage, ProjectDetailPage
- ViewsPage, CyclesPage
- ArchivePage, GlobalSearchPage
- TierTwoPage (initiatives, roadmap, settings)

### Current Design System

**Color Palette (from design-tokens.css):**
```
Primary: #5e6ad2 (Linear purple)
Hover: #4e5bc8
Backgrounds: #ffffff (light) / #161616 (dark)
Borders: #e6e6e6 (light) / #2d2d2d (dark)
Muted: #f4f4f3 (light) / #222222 (dark)
```

**Spacing:**
```
Sidebar: 244px width
Topbar: 88px height
Row height: 32px
Border radius: 4px (sm), 6px (md), 8px (lg)
```

**Typography:**
```
Font: "Inter Variable", "SF Pro Display", system-ui
Sizes: 11px (xs), 12px (sm), 13px (base), 14px (lg), 16px (xl), 20px (2xl)
Line height: 1.5 (base), 1.2 (tight)
```

---

## 2. shadcn/ui Blocks Mapping

### Available shadcn Blocks Categories

**From https://ui.shadcn.com/blocks:**

1. **Sidebar Blocks** (`sidebar-01` through `sidebar-15`)
   - sidebar-01: Basic collapsible sidebar
   - sidebar-02: With workspace selector
   - sidebar-03: With user menu footer
   - sidebar-04: With icons navigation
   - sidebar-05: Grouped navigation sections
   - sidebar-06: With badges
   - sidebar-07: With search
   - sidebar-08: With collapsible groups
   - sidebar-09: Multi-level navigation
   - sidebar-10: Minimal design
   - sidebar-11-15: Various layouts

2. **Dashboard Blocks** (`dashboard-01` through `dashboard-07`)
   - dashboard-01: Stats cards + charts
   - dashboard-02: Table view
   - dashboard-03: Kanban board
   - dashboard-04: Calendar view
   - dashboard-05: Activity feed
   - dashboard-06: Split pane
   - dashboard-07: Metrics overview

3. **Authentication Blocks** (`authentication-01` through `authentication-04`)

4. **Charts Blocks** (`chart-*`)
   - Already using recharts (compatible)

5. **Form Blocks** (`form-*`)
   - Form layouts with validation

6. **Table Blocks** (`table-*`)
   - Data tables with sorting/filtering

### Component → Block Mapping

| Current Component | shadcn Block | Notes |
|------------------|--------------|-------|
| `app-sidebar.tsx` | `sidebar-07` + `sidebar-08` | Use sidebar with search + collapsible groups |
| `site-header.tsx` | Custom breadcrumb + actions | Keep custom, add dashboard header pattern |
| `IssueExplorer` (list) | `table-02` or `table-03` | Data table with grouping |
| `IssueExplorer` (board) | `dashboard-03` | Kanban board layout |
| `InboxPage` split-pane | `dashboard-06` | Split pane with detail view |
| `ProjectsPage` board | `dashboard-03` | Kanban for project columns |
| `section-cards.tsx` | `dashboard-01` | Stats cards pattern |
| `QuickCreateModal` | `form-01` + `dialog` | Modal form layout |
| `CommandPalette` | `command-*` | Command menu pattern |
| `nav-*` components | Built into `sidebar-*` | Migrate to block patterns |

---

## 3. Implementation Plan

### Phase 1: Setup & Infrastructure (2 hours)

**1.1 Install Additional shadcn Components**
```bash
# If not already installed
npx shadcn@latest add command
npx shadcn@latest add table
npx shadcn@latest add popover
npx shadcn@latest add tooltip
npx shadcn@latest add collapsible
npx shadcn@latest add resizable
```

**1.2 Download shadcn Block Templates**
- Visit https://ui.shadcn.com/blocks
- Copy source for: sidebar-07, sidebar-08, dashboard-03, dashboard-06, table-02
- Save as reference in `src/components/blocks/` directory

**1.3 Create Block Adapter Directory**
```
src/
  components/
    blocks/          # New: shadcn block adaptations
      sidebar/       # Sidebar variants
      dashboard/     # Dashboard layouts
      tables/        # Table views
    legacy/          # Move old components here temporarily
```

---

### Phase 2: Rebuild Sidebar (4 hours)

**Current:** `app-sidebar.tsx` (175 lines, custom nav components)

**Target:** shadcn `sidebar-07` (with search) + `sidebar-08` (collapsible groups)

**Changes:**
1. Replace custom NavMain/NavDocuments/NavSecondary with block patterns
2. Use shadcn's SidebarGroup, SidebarGroupLabel, SidebarGroupContent
3. Add SidebarTrigger for collapse behavior
4. Integrate search at top (already has SearchIcon button)

**Files to Create/Modify:**
- `src/components/blocks/sidebar/linear-sidebar.tsx` - New block-based sidebar
- `src/components/AppRoot.tsx` - Update to use new sidebar
- Keep existing SidebarProvider, SidebarInset from shadcn

**Visual Fidelity Checklist:**
- [ ] Width: exactly 244px
- [ ] Background: #fafafa (light) / #111111 (dark)
- [ ] Hover states: #f4f4f3 (light) / #1a1a1a (dark)
- [ ] Active item: #f4f4f3 with bold text
- [ ] Inbox badge: "99+" in muted style
- [ ] Workspace header with Σ icon
- [ ] Search + Create buttons at top
- [ ] User menu footer at bottom
- [ ] Collapsible "Teams" section with chevron
- [ ] Icons: exact size (15-16px)
- [ ] Padding: 6px vertical, 12px horizontal

**Example Override Pattern:**
```tsx
// Block base from shadcn
import { Sidebar, SidebarContent, SidebarGroup } from "@/components/ui/sidebar"

// Override with Linear design tokens
export function LinearSidebar() {
  return (
    <Sidebar className="w-[244px] bg-sidebar-rgb">
      <SidebarContent>
        <SidebarGroup>
          {/* Use shadcn structure, Linear styles */}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

---

### Phase 3: Rebuild Header (2 hours)

**Current:** `site-header.tsx` - Custom breadcrumb + actions

**Target:** Dashboard header pattern from shadcn blocks

**Changes:**
1. Use shadcn Breadcrumb component (already installed)
2. Add SidebarTrigger for mobile hamburger
3. Keep search button (⌘K trigger)
4. Keep "New issue" primary button
5. Maintain 88px height with border-bottom

**Files to Create/Modify:**
- `src/components/blocks/dashboard/linear-header.tsx`
- `src/components/site-header.tsx` - Refactor to use block

**Visual Fidelity Checklist:**
- [ ] Height: exactly 88px (var(--topbar-height))
- [ ] Background: #ffffff (light) / #171717 (dark)
- [ ] Border-bottom: #e6e6e6 / #2a2a2a
- [ ] Breadcrumb text: 13px, muted-foreground
- [ ] Search icon button: ghost variant
- [ ] Primary button: #5e6ad2 with hover #4e5bc8
- [ ] Mobile: show hamburger trigger
- [ ] Sticky positioning at top

---

### Phase 4: Rebuild Issue List (5 hours)

**Current:** `IssueExplorer.tsx` list mode - Custom grouped list

**Target:** shadcn `table-02` or `table-03` with grouping

**Changes:**
1. Use shadcn Table with @tanstack/react-table (already installed)
2. Implement grouped rows (by status)
3. Add collapsible group headers
4. Checkbox selection column
5. Custom cells for status icons, priority, assignee

**Files to Create/Modify:**
- `src/components/blocks/tables/issue-list-table.tsx` - Table block adaptation
- `src/components/IssueExplorer.tsx` - Update list mode to use new table
- Keep existing IssueFilters state management

**Visual Fidelity Checklist:**
- [ ] Group headers: 36px tall, #f4f4f3 background
- [ ] Row height: 32px (var(--row-height))
- [ ] Hover: #f4f4f3 / rgba(255,255,255,0.025)
- [ ] Checkbox: 16px, rounded-sm
- [ ] Issue key: 11px, tabular-nums, muted
- [ ] Priority icon: 14px, colored by priority
- [ ] Status icon: 12-14px, colored by state
- [ ] Title: 13px, truncate with ellipsis
- [ ] Assignee avatar: 20px circle
- [ ] Date: 12px, muted
- [ ] Borders: #e6e6e6 / #2d2d2d
- [ ] Collapsible chevron: rotate-0 open, rotate-90 closed

**Example Column Definition:**
```tsx
const columns: ColumnDef<Issue>[] = [
  {
    id: "select",
    header: ({ table }) => <Checkbox />,
    cell: ({ row }) => <Checkbox />,
  },
  {
    accessorKey: "key",
    header: "ID",
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {issueKey(row.original)}
      </span>
    ),
  },
  // ... more columns
]
```

---

### Phase 5: Rebuild Issue Board (4 hours)

**Current:** `IssueExplorer.tsx` board mode - Custom kanban

**Target:** shadcn `dashboard-03` kanban board

**Changes:**
1. Use shadcn Card for columns
2. Use @dnd-kit for drag-drop (already installed)
3. Custom IssueCard component inside blocks
4. Maintain column order: Backlog → Todo → In Progress → Done

**Files to Create/Modify:**
- `src/components/blocks/dashboard/issue-board.tsx` - Kanban block
- `src/components/blocks/dashboard/issue-card.tsx` - Card component
- `src/components/IssueExplorer.tsx` - Update board mode

**Visual Fidelity Checklist:**
- [ ] Board: grid, 4 columns, gap-3, overflow-x-auto
- [ ] Column: min-width 256px, rounded border
- [ ] Column header: 40px tall, border-bottom
- [ ] Column title: StatusIcon + text + badge
- [ ] Badge: count, 20px tall, 11px text
- [ ] Plus button: ghost, 13px icon
- [ ] Card: rounded, border, padding 12px
- [ ] Card hover: bg-muted/40
- [ ] Card key: 11px, tabular-nums, muted
- [ ] Card title: 13px, font-medium
- [ ] Card badges: estimate, project (truncate)
- [ ] Avatar: 20px circle, top-right
- [ ] Empty column: "Add new issue" ghost button

---

### Phase 6: Rebuild Inbox Split-Pane (3 hours)

**Current:** `InboxPage` - Custom split layout

**Target:** shadcn `dashboard-06` split pane with resizable

**Changes:**
1. Use shadcn ResizablePanelGroup (add if needed)
2. Left panel: notification list (352px default)
3. Right panel: issue detail view
4. Maintain selected state highlight

**Files to Create/Modify:**
- `src/components/blocks/dashboard/inbox-split.tsx`
- `src/pages/WorkspacePages.tsx` - Update InboxPage

**Visual Fidelity Checklist:**
- [ ] Left panel: min 280px, default 352px (22rem)
- [ ] Right panel: flex-1, min 400px
- [ ] Divider: 1px, #e6e6e6 / #2d2d2d, resizable
- [ ] List header: 48px, border-bottom
- [ ] List item: padding 10px 12px
- [ ] Unread: bg-muted/30
- [ ] Selected: bg-accent
- [ ] Avatar: 24px circle
- [ ] Time: small, muted
- [ ] Status glyph: 14px circle with checkmark
- [ ] Detail view: padding 16px, scrollable

---

### Phase 7: Rebuild Stats Cards (2 hours)

**Current:** `section-cards.tsx` - Custom card grid

**Target:** shadcn `dashboard-01` stats cards

**Changes:**
1. Use shadcn Card components
2. Add trend indicators (up/down/neutral)
3. Keep responsive grid layout

**Files to Create/Modify:**
- `src/components/blocks/dashboard/stats-cards.tsx`
- `src/components/section-cards.tsx` - Refactor to use block

**Visual Fidelity Checklist:**
- [ ] Grid: 4 columns, gap-3, responsive
- [ ] Card: rounded, border, padding 16px
- [ ] Label: 12px, muted
- [ ] Value: 24px, font-semibold
- [ ] Description: 11px, muted
- [ ] Badge: 11px, outline variant
- [ ] Trend icon: 12px, colored

---

### Phase 8: Rebuild Modals (3 hours)

**Current:** `QuickCreateModal.tsx`, `CommandPalette.tsx`

**Target:** shadcn `form-01` + Dialog, Command blocks

**Changes:**
1. QuickCreate: Use Dialog + Form blocks
2. CommandPalette: Use Command component (already using)
3. Maintain keyboard shortcuts (C, ⌘K)

**Files to Create/Modify:**
- `src/components/blocks/forms/quick-create-form.tsx`
- `src/components/QuickCreateModal.tsx` - Simplify

**Visual Fidelity Checklist:**
- [ ] Modal: centered, max-width 600px
- [ ] Overlay: rgba(10,10,10,0.32) / rgba(0,0,0,0.55)
- [ ] Shadow: soft, 24px blur
- [ ] Form fields: stacked, gap-3
- [ ] Labels: 12px, semibold
- [ ] Inputs: 36px tall, rounded-md
- [ ] Submit button: primary, full-width
- [ ] Cancel: Esc key

---

### Phase 9: Projects Board (3 hours)

**Current:** `ProjectsPage` - Custom kanban for projects

**Target:** Reuse `dashboard-03` from Phase 5

**Changes:**
1. Adapt issue board to project cards
2. Use same column structure (Backlog → Completed)
3. Custom ProjectCard component

**Files to Create/Modify:**
- `src/components/blocks/dashboard/project-board.tsx`
- `src/components/blocks/dashboard/project-card.tsx`
- `src/pages/WorkspacePages.tsx` - Update ProjectsPage

**Visual Fidelity Checklist:**
- [ ] Same as issue board
- [ ] Project icon: FolderKanban
- [ ] Description: 2-line clamp
- [ ] Status pill at bottom
- [ ] Updated date: muted

---

### Phase 10: Polish & Override Styles (4 hours)

**10.1 Create Linear Design System Override**

File: `src/components/blocks/linear-overrides.css`

```css
/* Override shadcn blocks with Linear tokens */
[data-sidebar] {
  --sidebar-width: 244px;
  --sidebar-background: var(--sidebar-bg);
}

[data-table] {
  --table-row-height: var(--row-height);
}

.linear-board-column {
  min-width: 256px;
}

/* Exact spacing matches */
.linear-row-padding {
  padding: var(--row-padding);
}
```

**10.2 Font Loading**

Currently using Inter Variable (already in package). Ensure proper loading:

```tsx
// src/main.tsx or App.tsx
import '@fontsource-variable/inter'
```

**10.3 Icon Sizing**

All lucide-react icons must use exact sizes:
- Nav icons: 16px
- Action buttons: 15px
- Status icons: 12-14px
- Large icons: 20-24px

**10.4 Hover States**

Ensure all interactive elements have Linear hover:
```css
.linear-hover {
  @apply hover:bg-muted/60 transition-colors;
}
```

---

## 4. Migration Checklist

### Before Starting
- [ ] Create git branch: `feature/shadcn-blocks-rebuild`
- [ ] Backup current components to `src/components/legacy/`
- [ ] Document all current features (list in spreadsheet)
- [ ] Take screenshots of all pages (before)

### During Migration
- [ ] Test each component in isolation (Storybook optional)
- [ ] Verify keyboard shortcuts still work
- [ ] Check dark mode rendering
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Validate accessibility (ARIA labels, focus states)
- [ ] Performance: no regressions (React DevTools Profiler)

### After Migration
- [ ] Side-by-side comparison with Linear.app
- [ ] Pixel-perfect verification (overlay screenshots)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Screenshot all pages (after) - compare with before
- [ ] User testing: verify all interactions work
- [ ] Document new component structure
- [ ] Update README with new architecture

---

## 5. Visual Fidelity Validation

### Measurement Tools

**Browser DevTools:**
```javascript
// Measure exact dimensions
document.querySelector('[data-sidebar]').offsetWidth  // Should be 244
document.querySelector('[data-topbar]').offsetHeight   // Should be 88
```

**Pixel-Perfect Overlay:**
1. Screenshot Linear.app at same viewport size
2. Screenshot our clone at same viewport size
3. Use image diff tool (e.g., pixelmatch, looks-same)
4. Overlay in Figma/Photoshop at 50% opacity
5. Identify any misalignments

### Critical Measurements

| Element | Dimension | Light Color | Dark Color |
|---------|-----------|-------------|------------|
| Sidebar | 244px W | #fafafa | #111111 |
| Topbar | 88px H | #ffffff | #171717 |
| Row | 32px H | - | - |
| Border | 1px | #e6e6e6 | #2d2d2d |
| Border radius | 4-8px | - | - |
| Primary button | - | #5e6ad2 | #5e6ad2 |
| Hover | - | #f4f4f3 | #1a1a1a |

---

## 6. Code Examples

### Example 1: Sidebar Block Override

```tsx
// src/components/blocks/sidebar/linear-sidebar.tsx
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { InboxIcon, UserRoundCheckIcon } from "lucide-react"

export function LinearSidebar() {
  return (
    <Sidebar className="w-[244px]">
      <SidebarContent>
        {/* Primary nav */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/inbox">
                  <InboxIcon className="size-4" />
                  <span>Inbox</span>
                  <span className="ml-auto text-xs">99+</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {/* ... items */}
          </SidebarMenu>
        </SidebarGroup>

        {/* Teams - Collapsible */}
        <SidebarGroup>
          <Collapsible defaultOpen>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Teams
                <ChevronRight className="ml-auto" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarMenu>
                {/* ... team items */}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Example 2: Issue Table Block

```tsx
// src/components/blocks/tables/issue-list-table.tsx
import { flexRender, getCoreRowModel, getGroupedRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function IssueListTable({ issues, columns }) {
  const table = useReactTable({
    data: issues,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    groupedColumnMode: 'reorder',
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} className="h-9 px-3">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow 
              key={row.id}
              className="h-8 hover:bg-muted/60"
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Example 3: Kanban Board Block

```tsx
// src/components/blocks/dashboard/issue-board.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusIcon } from "@/components/IssueExplorer"

export function IssueBoard({ groups }) {
  return (
    <div className="grid gap-3 overflow-x-auto lg:grid-cols-4">
      {groups.map(([state, issues]) => (
        <div key={state} className="min-w-64 rounded-md border">
          <div className="flex h-10 items-center justify-between border-b px-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <StatusIcon status={state} size={13} />
              {state}
            </span>
            <Badge variant="outline" className="h-5 text-[11px]">
              {issues.length}
            </Badge>
          </div>
          
          <div className="space-y-2 p-2">
            {issues.map(issue => (
              <Card key={issue.key} className="cursor-pointer hover:bg-muted/40">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {issue.key}
                    </span>
                    <Avatar size="sm" />
                  </div>
                  <p className="text-sm font-medium">{issue.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Example 4: Design Token Override

```tsx
// src/lib/linear-tokens.ts
export const linearTokens = {
  sidebar: {
    width: '244px',
    bg: {
      light: '#fafafa',
      dark: '#111111',
    },
    hover: {
      light: '#f4f4f3',
      dark: '#1a1a1a',
    },
  },
  topbar: {
    height: '88px',
    bg: {
      light: '#ffffff',
      dark: '#171717',
    },
  },
  primary: {
    default: '#5e6ad2',
    hover: '#4e5bc8',
  },
  spacing: {
    rowHeight: '32px',
    rowPadding: '6px 12px',
  },
}

// Apply in tailwind.config.js
export default {
  theme: {
    extend: {
      width: {
        'sidebar': linearTokens.sidebar.width,
      },
      height: {
        'topbar': linearTokens.topbar.height,
        'row': linearTokens.spacing.rowHeight,
      },
    },
  },
}
```

---

## 7. Implementation Timeline

**Total Estimated Time: 32 hours (4 days @ 8 hours/day)**

### Day 1: Foundation (8 hours)
- Morning: Phase 1 (Setup) + Phase 2 (Sidebar)
- Afternoon: Phase 3 (Header) + Start Phase 4

### Day 2: Core Views (8 hours)
- Morning: Complete Phase 4 (Issue List)
- Afternoon: Phase 5 (Issue Board)

### Day 3: Details & Split Views (8 hours)
- Morning: Phase 6 (Inbox) + Phase 7 (Stats)
- Afternoon: Phase 8 (Modals)

### Day 4: Polish & Validation (8 hours)
- Morning: Phase 9 (Projects) + Phase 10 (Polish)
- Afternoon: Testing, validation, comparison

---

## 8. Risk Mitigation

### Potential Issues & Solutions

**Issue 1: shadcn blocks are opinionated**
- **Risk:** Blocks may have different DOM structure
- **Solution:** Extract patterns, not copy-paste. Use blocks as reference, maintain control over HTML structure

**Issue 2: Current features break during migration**
- **Risk:** Keyboard shortcuts, state management disrupted
- **Solution:** Migrate one component at a time. Use feature flags to toggle old/new components

**Issue 3: Performance regression**
- **Risk:** More components = more renders
- **Solution:** Use React.memo on cards/rows. Profile before/after with React DevTools

**Issue 4: Dark mode inconsistencies**
- **Risk:** shadcn blocks may not match Linear's dark theme
- **Solution:** Override all color tokens in design-tokens.css. Test both themes continuously

**Issue 5: Responsive breakpoints different**
- **Risk:** Mobile layout breaks
- **Solution:** Keep existing breakpoints. Override shadcn defaults with Linear values

---

## 9. Success Metrics

### Visual Fidelity Score
- [ ] **100%** color match (hex values identical)
- [ ] **100%** spacing match (±1px tolerance)
- [ ] **100%** typography match (font, size, weight)
- [ ] **95%+** hover state match
- [ ] **95%+** animation timing match

### Functional Completeness
- [ ] All 20+ pages render correctly
- [ ] All keyboard shortcuts work (C, ⌘K, etc.)
- [ ] Dark mode toggle works
- [ ] Sidebar collapse/expand works
- [ ] All modals open/close correctly
- [ ] All forms submit correctly
- [ ] All navigation links work

### Performance
- [ ] Initial load: ≤ 2s (same as current)
- [ ] Time to interactive: ≤ 3s
- [ ] Largest contentful paint: ≤ 2.5s
- [ ] No console errors
- [ ] No accessibility violations (axe-core)

---

## 10. Post-Migration Cleanup

### Files to Archive
Move to `src/components/legacy/`:
- Old nav components (nav-main, nav-documents, nav-secondary)
- Old custom table components
- Old custom board components

### Files to Delete
Once verified working:
- Legacy components
- Unused CSS files
- Old type definitions

### Documentation Updates
- [ ] Update README with new architecture
- [ ] Document shadcn block usage
- [ ] Create component story/examples
- [ ] Update developer onboarding guide
- [ ] Add architecture decision record (ADR)

---

## 11. Quick Reference

### Key Files Modified

```
src/
  components/
    blocks/                      # NEW: shadcn block adaptations
      sidebar/
        linear-sidebar.tsx       # NEW: Rebuilt sidebar
      dashboard/
        linear-header.tsx        # NEW: Rebuilt header
        issue-board.tsx          # NEW: Kanban board
        issue-card.tsx           # NEW: Board card
        project-board.tsx        # NEW: Projects kanban
        stats-cards.tsx          # NEW: Stats overview
        inbox-split.tsx          # NEW: Split pane
      tables/
        issue-list-table.tsx     # NEW: Issue table
      forms/
        quick-create-form.tsx    # NEW: Issue form
    
    AppRoot.tsx                  # MODIFIED: Use new sidebar
    IssueExplorer.tsx            # MODIFIED: Use new table/board
    QuickCreateModal.tsx         # MODIFIED: Use new form
    site-header.tsx              # MODIFIED: Use new header
  
  pages/
    WorkspacePages.tsx           # MODIFIED: Use new blocks

  lib/
    linear-tokens.ts             # NEW: Design token overrides
```

### Command Cheatsheet

```bash
# Start development
npm run dev

# Add shadcn component
npx shadcn@latest add [component]

# Build for production
npm run build

# Run tests
npm test

# Check bundle size
npm run build -- --analyze
```

---

## 12. Notes & Considerations

### Why Use shadcn Blocks?

**Pros:**
- ✅ Consistent patterns across components
- ✅ Accessible by default (ARIA labels, focus management)
- ✅ Type-safe with TypeScript
- ✅ Maintained by shadcn community
- ✅ Easy to customize (copy-paste, not npm package)
- ✅ Built on Radix UI primitives (robust)

**Cons:**
- ⚠️ Opinionated structure (need overrides)
- ⚠️ May not match Linear exactly (requires customization)
- ⚠️ More initial setup time
- ⚠️ Need to stay updated with shadcn releases

### When to Diverge from Blocks

**Keep custom if:**
- Performance-critical (e.g., virtualized lists)
- Highly Linear-specific behavior
- Complex state management (e.g., drag-drop with special rules)
- Animation requirements not supported by blocks

**Use blocks for:**
- Standard UI patterns (tables, cards, forms)
- Layout structure (sidebar, header, split panes)
- Basic interactions (hover, click, focus)

---

## Appendix A: shadcn Block URLs

**Sidebar Blocks:**
- https://ui.shadcn.com/blocks#sidebar-07
- https://ui.shadcn.com/blocks#sidebar-08

**Dashboard Blocks:**
- https://ui.shadcn.com/blocks#dashboard-01 (stats cards)
- https://ui.shadcn.com/blocks#dashboard-03 (kanban)
- https://ui.shadcn.com/blocks#dashboard-06 (split pane)

**Table Blocks:**
- https://ui.shadcn.com/blocks#table-02

**Form Blocks:**
- https://ui.shadcn.com/blocks#form-01

**Chart Blocks:**
- https://ui.shadcn.com/blocks#chart-area-interactive (already using recharts)

---

## Appendix B: Color Palette Reference

### Light Mode
```css
--background: #ffffff
--foreground: #0a0a0a
--primary: #5e6ad2
--primary-hover: #4e5bc8
--muted: #f4f4f3
--muted-foreground: #8a8885
--border: #e6e6e6
--sidebar-bg: #fafafa
--topbar-bg: #ffffff
```

### Dark Mode
```css
--background: #161616
--foreground: #eeeeee
--primary: #5e6ad2
--primary-hover: #7179db
--muted: #222222
--muted-foreground: #7a7a7a
--border: #2d2d2d
--sidebar-bg: #111111
--topbar-bg: #171717
```

---

## Summary

This plan provides a comprehensive roadmap to rebuild the Linear clone using shadcn/ui blocks while maintaining 100% visual fidelity. The phased approach ensures each component is migrated systematically with proper validation at each step.

**Key Success Factors:**
1. Use shadcn blocks as patterns, not rigid templates
2. Override styles with Linear design tokens
3. Maintain existing functionality during migration
4. Test continuously (visual, functional, performance)
5. Document all deviations from standard blocks

**Next Steps:**
1. Review this plan with team
2. Create feature branch
3. Start Phase 1 (Setup)
4. Complete one phase per day
5. Validate after each phase

**Questions? Contact the team or reference:**
- shadcn docs: https://ui.shadcn.com
- Linear design: https://linear.app/eltsuh/team/ELT/active
- Current codebase: /app/frontend/src/components
