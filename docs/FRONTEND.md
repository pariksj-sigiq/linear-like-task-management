# Frontend — React SPA

Root: `app/frontend/`. Stack: React 19, Vite 6, TypeScript 5.7, Tailwind 3.4, shadcn/ui (Radix primitives), `react-router-dom` v7, `@dnd-kit`, `sonner` toasts, `next-themes`, `recharts`.

Packaged two ways: web (served by FastAPI from Vite build) and desktop (`electron/main.js` loads built bundle).

## Entry + routing

- `src/main.tsx` — React root, mounts `<App />`.
- `src/App.tsx` — `AuthProvider > ProtectedApp > AppRoot > Routes`. System theme autodetected from `prefers-color-scheme`. Document title set to `Eltsuh`.
- Route table at `App.tsx:62-98`. Catch-all redirects to `/my-issues`.

Top-level routes:

| Path | Component | Tier |
|---|---|---|
| `/` | `HomePage` | 1 |
| `/inbox` | `InboxPage` | 1 |
| `/my-issues`, `/my-issues/{assigned,created,subscribed,activity}` | `MyIssuesPage` | 1 |
| `/drafts` | `TierTwoPage kind="drafts"` | 2 |
| `/views`, `/views/:viewId` | `ViewsPage`, `ViewDetailPage` | 1 |
| `/projects`, `/projects/:projectId`, `/project/:projectId/{overview,activity,issues}` | `ProjectsPage`, `ProjectDetailPage` | 1 |
| `/team/:teamKey/{all,active,backlog,triage,cycles,cycles/:cycleId,projects,projects/all,views,settings}` | `TeamIssuesPage`, `CyclesPage`, `CycleDetailPage`, `ProjectsPage`, `ViewsPage`, `TeamSettingsPage` | 1 |
| `/issue/:issueKey` | `IssuePage` | 1 |
| `/initiatives`, `/initiatives/:id` | `TierTwoPage kind="initiatives"` | 2 |
| `/roadmap` | `TierTwoPage kind="roadmap"` | 2 |
| `/settings/*` | `SettingsPage` | 1/2 mix — see `SETTINGS_QA_REPORT.md` |
| `/search` | `GlobalSearchPage` | 1 |
| `/archive` | `ArchivePage` | 2 |

Sidebar order + required test IDs: `spec/RESEARCH.md` "Navigation Map".

## Shell

`components/AppRoot.tsx`:

- Renders `SidebarProvider > AppSidebar + SidebarInset(SiteHeader + <children>)`.
- Listens for `linear:quick-create` and `linear:command-palette` window events — any child can dispatch them.
- Global hotkeys: `cmd/ctrl+K` → command palette, bare `c` (outside inputs) → quick-create.
- Breadcrumb label derived from `routeLabels` regex array.

`components/app-sidebar.tsx` holds nav + workspace switcher. `components/site-header.tsx` is the top chrome. `CommandPalette.tsx` + `QuickCreateModal.tsx` are the global modals.

## Major pages + components

- `components/IssueExplorer.tsx` (1200 LOC) — the list + board view. Used by My Issues, Team Issues, views, project issues tab. Handles filters, grouping, bulk selection toolbar, inline property pickers.
- `components/ProjectsBoardView.tsx` — kanban layout for projects.
- `components/ProjectsDisplayMenu.tsx` / `ProjectsFilterMenu.tsx` — projects list controls.
- `components/ProjectCreateModal.tsx` — project creation.
- `components/project/*` — `OverviewTab`, `IssuesTab`, `ActivityTab`, `ProjectHeader`, `ProjectMilestonesList`, `ProjectPropertiesSidebar`.
- `components/issue/ProjectPicker.tsx` — reusable project picker used from issue detail + create modal.
- `pages/IssuePage.tsx` — issue detail, properties, sub-issues, relations, comments, activity.
- `pages/SettingsPages.tsx` (1100 LOC) — all settings sub-routes. Connected to real tools where possible; falls back to `record_setting_action` for Tier 2 pages.
- `pages/WorkspacePages.tsx` (2400 LOC) — most list/detail page shells.

`components/ui/*` is the shadcn library. Customize via Tailwind / CSS vars; don't fork the primitives.

## API client

`src/api.ts` exports `callTool` and `readTool`:

- `callTool(name, params)` → posts to `/step`, returns `observation`. Raises on HTTP non-2xx.
- `readTool(name, params)` → wraps `callTool`, returns `{data, error, observation}` where `data = observation.structured_content` on success. Used by most read-paths.
- `compactParams` strips empty values so partially-built forms don't send junk.

All data flow goes through these. There is no duplicate REST surface.

## State

- Auth: `AuthProvider` in `auth.tsx`. Local `useState`; reads from `/api/me` once on mount. Dev fallback injects admin if `/api/me` fails in `import.meta.env.DEV`.
- Preferences: `preferences.ts` holds defaults + normalizer; `PREFERENCE_EVENT` fires after updates so pages re-sync.
- Local override cache for optimistic issue tweaks: `localIssueOverrides.ts`.
- No redux. Pages use local state + `useEffect(fetch)` patterns with `readTool`.

## Theme + design tokens

- `design-tokens.css` — Linear light/dark variables.
- `index.css` — shell typography, kanban rhythm, priority pills, etc. (updated heavily in recent commits).
- Tokens locked in `spec/RESEARCH.md` "Locked Design Tokens". Changes require screenshot-loop verification against Linear reference.

## Data-testid convention

Every interactive element that a task may target needs a stable `data-testid`. Patterns per `spec/RESEARCH.md` "Page Layout Specs":

- Page root: `{area}-page` (e.g. `issues-page`, `inbox-page`).
- Row: `{entity}-row-{id}` (e.g. `issue-row-LIN-130`, `project-row-{project_id}`).
- Picker: `issue-{property}-picker`.
- Button: verb-noun (`submit-comment-button`, `create-issue-submit`).

When adding UI, check if a matching `data-testid` is already listed in `RESEARCH.md`. If so, use it; if not, pick one and add a row to the spec.

## Dev vs prod

- Dev: `make dev-frontend` runs Vite on `:3000`, proxies `/step`, `/api/*`, `/tools` to `:8030`. Cookies shared via proxy.
- Prod: Vite build copied into FastAPI static; SPA fallback serves index for deep routes (see `QA_REPORT.md:49`).

Electron: `make desktop-dev` (dev window loads :3000) / `make desktop` (builds .dmg/.exe/.AppImage).

## Optimistic-update rule

Never set local state past the observation point unless `observation.is_error !== true`. Issue row property pickers, bulk toolbar, and create/edit forms must revert on error. Verify by temporarily forcing `is_error=true` from the handler and ensuring the UI returns to prior state.
