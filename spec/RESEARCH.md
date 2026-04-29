# Linear Clone Design Research

## Source Status

The current fidelity pass used the user's logged-in Linear My Issues activity
surface as a read-only live reference. The implementation keeps private account
content out of the repo, but mirrors the observed light theme, sidebar rhythm,
tab pills, kanban columns, and compact issue cards with seeded clone data.

## Screenshot And Reference Index

| Ref | Source type | Surface | State | What it anchors |
|---|---|---|---|---|
| R01 | Live read-only reference | Workspace shell | Light theme | Left sidebar, team sections, compact top chrome |
| R02 | Live read-only reference | My Issues activity | Board | Tab pills, display controls, workflow columns, issue cards |
| R03 | Public docs approximation | Issues list | Default | Dense issue table, icons, priority, assignee, labels |
| R04 | Public docs approximation | Issue detail | Default | Split issue content, properties, comments, activity |
| R05 | Public docs approximation | Create issue modal | Default | Fast modal create flow and keyboard-friendly fields |
| R06 | Public docs approximation | Project detail | Default | Project metadata, linked issues, updates stream |
| R07 | Public docs approximation | Cycles | Default | Current/upcoming cycle list and scope indicators |
| R08 | Public docs approximation | Views | Default | Saved filter sidebar and list results |
| R09 | Public docs approximation | Inbox | Default | Notification feed with unread/read/archive states |
| R10 | Public docs approximation | Command palette | Open | Searchable modal actions and entities |

## Locked Design Tokens

These values are reflected in `app/frontend/src/design-tokens.css` and target
Linear's light workspace theme.

| Token | Value | Notes |
|---|---|---|
| `--font-ui` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Linear-like dense product UI |
| `--font-mono` | `"SFMono-Regular", Consolas, "Liberation Mono", monospace` | Issue keys and shortcuts |
| `--app-bg` | `#fbfaf9` | Outer application background |
| `--sidebar-bg` | `#f4f4f3` | Global navigation |
| `--panel-bg` | `#ffffff` | Lists, detail panes, modal body |
| `--panel-raised` | `#ffffff` | Cards, popovers, selected rows |
| `--panel-hover` | `#f4f3f1` | Row/card hover |
| `--border-subtle` | `#e6e4e1` | Dividers and card borders |
| `--border-strong` | `#d6d3cf` | Focused inputs and selected panels |
| `--text-primary` | `#242321` | Main text |
| `--text-secondary` | `#5f5c58` | Metadata and secondary labels |
| `--text-muted` | `#8a8580` | Timestamps, placeholders |
| `--text-disabled` | `#b5b1ad` | Disabled controls |
| `--accent` | `#5e6ad2` | Primary Linear-like action color |
| `--accent-hover` | `#4f5bc4` | Primary hover |
| `--accent-soft` | `#eceae7` | Selected item fill |
| `--success` | `#28a06a` | Done, healthy |
| `--warning` | `#b8860b` | At risk, warning |
| `--danger` | `#cf5148` | Blocked, urgent |
| `--priority-urgent` | `#ff5c7a` | Urgent priority |
| `--priority-high` | `#f59e0b` | High priority |
| `--priority-medium` | `#60a5fa` | Medium priority |
| `--priority-low` | `#8b93a7` | Low priority |
| `--radius-sm` | `4px` | Inputs and pills |
| `--radius-md` | `6px` | Modals, cards, popovers |
| `--shadow-popover` | `0 18px 45px rgba(34, 31, 28, 0.14)` | Menus and palette |
| `--sidebar-width` | `210px` | Desktop shell |
| `--detail-width` | `420px` | Issue detail side panel |
| `--topbar-height` | `48px` | Page toolbar |
| `--row-height` | `44px` | Issue list rows |
| `--board-column-width` | `316px` | Kanban columns |

## Navigation Map

The app uses a persistent left sidebar and a content workspace.

Sidebar order:

