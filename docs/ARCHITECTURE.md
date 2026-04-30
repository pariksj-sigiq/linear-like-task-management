# Architecture

## Process topology

```
┌────────────────────┐    HTTP    ┌─────────────────────┐   SQL   ┌──────────────┐
│ React SPA (Vite)   │────────────▶│ FastAPI app:8030   │────────▶│ Postgres:5432│
│ localhost:3000 dev │   /step    │ app/server.py       │ SQLA    │ cloneapp     │
│ served from 8030   │  /api/*    │                     │         │              │
└────────────────────┘            └─────────────────────┘         └──────────────┘
        ▲                                  ▲                              ▲
        │ Playwright                       │ /step POST                   │ psycopg2
        │                                  │                              │
    Agent (UI)                        Agent (API)                    Verifier
```

Three docker services (see `docker-compose.dev.yml`): `postgres`, `clone-app`, `seed`. Dev mode can skip docker using `make dev-backend` + `make dev-frontend`.

## Request flow

1. Browser → `/api/login` (cookie session) or loads bundle at `/`.
2. React calls `/step` via `app/frontend/src/api.ts:callTool` / `readTool`. Body: `{action:{tool_name, parameters}}`. Response: `{observation:{is_error,text,structured_content}, reward:null, done:false}`.
3. `server.py:handle_step` dispatches `tool_name` to handler function. Handler opens `DBSession(engine)`, does work, commits, returns dict.
4. Handler result wrapped in `ToolResult` → `observation_from_result` → HTTP JSON.
5. UI branches on `observation.is_error`. Only mutates local state on success.

## Layers

| Layer | Files | Responsibility |
|---|---|---|
| HTTP | `app/server.py` routes `/health`, `/tools`, `/step`, `/reset`, `/snapshot`, `/api/*` | FastAPI |
| Tool registry | `TOOL_DEFS` at `server.py:1852`, `TOOLS` list at 1999 | tuple of (name, description, ArgsCls, mutates_bool) |
| Dispatch | handler functions in `server.py` | keyed by tool name via internal dispatcher |
| Schemas | `app/schema.py` | Pydantic `BaseModel` per tool args; used for validation + json_schema emission |
| Data access | `_scalar/_one/_many/_row/_rows` helpers | thin SQL + row normalization |
| Hydration | `_hydrate_issue`, `_labels_for_issue`, `_project_progress` | join state/labels/assignee/project onto raw rows |
| Audit | `_audit(db, entity_type, entity_id, action, details)`, `_activity(...)` | write `audit_log` and `issue_activity` |
| Legacy aliases | `_legacy_*` helpers | map task/UI-legacy parameter shapes to canonical tool arg models |

## Frontend architecture

- Router: `react-router-dom` v7. Routes listed in `App.tsx:62-98`.
- Auth gate: `AuthProvider` from `auth.tsx` wraps `ProtectedApp`. In `import.meta.env.DEV`, falls back to dev admin if `/api/me` fails.
- Shell: `AppRoot` (`components/AppRoot.tsx`) composes `AppSidebar` + `SiteHeader` + `<children>`, registers global listeners for `linear:quick-create` / `linear:command-palette` events and cmd-K / `c` hotkeys.
- Pages: `pages/WorkspacePages.tsx` (2400+ LOC) holds most route components; `IssuePage.tsx`, `Login.tsx`, `SettingsPages.tsx` split out.
- Tables: `components/IssueExplorer.tsx` is the monolithic list+board (1200 LOC). Used by My Issues, Team Issues, project issues, views.
- Project detail: split into `components/project/{OverviewTab,IssuesTab,ActivityTab,ProjectHeader,ProjectMilestonesList,ProjectPropertiesSidebar}.tsx`.
- Shadcn primitives live under `components/ui/*`. Do not hand-roll replacements.
- Theme: `design-tokens.css` + `index.css` drive Linear light/dark. Theme toggled by `prefers-color-scheme` in `App.tsx:29-42` — overrides `document.documentElement.dataset.theme` and class `linear-dark`/`dark`.

## Data access contract

- Text primary keys, prefix-per-table: `user_`, `team_`, `iss_`, `prj_`, `cyc_`, `lbl_`, `st_`, etc. (`_next_id` at `server.py:248`). Issues also have a human `identifier` like `PLAT-001` / `LIN-130`.
- JSONB only where structure is variable: `settings_actions.details`, `views.filters_json` / `display_json`, `issue_activity.details`, `audit_log.details`.
- Views expose rename aliases to keep tool contracts stable: `comments` over `issue_comments`, `activity_events` over `issue_activity`, `saved_views` over `views`, `inbox_notifications` over `notifications`. Write through underlying tables; read either name.

## Auth

- Cookie-based session. `users.password` stored plaintext (assignment demo; do not harden without discussing).
- `sessions` table links token hash → user. `get_current_user(session_token)` resolves per request.
- Dev fallback in frontend auth provider bypasses login for local iteration.

## Extension points

- New tool → add to `schema.py` + `server.py` handler + `TOOL_DEFS` + dispatcher + `test_tools.py`.
- New table → `postgres/init.sql` + optional `models.py` + seed in `seed_app.py` + tool exposing it.
- New task → `tasks/linear-T{NN}-{slug}/{instruction.md,task.toml,tests/golden_apply.py,tests/verify.py}`. Add stable seed records it needs, then add to `tasks/smoke_test.py` glob auto-picks.
- New UI route → add to `App.tsx` `<Routes>`, add `routeLabels` regex in `AppRoot.tsx`, add sidebar entry in `app-sidebar.tsx`, add nav `data-testid` per `spec/RESEARCH.md`.
