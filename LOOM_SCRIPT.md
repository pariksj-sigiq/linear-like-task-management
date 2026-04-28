# Loom Script - Linear Clone

## 0:00 - Setup

This is a Linear-style clone built for the Collinear take-home. It ships as a Dockerized web app, a FastAPI tool server, Postgres seed data, Playwright tests, and 15 CUA tasks.

Commands:

```bash
make up
make seed
make test
make validate
```

Open `http://localhost:8030`.

## 0:45 - Login And Shell

Log in with:

- `admin` / `admin`
- `sarah.connor` / `password`
- `john.smith` / `password`
- `viewer` / `password`

Show the dark Linear-style shell: sidebar, Inbox, My Issues, Views, Projects, team navigation, favorites, topbar search, and New Issue.

## 1:45 - Issue Workflows

Open My Issues or an ENG team route. Show:

- Compact issue list
- Search/filter/display controls
- List/board toggle
- Bulk selection toolbar
- Quick create modal
- Issue detail sidebar fields
- Comments, relations, and sub-issues

## 3:00 - Planning Workflows

Open Projects and a project detail page. Show project updates and linked issues.

Open a team cycle page and explain cycle metrics/burndown support in the backend.

Open Views and show saved filter routes.

## 4:00 - Utility Surfaces

Show:

- Inbox read/snooze actions
- Cmd-K command palette
- Team settings workflow states
- Roadmap, initiatives, account/workspace settings, and archive stubs

## 5:00 - Tool Server

Open:

```bash
curl http://localhost:8030/tools
curl http://localhost:8030/snapshot
```

Mention that the server exposes 118 tools, including native and compatibility aliases for issues, projects, cycles, labels, workflow states, inbox, command palette, views, comments, relations, favorites, templates, customers, reset, and snapshot.

Example tool call:

```bash
curl -X POST http://localhost:8030/step \
  -H 'Content-Type: application/json' \
  -d '{"action":{"tool_name":"search_issues","parameters":{"query":"API","limit":5}}}'
```

## 6:30 - Seed Data And Tasks

Explain deterministic seed:

- 16 users
- 5 teams
- 116 issues
- 9 projects
- 12 cycles
- Fixed `LIN-*`, `prj-*`, `cyc-*`, and notification IDs for verifiers

Show `tasks/linear-T01-*` through `tasks/linear-T15-*`. Each has instruction, golden apply, and verify scripts.

## 7:30 - Verification

Show the passing gates:

- `make seed`
- `make test` gives 16 backend tests and 7 Playwright tests passing
- `make validate` reports 118 tools
- `TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null' .venv/bin/python tasks/smoke_test.py` passes all 15 tasks with `0.0 -> 1.0`

## 8:30 - Desktop

Run or mention:

```bash
make desktop
```

This packages the same React app through Electron.
