# Agent Onboarding Guide — Linear Clone

Entry doc for any new agent landing in this repo. Read this first. Read siblings in `docs/` only when needed.

## What this repo is

Linear-style SaaS clone built for Collinear's rl-gym agent-eval pipeline. Three consumers:

- Agent via `POST /step` tool server (HTTP JSON, 139 tools).
- Agent via Playwright on React UI.
- Verifier via direct Postgres SQL.

Every user-visible mutation must work through both UI and `/step`. Verifiers query Postgres.

Stack: FastAPI + SQLAlchemy + Postgres. React 19 + Vite + Tailwind + shadcn/ui. Electron wrap. pytest + playwright.

## Repo layout (essentials)

```
app/
  server.py            FastAPI tool server (2700+ LOC, 139 tool defs)
  schema.py            Pydantic arg models for every tool
  models.py            SQLAlchemy models (thin)
  postgres/init.sql    DB schema — tables + views (comments, activity_events, saved_views, inbox_notifications)
  seed/seed_app.py     Deterministic seed, calls /step
  seed_data/*.json     User + manifest fixtures
  frontend/            React/Vite app
  tests/               pytest unit + e2e (playwright)
spec/
  FEATURES.md          Tier 1 + Tier 2 feature list, locked tool names
  RESEARCH.md          Design tokens, layout specs, data-testids
  SYSTEM_PLAN.md       Arch contract, tables, enums, tool contracts, required seed ids
  TASK_PLAN.md         CUA task matrix (T01–T15), failure-mode first
tasks/
  linear-T01..T15/     instruction.md, task.toml, tests/golden_apply.py, tests/verify.py
  smoke_test.py        Runs negative -> golden -> positive for each task
pipeline/
  build/               Build-time pipeline docs (orchestrator, swarm plan, fidelity loop)
  qa/                  QA audit + task authoring methodology
scripts/validate.sh    Counts tools, checks layout, gates delivery
dockerfiles/           app + postgres + seed images
docker-compose.dev.yml 3-service stack
Makefile               up/down/seed/test/validate/desktop/dev-backend/dev-frontend
```

Top-level reports: `README.md`, `QA_REPORT.md`, `SETTINGS_QA_REPORT.md`, `FEATURE_INVENTORY.md`, `LOOM_SCRIPT.md`.

## Start here

```bash
make up          # docker stack (postgres + app). Waits for http://localhost:8030/health.
make seed        # deterministic seed through /step.
make test        # unit + e2e.
make validate    # scripts/validate.sh — tool count + layout gates.
```

Hot reload:

```bash
make dev-backend    # uvicorn app.server --port 8030 --reload
make dev-frontend   # vite on localhost:3000 (proxies to 8030)
```

Reset + reseed:

```bash
curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed
```

Task smokes:

```bash
TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null' \
  .venv/bin/python tasks/smoke_test.py
```

## HTTP contract

- `GET /health` → `{"status":"healthy"}`
- `GET /tools` → `{"tools":[{name,description,input_schema,mutates_state?}]}` (MCP-shaped).
- `POST /step` body `{"action":{"tool_name","parameters"}}` → `{"observation":{"is_error","text","structured_content"},"reward":null,"done":false}`.
- `POST /reset` → wipes DB; re-run seed after.
- `GET /snapshot` → full JSON dump for verifier sanity.
- `POST /api/login`, `/api/logout`, `GET /api/me` — session-cookie auth.

On error: `observation.is_error=true`, `text` = message. UI must branch on `is_error` before mutating optimistic state.

## Seed contract

Deterministic. Current post-seed counts:

- Users 23. Teams 7. Issues 143. Projects 18. Cycles 14. Tools 139.
- Treat these counts as reproducible from `make seed`; re-count after seed changes.

Stable identifiers required by tasks (do NOT rename):

- Users: `alex.rivera`, `maya.patel`, `sam.chen`, `taylor.nguyen`, `jordan.lee`, `priya.shah`, `nora.kim`, `diego.morales`.
- Teams: `PLAT`, `GROW`, `DES` (plus others seeded).
- Issues: `LIN-077`, `LIN-087`, `LIN-099`, `LIN-104`, `LIN-121`, `LIN-122`, `LIN-130–132`, `LIN-140–142`, `LIN-150–152`, `LIN-160–162`, `LIN-170–172`, `LIN-180–182`.
- Projects: `prj-api-hardening`, `prj-launch-readiness`, `prj-billing-polish`.
- Cycles: `cyc-platform-w18`, `cyc-platform-w19`, `cyc-growth-w18`.
- Labels: `API`, `Security`, `Reviewer`, `Regression`, `Submission`, `Docs`, `Task QA`, `Incident`, `Frontend`, `Backend`.
- Workflow states per team: `Backlog`, `Todo`, `In Progress`, `In Review`, `Ready for QA`, `Done`, `Canceled`.

Full list: `spec/SYSTEM_PLAN.md` "Seed Records Required By Tasks".

## Where to go next

- Architecture + data flow: `docs/ARCHITECTURE.md`.
- Backend tool server internals: `docs/BACKEND.md`.
- Frontend shell, routing, data-testids: `docs/FRONTEND.md`.
- DB schema + enums + views: `docs/DATA_MODEL.md`.
- CUA tasks (author, verify, smoke): `docs/TASKS.md`.
- Tests (unit, e2e, contract, MCP): `docs/TESTING.md`.
- Daily workflows (fix UI, add tool, add task): `docs/WORKFLOW.md`.
- How this app got here (commit-by-commit): `docs/HISTORY.md`.

## Hard rules (do not violate)

- Preserve locked tool names in `spec/FEATURES.md` "Locked Tool Names". Task goldens assume them.
- Preserve stable IDs above. Verifiers join on them.
- Every tool in `TOOL_DEFS` (`app/server.py:1852`) must also exist in the dispatcher (`handle_step` / `DISPATCH`). Adding a tool requires: schema in `schema.py`, handler in `server.py`, tuple in `TOOL_DEFS`, dispatcher entry, unit test.
- Every mutation tool must audit/activity-log where appropriate (`_audit`, `_activity`). Bulk ops must log each affected identifier.
- UI optimistic updates only on non-error observation.
- Tier 2 pages: navigable, visually coherent, buttons disabled/read-only, no write calls unless backed by `record_setting_action`.
- Instructions in `tasks/*/instruction.md` are GUI-only, conversational, ASCII, unnumbered.
- Never edit `shared/`, `dockerfiles/`, or `pipeline/` per-run. They are methodology layer.

## Common traps

- Issue relations are directional (`blocks`, `blocked_by`, `duplicates`, `related`). Don't collapse.
- `comments` vs `activity_events` are different streams. Comments = user text in `issue_comments`. Activity = system events in `issue_activity`. Views `comments` and `activity_events` are DB aliases (see `init.sql:384`).
- `saved_views` and `inbox_notifications` are VIEWS over `views` and `notifications` tables. Write through the underlying tables/tools; read either name.
- Bulk ops must mutate only selected identifiers. Distractor rows test this.
- Create-issue flow must use the server-returned id before labeling/relating/commenting.
- Working tree has heavy modifications vs `master` (2800+ lines changed across 22 files). When reading code, check `git diff HEAD <path>` before assuming committed state matches current.
