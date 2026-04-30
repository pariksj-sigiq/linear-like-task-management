# Linear Clone — Fidelity Gap Report

Generated via Playwright MCP side-by-side capture, 2026-04-29. Real Linear = `linear.app/eltsuh`. Clone = `localhost:3000`.

Screenshots in `spec/screenshots/linear/` (suffix `-real.png` vs `-clone.png`).

## Summary

Clone HEAD (commit `3ff0700`) is closer to Linear than expected — labelled sidebar, correct purple accent, grouped rows, status glyphs, ELT-xx IDs, Apr 29 dates are all in place. However **systemic chrome + routing gaps** still make it read as "not Linear":

1. **Extra action buttons in page top-right** (`Search ⌘K`, `+ New issue`, `Inbox`, `Settings`) that Linear does not have on these routes.
2. **Extra sidebar items + footer chrome** that Linear free plan does not show (`Initiatives`, `Search` nav, `Settings` nav, `What's new` card, prominent user row footer).
3. **Broken routes** — `/projects/all` and similar render the wrong page initially; sidebar `Projects` click does not update URL to `/team/elt/projects/all`.
4. **Team key mismatch** — clone uses `/team/engg/...` in "Your teams" sidebar entries, but heading + content key = `ELT`. Must be consistent.

Until these are fixed, clone fails the 100% fidelity bar.

---

## Gap list (per screen)

### Screen: `/` (My issues)
Real: `linear.app/eltsuh/my-issues/assigned` — `my-issues-real.png` (or `projects-real-v2.png`)
Clone: `localhost:3000/` — `clone-root.png` / `my-issues-clone.png`

| # | Element | Real Linear | Clone | Fix |
|---|---|---|---|---|
| 1 | Page header right-side actions | only 3 icons: filter, display, details (small outline circles) | 4 buttons: `Search ⌘K` pill, `+ New issue` purple pill, bell icon, cog icon | Remove the 4-button top bar. Render only filter + display + details (outline icons, right-aligned in page header). Move `New issue` to global + button (top-left sidebar, beside workspace avatar) + `c` shortcut. |
| 2 | Sidebar primary items | `Inbox` (unread badge), `My issues` | same ✓ | OK |
| 3 | Sidebar Workspace group | `Projects`, `Views`, `More` (no `Initiatives`) | `Initiatives`, `Projects`, `Views`, `More` | Remove `Initiatives` row (free plan does not show it). |
| 4 | Sidebar bottom utility rows | none (free plan) | `Search`, `Settings` nav links + big `What's new` promo card + `System Administrator / admin` avatar row | Remove `Search` + `Settings` nav entries (search = cmd+k, settings = cog icon top or cmd+K). Remove `What's new` card. Remove account row — Linear shows avatar only top-left. |
| 5 | Page title | `My issues` plain text | `My Issues` (double caps) plus the duplicated `My Issues` heading + `Assigned/Created/Subscribed/Activity` tabs | Keep title `My issues`, tabs same. Drop duplicate inner heading + outer heading. |
| 6 | Tabs | `Assigned · Created · Subscribed · Activity` horizontal pills | same ✓ | OK |
| 7 | Sections/grouping | `Urgent issues 1 / Other active 3 / Completed 2` subtle-gray strip with caret | same ✓ | OK |
| 8 | Row layout | `priority icon · ELT-21 · status glyph · title · [labels] · assignee avatar · Apr 29` | same ✓ | OK |
| 9 | Footer bottom-left | `? / Free plan` icon buttons (small, outlined) | same ✓ | OK |
| 10 | Footer bottom-right | `Ask Linear / history` | same ✓ | OK |

### Screen: `/projects/all` (Projects list)
Real: `linear.app/eltsuh/projects/all` — `projects-real.png`
Clone: `localhost:3000/projects/all` — `projects-all-clone-v2.png`

