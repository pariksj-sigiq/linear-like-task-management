# Docs Index — Linear Clone

New agent? Start at `AGENT_GUIDE.md`. Rest are deep dives.

| Doc | Use when |
|---|---|
| [`AGENT_GUIDE.md`](./AGENT_GUIDE.md) | First read. Repo shape, start commands, hard rules, common traps. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Process topology, request flow, layers, extension points. |
| [`BACKEND.md`](./BACKEND.md) | FastAPI endpoints, tool registry, schemas, audit/activity, adding a tool. |
| [`FRONTEND.md`](./FRONTEND.md) | React shell, routing, major pages/components, API client, data-testids. |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Postgres tables, views, enums, stable seed identifiers. |
| [`TASKS.md`](./TASKS.md) | CUA task shape, matrix T01–T15, smoke runner, authoring a new task. |
| [`TESTING.md`](./TESTING.md) | Unit + e2e + MCP contract tests, how to run, conventions. |
| [`WORKFLOW.md`](./WORKFLOW.md) | Daily recipes: fix UI, add tool, add task, add table, delivery gate. |
| [`HISTORY.md`](./HISTORY.md) | Commit-by-commit build history and uncommitted working-tree state. |

Related (not in this folder):

- `README.md` (repo root) — Linear Clone Delivery Notes + full SaaS clone playbook.
- `spec/FEATURES.md`, `spec/RESEARCH.md`, `spec/SYSTEM_PLAN.md`, `spec/TASK_PLAN.md` — implementation contract.
- `FEATURE_INVENTORY.md` — feature → tool → UI → seed → task map.
- `QA_REPORT.md`, `SETTINGS_QA_REPORT.md` — health reports.
- `LOOM_SCRIPT.md` — demo walkthrough script.
- `pipeline/README.md` — build + QA methodology entry point.

## When docs disagree

Order of truth (highest first):

1. Current code (`git diff HEAD` first — working tree has major uncommitted changes).
2. `spec/FEATURES.md` and `spec/SYSTEM_PLAN.md` for contract (tool names, table fields, seed ids).
3. `docs/*` (this folder) for orientation.
4. `README.md` root for setup + delivery checklist.
5. `pipeline/*` for methodology.

Seed counts drift — recount with `make seed` before quoting. See `HISTORY.md` §"Seed-count drift".