| Item | Route | Tier | Required test id |
|---|---|---|---|
| Inbox | `/inbox` | Tier 1 | `nav-inbox` |
| My issues | `/my-issues/activity` | Tier 1 | `nav-my-issues` |
| Drafts | `/drafts` | Tier 2 stub | `nav-drafts` |
| Views | `/views` | Tier 1 | `nav-views` |
| Issues | `/team/eng/active` | Tier 1 | `team-eng-active-nav` |
| Projects | `/projects` | Tier 1 | `nav-projects` |
| Cycles | `/cycles` | Tier 1 | `nav-cycles` |
| Roadmap | `/roadmap` | Tier 2 stub | `nav-roadmap` |
| Initiatives | `/initiatives` | Tier 2 stub | `nav-initiatives` |
| Triage | `/triage` | Tier 2 stub | `nav-triage` |
| Settings | `/settings` | Tier 2 stub | `nav-settings` |
| Templates | `/templates` | Tier 2 stub | `nav-templates` |
| Archive | `/archive` | Tier 2 stub | `nav-archive` |
| Trash | `/trash` | Tier 2 stub | `nav-trash` |

Global controls:

| Control | Behavior | Test id |
|---|---|---|
| Workspace switcher | Opens workspace/team menu | `workspace-switcher` |
| New issue button | Opens create issue modal | `global-new-issue` |
| Command palette button | Opens command palette | `command-palette-trigger` |
| Search input | Opens search/palette with query | `global-search` |
| User menu | Opens account menu | `user-menu-trigger` |

## Page Layout Specs

### Issues List (`/issues`)

Dense table with toolbar filters above rows. The left edge has selection
checkboxes for bulk operations, then priority icon, issue key, title, labels,
project, cycle, assignee, status, and updated timestamp.

Required data-testids:

| Element | Test id |
|---|---|
| Page root | `issues-page` |
| View mode segmented control | `issues-view-mode` |
| List mode button | `issues-view-list` |
| Board mode button | `issues-view-board` |
| Filter button | `issues-filter-button` |
| Search box | `issues-search-input` |
| Issue row | `issue-row-{identifier}` |
| Issue checkbox | `issue-checkbox-{identifier}` |
| Bulk toolbar | `bulk-toolbar` |
| Bulk status menu | `bulk-status-menu` |
| Bulk label menu | `bulk-label-menu` |

### Issues Board (`/issues?view=board`)

Columns are workflow states in position order. Cards show priority, key, title,
labels, assignee, project, and blocked/related icon badges. Drag/drop is nice
to have; clickable move menus are required.

Required data-testids:

| Element | Test id |
|---|---|
| Board root | `issues-board` |
| Workflow column | `board-column-{state-slug}` |
| Board card | `board-card-{identifier}` |
| Card move menu | `board-card-move-{identifier}` |

### Issue Detail (`/issues/:identifier`)

Issue detail can render as a full page or right-side panel. It must expose the
same mutating controls either way. Content order is key/title, description,
properties, sub-issues, relations, comments, and activity.

Required data-testids:

| Element | Test id |
|---|---|
| Detail root | `issue-detail` |
| Issue key | `issue-detail-key` |
| Title field | `issue-title-input` |
| Description editor | `issue-description-editor` |
| Assignee picker | `issue-assignee-picker` |
| Status picker | `issue-status-picker` |
| Priority picker | `issue-priority-picker` |
| Project picker | `issue-project-picker` |
| Cycle picker | `issue-cycle-picker` |
| Label picker | `issue-label-picker` |
| Sub-issues section | `sub-issues-section` |
| Create sub-issue button | `create-sub-issue-button` |
| Relations section | `issue-relations-section` |
| Add relation button | `add-relation-button` |
| Comment editor | `issue-comment-editor` |
| Submit comment button | `submit-comment-button` |
| Activity stream | `issue-activity-stream` |

### Create Issue Modal (`/issues/new` and global modal)

Keyboard-first modal with title, team, description, assignee, priority, status,
project, cycle, labels, parent issue, and relation fields. Save creates the
issue and keeps the created record visible.

Required data-testids:

| Element | Test id |
|---|---|
| Modal root | `create-issue-modal` |
| Title input | `create-issue-title` |
| Description editor | `create-issue-description` |
| Team picker | `create-issue-team` |
| Assignee picker | `create-issue-assignee` |
| Priority picker | `create-issue-priority` |
| Status picker | `create-issue-status` |
| Project picker | `create-issue-project` |
| Cycle picker | `create-issue-cycle` |
| Parent picker | `create-issue-parent` |
| Label picker | `create-issue-labels` |
| Create button | `create-issue-submit` |

### Projects (`/projects`, `/projects/:id`)

Project list shows status, health, lead, target date, issue counts, and last
update. Detail page shows project metadata, linked issues, and updates.