| # | Element | Real Linear | Clone | Fix |
|---|---|---|---|---|
| 1 | URL behaviour | renders Projects page at `/projects/all` | initial render of `/projects/all` shows My Issues (routing leak); only after sidebar click the page re-renders projects content but URL keeps stale state | Fix React Router — `/projects/all` must load Projects component on first mount. |
| 2 | Page header right-side | filter + display + details icons only | `Search ⌘K / + New issue / Inbox / Settings` + page-internal `+ New project` | Drop top-right 4-button bar (see My Issues gap #1). Keep `+ New project` as the page-header + icon (top-right of projects table). |
| 3 | Projects table columns | `Name | Health | Priority | Lead | Target date | Issues | Status` with `○` health circle, `---` priority, avatar lead, date picker icon, issue count, `0%` progress ring | same ✓ | OK |
| 4 | Table view filters | `All projects` pill + stack icon (group-by view) | same ✓ | OK |
| 5 | Below-filter toolbar | 3 icons: filter, settings, (cube) view-switch | 3 icons: filter, settings, sidebar-close | Swap 3rd icon to view-switch (cube), not `close sidebar`. Page always full-width; no closable right panel on this route. |

### Screen: Team active issues (`/team/elt/active`)
Real: `linear.app/eltsuh/team/ELT/active` — `team-active-real.png`
Clone: `localhost:3000/team/engg/active` (via sidebar team link → wrong key)

| # | Element | Real Linear | Clone | Fix |
|---|---|---|---|---|
| 1 | Team key in URL | `ELT` | `engg` | Change sidebar team links to use `/team/elt/...` (match heading + issue IDs). Grep `team/engg` → replace. |
| 2 | Tabs | `All issues · Active · Backlog · + add new view` | same ✓ | OK |
| 3 | Group headers | `In Review / In Progress / Todo` (only groups with rows) | `In Review / In Progress / Todo` shown earlier in clone-root — same ✓ | OK |
| 4 | Row behaviour | hover reveals trailing actions on right | unverified | Capture & diff in Phase D. |

### Cross-cutting issues

- **Sidebar theme:** clone light sidebar matches Linear. No dark mode regression. OK.
- **Purple accent hex:** clone uses `#5e6ad2`-family; matches Linear. OK.
- **Font + row height:** matches 13px / ~32px. OK.
- **Status glyphs:** matches (green ring, yellow partial, empty circle). OK.
- **Issue IDs:** clone uses `ELT-21`. OK.
- **Dates:** `Apr 29` short form. OK.

---

## Rejection summary for Phase D build subagent(s)

Scope: shell + routing only. No per-issue/per-project content rebuild needed — content already matches.

**Subagent-1 — LinearShell chrome cleanup**
Files: `app/frontend/src/components/LinearShell.tsx`, `app/frontend/src/components/app-sidebar.tsx`, `app/frontend/src/pages/*.tsx` page headers.

Remove from page top-right action bar (across every page):
- `Search ⌘K` pill button
- `+ New issue` purple pill button
- `Inbox` bell icon button
- `Settings` cog icon button

Keep only: `filter / display / details` outline icons (right-aligned in page header — Linear uses `<button>` with small 16px icons, no background).

Move global actions:
- `+ New issue`: move to sidebar top-left beside workspace avatar (icon-only `+` button). Also bind global `c` keyboard shortcut to open QuickCreateModal.
- `Search` → global `Cmd+K` opens CommandPalette. No visible pill.
- `Inbox` → already in sidebar as first nav item.
- `Settings` → open via `Cmd+,` or move to cog icon on workspace-avatar popover.

Remove from sidebar:
- `Initiatives` row (free plan does not show it)
- `Search` utility nav row
- `Settings` utility nav row
- `What's new` promo card
- `System Administrator / admin` footer row

**Subagent-2 — Routing + team key fix**
Files: `app/frontend/src/components/AppRoot.tsx` (or wherever routes live), `app/frontend/src/components/app-sidebar.tsx`.

- Fix `/projects/all` to mount `ProjectsPage` directly — no My Issues fallback.
- Replace all `/team/engg/...` references with `/team/elt/...` in sidebar + routing. Team key must match heading + seed data (`ELT`).
- Verify `/team/elt/active`, `/team/elt/backlog`, `/team/elt/all`, `/team/elt/projects/all`, `/team/elt/views/issues` all route correctly.

**Verification loop (orchestrator):**
For each screen above, re-run MCP sequence (`browser_navigate` real → screenshot; `browser_navigate` clone → screenshot; diff). Approve only when every row in this gap table reads OK.
