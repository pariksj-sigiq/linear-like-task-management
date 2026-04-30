# History — How the Clone Got Here

Commit-by-commit reconstruction of the build. Dates in IST.

## Phase 1 — Initial assignment delivery (2026-04-29)

### `8931a35` feat: implement Linear clone assignment
2026-04-29 01:32 — 19,453 lines added across 152 files. One-shot initial build.

Landed in this commit:

- FastAPI tool server (`app/server.py` ~2260 LOC), Pydantic schemas (`app/schema.py` ~342 LOC), SQLAlchemy `models.py`.
- Postgres schema (`app/postgres/init.sql` ~354 LOC) — all core tables, indexes, views.
- Seed pipeline (`app/seed/seed_app.py` ~600 LOC) + `app/seed_data/users.json` + manifest.
- React frontend (Vite + Tailwind + Electron wrapper): `App.tsx`, `LinearShell.tsx`, `IssueExplorer.tsx`, `QuickCreateModal.tsx`, `CommandPalette.tsx`, `IssuePage.tsx`, `WorkspacePages.tsx`, shared shell.
- Design tokens + Linear-flavored `index.css`.
- 15 CUA task directories (T01–T15) with instruction, toml, golden, verify.
- `tasks/smoke_test.py`.
- `Makefile`, docker-compose, three Dockerfiles.
- `shared/` skeleton (AppShell, DataTable, FormLayout, Modal, RecordDetail, SearchBar, seed_runner, test_helpers).
- `skills/taskgen-SKILL.md`, `skills/accounting-example-SKILL.md`.
- `pipeline/build/*`, `pipeline/qa/*` methodology docs.
- `spec/FEATURES.md`, `spec/RESEARCH.md`, `spec/SYSTEM_PLAN.md`, `spec/TASK_PLAN.md` + `.example` templates.
- `README.md` (full playbook), `FEATURE_INVENTORY.md`, `LOOM_SCRIPT.md`, `QA_REPORT.md`.
- `scripts/validate.sh`.

### `093c126` chore: finalize clone submission state
2026-04-29 15:40 — 65 files, +498/-357.

- Renamed multiple task dirs to their final slugs (e.g. `linear-T01-launch-review-bulk` → `linear-T01-submission-review-bulk`).
- Expanded `IssueExplorer` + `LinearShell` + `index.css` for polish.
- Updated `seed_app.py` substantially; adjusted server to add missing surfaces.
- Brought spec docs to final shape.

## Phase 2 — Fidelity iteration (2026-04-29 evening)

Dense polish cycle against the Linear reference. No schema changes; UI only.

### `71125a1` fix: restore system dark theme
+129/-32 in `design-tokens.css`, `index.css`, `components/ui.tsx`. Dark-mode variable set restored.

### `cab43bc` fix: polish linear clone shell fidelity
+76/-42. `IssueExplorer`, `LinearShell`, `Login`, `WorkspacePages`, e2e test nudges.

### `3c64cff` fix: polish linear clone fidelity
+474/-86. `QuickCreateModal` depth (+103), `index.css` (+333), `WorkspacePages` refactor.

### `c016c84` fix: improve linear ui fidelity
+1040/-332. Major IssueExplorer + IssuePage + WorkspacePages rewrite. `index.css` +530.

### `47f87bf` fix: tighten linear ui fidelity
+367/-46. Additional IssueExplorer + WorkspacePages + tokens tuning.

### `ce736b2` fix: refine linear activity typography
+12/-12. Type scale micro-adjustments.

### `2aa3c2d` feat: achieve pixel-perfect Linear UI fidelity
Large commit. IssueExplorer +504/-~, `index.css` +1736/-~, property-picker depth, `auth.tsx` tweaks, many Playwright MCP console + page snapshot logs added (evidence of screenshot loop).

### `95ea7e5` feat: complete Linear UI fidelity pass with dark mode
Dark theme finalized across shell, board, rows.

## Phase 3 — Shadcn rebuild (2026-04-29 late → 2026-04-30)

### `3ff0700` feat: rebuild with shadcn patterns for pixel-perfect Linear match
Structural shift: Radix/shadcn primitives adopted under `components/ui/*`. Shell reorganized. `AppRoot`, `app-sidebar`, `site-header`, `nav-*` components introduced.

### `c023145` feat: match linear clone ui reference
Continuation of shadcn rebuild; component fidelity to Linear reference screenshots.

### `18b2f6f` feat: add linear filter menu
Projects/issues filter menus — `ProjectsDisplayMenu`, `ProjectsFilterMenu`, etc.