Required data-testids:

| Element | Test id |
|---|---|
| Projects page | `projects-page` |
| Project row | `project-row-{project-id}` |
| Project detail | `project-detail` |
| Project status picker | `project-status-picker` |
| Project health picker | `project-health-picker` |
| Project issues list | `project-issues-list` |
| Project updates list | `project-updates-list` |
| New project update button | `new-project-update-button` |
| Project update editor | `project-update-editor` |
| Submit project update | `submit-project-update` |

### Cycles (`/cycles`)

Cycle view shows current, upcoming, and completed cycles with scope counts.
Clicking a cycle filters issues by that cycle.

Required data-testids:

| Element | Test id |
|---|---|
| Cycles page | `cycles-page` |
| Cycle row | `cycle-row-{cycle-id}` |
| Cycle issues link | `cycle-issues-{cycle-id}` |
| Cycle scope count | `cycle-scope-count-{cycle-id}` |

### Saved Views (`/views`, `/views/:id`)

Saved views preserve filters, grouping, sort, and display mode. Users can create
and edit their own views.

Required data-testids:

| Element | Test id |
|---|---|
| Views page | `views-page` |
| Saved view row | `saved-view-row-{view-id}` |
| New saved view button | `new-saved-view-button` |
| Saved view editor | `saved-view-editor` |
| Saved view name input | `saved-view-name-input` |
| Save view button | `save-view-button` |

### My Issues (`/my-issues`)

Personal work queue filtered to the signed-in user. Supports grouping by status,
priority, cycle, or project and uses the same list row controls as Issues.

Required data-testids:

| Element | Test id |
|---|---|
| My Issues page | `my-issues-page` |
| Group by control | `my-issues-group-by` |
| My issue row | `my-issue-row-{identifier}` |

### Inbox (`/inbox`)

Notification feed with unread, read, archive, and related issue navigation.

Required data-testids:

| Element | Test id |
|---|---|
| Inbox page | `inbox-page` |
| Inbox item | `inbox-item-{notification-id}` |
| Inbox unread filter | `inbox-filter-unread` |
| Mark read button | `inbox-mark-read-{notification-id}` |
| Archive button | `inbox-archive-{notification-id}` |

### Command Palette

Modal overlay opened from keyboard or button. It supports actions, issue search,
project search, view search, and navigation.

Required data-testids:

| Element | Test id |
|---|---|
| Palette root | `command-palette` |
| Palette input | `command-palette-input` |
| Palette result | `command-palette-result-{index}` |
| Palette empty state | `command-palette-empty` |

## Interactive State Matrix

| Element | States required | Implementation target |
|---|---|---|
| Primary buttons | default, hover, focus, active, disabled | Accent fill, 6px radius, visible 2px focus ring |
| Secondary buttons | default, hover, focus, active, disabled | Transparent or raised panel fill, subtle border |
| Sidebar nav item | default, hover, selected, focus | Selected uses `--accent-soft` with accent left marker |
| Issue row | default, hover, selected, focus, bulk-selected | Stable 44px height, no layout shift on checkbox visibility |
| Board card | default, hover, selected, focus, dragging | Raised panel hover, blocked badge visible |
| Property picker | closed, open, focused, disabled | Popover uses `--shadow-popover`, keyboard active row |
| Text input/editor | default, focus, filled, error, disabled | Border changes only, no content jump |
| Modal | opening, open, submitting, error | Overlay darkens app, modal width max 720px |
| Command palette | opening, results, no results, keyboard-selected | Centered 720px panel, result active row highlighted |
| Inbox item | unread, read, hover, archived pending | Unread dot and stronger title weight |
| Bulk toolbar | hidden, visible, submitting, error | Appears above table without shifting row heights |

## App-Specific Bug Targets

- Bulk operations must update every selected issue and must not mutate
  unselected rows.
- Create issue must use the server-returned issue id before adding labels,
  sub-issues, comments, or relations.
- Issue relations are directional. `blocks`, `blocked_by`, `duplicates`, and
  `related` must not be collapsed into one generic relation.
- Comments and activity are different streams. User comments are persisted in
  `comments`; system events are persisted in `activity_events`.
- Saved views must persist structured filters, not just display names.
- Inbox unread/archive state must be user-specific.
- Tier 2 pages must be visibly present but read-only, with disabled mutation
  controls and no backend write calls.
