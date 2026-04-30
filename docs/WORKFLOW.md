# Daily Workflows

Common recipes for agents landing on this repo. Use alongside `docs/AGENT_GUIDE.md`.

## Bring stack up, reset, reseed

```bash
make up                                                   # start postgres + app, wait for health
make seed                                                 # deterministic seed via /step
curl -sf -X POST http://localhost:8030/reset >/dev/null   # wipe DB
make seed                                                 # reseed
```

Hot reload for tighter loops:

```bash
make dev-backend        # uvicorn reload on :8030
make dev-frontend       # vite :3000 proxies /step, /api/*, /tools to :8030
```

## Fix a UI page

1. Open the real Linear reference for the page (pick a screenshot under `spec/screenshots/` or capture fresh via Playwright MCP).
2. Compare against clone at `http://localhost:3000/<route>`.
3. Edit the component. Major surfaces:
   - Shell/sidebar: `components/app-sidebar.tsx`, `components/AppRoot.tsx`, `components/site-header.tsx`.
   - Issue list/board: `components/IssueExplorer.tsx`.
   - Issue detail: `pages/IssuePage.tsx`.
   - Projects: `components/project/*`, `pages/WorkspacePages.tsx:ProjectsPage,ProjectDetailPage`.
   - Settings: `pages/SettingsPages.tsx`.
4. Tokens/theme: `src/design-tokens.css` + `src/index.css`. Don't touch `components/ui/*` primitives.
5. Verify with Playwright MCP (`browser_snapshot` + `browser_take_screenshot`) before claiming done. See `pipeline/build/AUTONOMOUS_WORKFLOW.md` for the screenshot-before-done protocol.
6. Check console: `.playwright-mcp/console-*.log` — should be zero errors.
7. `make test-e2e` to catch regressions.

## Add a backend tool

1. `app/schema.py` — add `ArgsCls(BaseModel)` with all accepted input shapes.
2. `app/server.py` — add `def my_tool(args: ArgsCls) -> dict:` handler. Open `DBSession(engine)`, do work, call `_audit` + `_activity` if it's a mutation, commit, return dict.
3. Append tuple to `TOOL_DEFS` at `server.py:1852`: `("my_tool", "description.", ArgsCls, True)`.
4. Wire into the dispatcher block (search `server.py` for `"create_issue":` to find pattern).
5. Add test in `app/tests/test_tools.py` exercising `/step` with the tool.
6. `make validate` and `curl -s http://localhost:8030/tools | python -m json.tool | grep my_tool`.
7. If a task will depend on this tool, also add the compatibility alias (or use the canonical name in the task).

## Add a UI-triggered mutation

1. Back it with a tool (above). Every UI write must have an API equivalent.
2. Call via `callTool("tool_name", {...})` from `src/api.ts`.
3. Branch on `observation.is_error` — only mutate local state on success.
4. Stable `data-testid` on the trigger. Add row to `spec/RESEARCH.md` "Page Layout Specs" if new.
5. Add Playwright test asserting UI action → API state change.

## Add a CUA task

Full checklist in `docs/TASKS.md` §"Authoring a new task". Short version:

```bash
cp -r tasks/linear-T01-submission-review-bulk tasks/linear-T16-my-new-task
# Edit: task.toml (id, name, tags, difficulty, tools, failure_modes)
#       instruction.md (GUI-only prose)
#       tests/verify.py (CHECKS list)
#       tests/golden_apply.py (CALLS list)

# Verify determinism:
curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null
.venv/bin/python tasks/linear-T16-my-new-task/tests/verify.py     # expect 0.0
.venv/bin/python tasks/linear-T16-my-new-task/tests/golden_apply.py   # expect ok:true
.venv/bin/python tasks/linear-T16-my-new-task/tests/verify.py     # expect 1.0
```

## Add a DB table

1. `app/postgres/init.sql` — add `CREATE TABLE` with text PK, created_at/updated_at, necessary indexes.
2. Rebuild postgres image: `make down && make up`.
3. (Optional) SQLAlchemy model in `app/models.py` if you'll use ORM helpers.
4. Tool(s) exposing the table (see "Add a backend tool").
5. Seed rows in `app/seed/seed_app.py` via the tool.
6. If verifiers will read it, ensure `/snapshot` emits it too.

## Rename a tool (DO NOT)

Don't. Task goldens reference tool names directly. If you must:

1. Keep the old name as a compatibility alias in `TOOL_DEFS` with `Any` schema, routing to the new handler.
2. Update references in-tree (`app/tests/`, `tasks/*/golden_apply.py`, `app/seed/seed_app.py`) only.
3. Leave `spec/FEATURES.md` "Locked Tool Names" alone unless the rename is truly coordinated.

## Change a stable identifier (DO NOT)

Don't. `LIN-130`, `prj-api-hardening`, etc. are joined by verifiers. If you must change an id, audit every `tasks/*/tests/verify.py` grep for the old value and update in one commit.

## Build the desktop app

```bash
make desktop         # produces dmg/exe/AppImage under app/frontend/release/
make desktop-dev     # dev window against :3000
```

## Delivery gate

Before notifying Collinear (or submitting a PR that claims "done"):

- `make up` ✅
- `make seed` ✅
- `make test` ✅ (unit + e2e)
- `make validate` ✅
- `tasks/smoke_test.py` with `TASK_SMOKE_RESET_COMMAND` ✅ — every T01–T15 `0.0 → ok → 1.0`
- `make desktop` builds ✅
- `README.md`, `FEATURE_INVENTORY.md`, `QA_REPORT.md`, `LOOM_SCRIPT.md` current

## When in doubt

- Don't speculate about tool behavior — grep `server.py` for the handler.
- Don't trust README counts — re-count with `make seed` + `pytest --collect-only`.
- Don't skip pre-commit hooks. Don't `--no-verify`. Don't force-push.
- Don't edit `pipeline/`, `shared/`, `dockerfiles/` unless the task is explicitly to change methodology.
- Read `pipeline/build/context-for-AI-agent.md` for known UI traps.