### `40e30d5` feat: finalize linear clone setup
Final pre-polish pass before the demo-workflow commit.

### `bcf690b` feat: polish linear demo workflows
2026-04-30 14:17 — most recent commit on master. Tightens the demo workflows surfaced in `LOOM_SCRIPT.md`.

## Phase 4 — Working tree (uncommitted, 2026-04-30)

Status: **22 files modified, 2855 insertions, 865 deletions** not yet committed. Several new files/directories added and untracked.

### New files (untracked)

- `app/frontend/src/components/issue/ProjectPicker.tsx`
- `app/frontend/src/components/project/{OverviewTab,IssuesTab,ActivityTab,ProjectHeader,ProjectMilestonesList,ProjectPropertiesSidebar}.tsx`
- `app/frontend/src/pages/SettingsPages.tsx` (1103 LOC — full settings tree)
- `app/frontend/src/preferences.ts` (normalizer, defaults, PREFERENCE_EVENT)
- `app/tests/e2e/test_assignment_workflows.py`
- `app/tests/e2e/test_workflow_suite.py`
- `app/tests/test_demo_api_parity.py`
- `app/tests/test_mcp_contract.py`
- `app/tests/test_workflows_api.py`
- `docs/superpowers/plans/2026-04-30-linear-clone-demo-test-suite.md`
- `SETTINGS_QA_REPORT.md`
- `artifacts/`, `spec/PROJECTS_LIST_FIDELITY_REPORT.md`, `spec/screenshots/settings-reference/`, `spec/screenshots/settings-validation/`, `spec/screenshots/linear-vs-clone/`
- Many screenshot PNGs + Playwright MCP console/page snapshots in repo root and `.playwright-mcp/`.

### Key modified files

- `app/server.py` +370 lines — `settings_actions` table + `record_setting_action` / `list_setting_actions` tools, additional compatibility aliases, more hydration, bulk tool hardening.
- `app/schema.py` +79 lines — new args models for settings, project statuses, milestones, API keys.
- `app/postgres/init.sql` +56 lines — `settings_actions`, `project_milestones`, `project_statuses`, `api_keys`, index adds.
- `app/seed/seed_app.py` +49 lines.
- `app/frontend/src/pages/WorkspacePages.tsx` +1656/-~ — most of the route-level rework.
- `app/frontend/src/components/IssueExplorer.tsx` +462/-~.
- `app/frontend/src/pages/IssuePage.tsx` +253/-~.
- `app/frontend/src/components/AppRoot.tsx` +132/-~.
- `app/frontend/src/components/app-sidebar.tsx` +256/-~.
- `app/frontend/src/components/ProjectsFilterMenu.tsx` +127/-~.
- `app/frontend/src/components/ProjectsDisplayMenu.tsx` +84/-~.
- `app/tests/e2e/test_linear_clone.py` +43/-~.

### Intent (per `SETTINGS_QA_REPORT.md` and demo-test-suite plan)

- Full settings tree with real backend backing where possible; `record_setting_action` fallback for Tier 2 surfaces.
- Demo-grade test suite: every UI feature has an API equivalent exercised in `test_demo_api_parity.py` + `test_workflows_api.py`; MCP contract guarded in `test_mcp_contract.py`.
- Seed counts per demo doc: 23 users, 7 teams, 143 issues, 18 projects, 14 cycles, 231 audit rows, 137 tools — **newer than the 16/5/116/9/12/118 counts in README.md and FEATURE_INVENTORY.md**. Docs still need a refresh pass.

### Known gaps from the demo plan (`docs/superpowers/plans/2026-04-30-...`)

1. `/inbox` renders but `notification-row` hidden while `list_notifications` returns 9.
2. Quick create modal can stay open after navigation — needs always-close-on-success.
3. Project names duplicated (`Backend Tool Server Coverage` ×2) — ambiguous for unscoped menus.
4. Label names duplicated across teams (`P0` ×3) — picker tests need team scoping.
5. `/settings/workspace` can stick on `Loading...` on direct navigation.
6. Older seed counts still in README + FEATURE_INVENTORY.

## Seed-count drift

Two distinct snapshots exist in the tree:

| Source | Users | Teams | Issues | Projects | Cycles | Tools |
|---|---|---|---|---|---|---|
| `README.md`, `FEATURE_INVENTORY.md`, `QA_REPORT.md` | 16 | 5 | 116 | 9 | 12 | 118 |
| `docs/superpowers/plans/2026-04-30-...` | 23 | 7 | 143 | 18 | 14 | 137 |

Always re-count after `make seed` before quoting numbers.
