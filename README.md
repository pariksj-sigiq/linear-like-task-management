# Linear Clone Delivery Notes

This checkout implements a Linear-style SaaS clone for the Collinear take-home assessment.

## Quick Start

```bash
make up
make seed
make test
make validate
```

Then open `http://localhost:8030`.

## Login Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Admin |
| `sarah.connor` | `password` | Standard |
| `john.smith` | `password` | Standard |
| `viewer` | `password` | Viewer |
| `alex.rivera` | `password` | Task fixture admin |

## Implemented Features

- Linear-style light workspace shell with sidebar, team nav, My Issues activity board, quick create, and account footer.
- Issue list and board view with filters, display controls, bulk updates, labels, state, assignee, project, cycle, comments, relations, and sub-issues.
- My Issues, Inbox, saved Views, Projects, Project detail/updates, Cycles, Team settings, Command palette, Roadmap, Initiatives, Account/Workspace settings, and Archive routes.
- FastAPI `/step` tool server with 118 tools, `/tools`, `/reset`, and `/snapshot`.
- Postgres schema and deterministic seed data with 16 users, 5 teams, 116 issues, 9 projects, and 12 cycles.
- Self-referential workspace data: seeded Linear issues/projects describe the actual clone-build plan, QA pass, task authoring, and submission packaging work.
- 15 CUA tasks under `tasks/linear-T*/`, each with `instruction.md`, `golden_apply.py`, and `verify.py`.
- Docker web app plus Electron desktop packaging.

## Useful Commands

```bash
# Rebuild and start the stack
make up

# Reset DB by API, then reseed
curl -sf -X POST http://localhost:8030/reset >/dev/null
make seed

# Run backend + Playwright tests
make test

# Run all CUA task smoke checks
TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null' \
  .venv/bin/python tasks/smoke_test.py

# Build the Electron desktop app
make desktop
```

## Verification Snapshot

Verified locally:

- `make up`: pass
- `make seed`: pass, 118 tools available
- `make test`: pass, 16 backend tests and 7 Playwright tests
- `make validate`: pass, 118 tools counted
- CUA task smoke: T01-T15 all pass `0.0 -> golden -> 1.0`

See [QA_REPORT.md](/Users/pariksj/Desktop/saas-clone/QA_REPORT.md), [FEATURE_INVENTORY.md](/Users/pariksj/Desktop/saas-clone/FEATURE_INVENTORY.md), and [LOOM_SCRIPT.md](/Users/pariksj/Desktop/saas-clone/LOOM_SCRIPT.md).

---

# SaaS Clone Dev Instructions

A step-by-step guide for building a functional SaaS clone (Salesforce, Zendesk, HubSpot, etc.) that integrates with Collinear's rl-gym agent evaluation framework.

## Why We're Building This

These clones are **training environments for AI agents**. We put an AI model (e.g. GPT-5.4, Claude) inside a sandbox with one of these clone apps and measure how well it performs real tasks — creating accounts, resolving support tickets, navigating dashboards. Every mistake the agent makes becomes training data that AI labs use to improve the next generation of models.

The clones need to look and behave like the real apps because the agents interact with them the same way a human would — through the UI (via Playwright) and through API calls. If the clone is too different from the real app, the training data is useless.

## Interview Test

If you're going to work one this, pick any of the apps from the list below to build your clone.

[Link to list](https://docs.google.com/spreadsheets/d/1fL_7cK_U0hB_UT8TYjt0dEIr4ZOWEGwuFjK4G3CxR_8)

Build it by following this playbook. We're evaluating: UI fidelity to the real app, feature coverage, test quality, and how well you follow the template conventions.

Once finished, send the project as a zip along with a link to the loom video (5 - 10 min) going through the app and its features.

## What You're Actually Building

You're building a **Docker-packaged environment** that an AI agent interacts with through both the UI and an HTTP tool server. Every operation must work through **both** the React UI (for Playwright browser automation) **and** the API (`POST /step` with tool calls). These are not separate features — both access modes are required for every operation.

The three consumers of your clone:

- **Agent via tool server** — calls `POST /step` with structured tool calls
- **Agent via Playwright** — clicks through the React UI in a browser
- **Verifier** — queries Postgres directly to score the agent's performance

**Note:** The MCP tool server layer (wrapping your API for the rl-gym agent framework) will be handled internally by the Collinear team. You do not need to build MCP integration — just implement the `POST /step` API as documented below.


## Quick Start

```bash
# Build and start everything
make up

# Seed the database
make seed

# Verify it works
curl http://localhost:8030/health
curl http://localhost:8030/tools | python3 -m json.tool
curl -X POST http://localhost:8030/step \
  -H 'Content-Type: application/json' \
  -d '{"action": {"tool_name": "search_items", "parameters": {}}}'

# Run tests
make test

# Validate your repo structure before delivery
make validate
```

## AI Handoff Contract

If you are handing this template to an AI orchestrator to build a clone end-to-end, the contract is:

1. **Clone** `collinear-ai/clone-template` locally (or have the AI clone it).
2. **Open** `pipeline/build/ORCHESTRATOR_BRIEF.md` and replace the three placeholders:
   - `{{APP_NAME}}` (e.g. `Google Docs`)
   - `{{APP_URL}}` (e.g. `https://docs.google.com`)
   - `{{APP_CREDENTIALS}}` (real login that can reach the app's internal surfaces)
3. **Paste** the filled-in brief into an AI environment that has:
   - Filesystem access to the cloned repo (Cursor agent, Claude Code, Codex, etc.)
   - **Playwright MCP server** wired in (`mcp__playwright__browser_*` tools available — `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_hover`, `browser_click`, `browser_press_key`, `browser_tabs`, `browser_type`). Static screenshot comparison alone will not pass Phase 4.
   - Tab A already logged into the real app at `{{APP_URL}}`
4. **Phase 0 bootstrap** runs automatically — the AI verifies it can read every reference file, drive a browser, and reach Tab A. If any precondition fails, it stops and escalates rather than improvising.
5. **Phases 1 → 6** run end-to-end with hard checkbox gates between each:
   - Phase 1 writes `spec/RESEARCH.md` + `spec/FEATURES.md` (+ screenshots to disk)
   - Phase 2 writes `spec/TASK_PLAN.md` (failure-mode-first) + the system plan
   - Phase 3 spawns subagents (frontend, backend, seed, tests, CUA tasks)
   - Phase 4 judges UI fidelity (state matrix) and task fidelity (smoke tests)
   - Phase 5 validates (`make test`, `make validate`, `make desktop`, smoke tests)
   - Phase 6 commits locally for you to review

The brief is the single entry point — you do not paste `SWARM_PLAN.md`, `TASK-PROCESS.md`, or any other doc separately. The brief loads its siblings by path and tells the AI to do the same.

## Directory Structure

```
clone-template/
├── README.md                    # This file (the playbook)
├── Makefile                     # build, seed, test, lint, validate
├── docker-compose.dev.yml       # Local dev: postgres + app + seed
│
├── spec/                        # Per-run scope + research outputs (Phase 1/2)
│   ├── FEATURES.md.example      # Template — copy to spec/FEATURES.md in Phase 1
│   ├── RESEARCH.md.example      # Template — copy to spec/RESEARCH.md in Phase 1
│   ├── TASK_PLAN.md.example     # Template — copy to spec/TASK_PLAN.md in Phase 2
│   └── screenshots/             # Phase 1 writes reference PNGs here
│
├── pipeline/                    # Methodology — pipeline protocol (read, do not edit per run)
│   ├── ORCHESTRATOR_BRIEF.md    # ENTRY POINT — paste this to your AI
│   ├── SWARM_PLAN.md            # 6-phase pipeline
│   ├── AUTONOMOUS_WORKFLOW.md   # Fidelity loop
│   ├── TASK-PROCESS.md          # CUA task generation methodology
│   └── context-for-AI-agent.md  # Common UI bugs + lessons
│
├── skills/                      # Methodology — skill templates (read, do not edit per run)
│   ├── taskgen-SKILL.md         # Generic CUA task generation skill
│   └── accounting-example-SKILL.md  # Worked example (domain skill)
│
├── shared/                      # DO NOT EDIT — shared utilities and components
│   ├── seed_runner.py           # wait_for_health(), call_tool(), verify_seed()
│   ├── test_helpers.py          # ToolServerClient, assertion helpers
│   └── components/              # React components (AppShell, DataTable, etc.)
│
├── app/                         # YOUR CODE GOES HERE
│   ├── server.py                # FastAPI tool server
│   ├── models.py                # SQLAlchemy models
│   ├── schema.py                # Pydantic schemas for tool args
│   ├── postgres/init.sql        # Database schema
│   ├── seed/seed_app.py         # Seed script
│   ├── seed_data/*.json         # Seed data fixtures
│   ├── frontend/                # React app (Vite + TypeScript + Tailwind)
│   └── tests/                   # Unit + Playwright tests
│
└── dockerfiles/                 # DO NOT EDIT — Docker build configs
```

## Stack

- **Backend:** FastAPI + SQLAlchemy + Postgres
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Desktop:** Electron (wraps the React app as a native desktop window)
- **Auth:** Fake user system with login page, roles, and session management (no real auth provider)
- **Testing:** pytest + Playwright (works with both web and Electron)
- **Packaging:** Docker (3 images: app, postgres, seed) + Electron (.dmg / .exe / .AppImage)

**Desktop app:** Every clone ships as both a web app (Docker) and a desktop app (Electron). The React frontend is identical — Electron just wraps it in a native window. Agents interact via Playwright (Electron has native Playwright support) or Claude Computer Use (sees the real desktop window).

**Expo/mobile note:** The frontend uses clean separation between UI components and business logic. The API layer, types, and state management can be ported to React Native / Expo later — only the UI components need rewriting.

## Timeline

Expected build time: **1-2 days per app** once you're familiar with the template. The first app may take longer as you learn the workflow.

---

## Authentication & User Management

Every clone must include a working auth system. Enterprise SaaS apps are role-based — the clone should reflect that.

### What to build

- **Login page** — styled to match the target app's login screen (100% fidelity)
- **Users table** in Postgres with seeded users (e.g. `admin`, `sales_rep`, `manager`, `viewer`)
- **Roles/permissions** — at minimum: admin (full access), standard user (CRUD on own records), read-only viewer
- **Session management** — simple token/cookie-based session so Playwright can log in and stay logged in
- **User context** — the current logged-in user should appear in the topbar, and record `owner` fields should default to the logged-in user

### What NOT to build

- No real OAuth/SSO — just username/password against the users table
- No email verification or password reset
- No complex RBAC — 2-3 roles is enough

### Seeded users

The seed script should create at least these users:

| Username | Password | Role | Purpose |
|---|---|---|---|
| `admin` | `admin` | Admin | Full access, system configuration |
| `sarah.connor` | `password` | Standard | Sales rep / primary user |
| `john.smith` | `password` | Standard | Second user for assignment/transfer tests |
| `viewer` | `password` | Read-only | Can browse but not create/edit |

---

## Step 1: Feature Research (20+ features)

Before deciding what to build, catalog every major feature in the real app.

### Research process

1. Open the real app in Cursor's browser, screenshot the main navigation
2. Click into every top-level nav item and screenshot each page
3. For each page, note: page type (list, detail, form, dashboard), key actions, data shown
4. Test interactive states: open dropdowns, hover nav items, click filters — screenshot each
5. Search "[App Name] most used features" for product docs and user surveys
6. Compile a ranked list of 20+ features ordered by usage frequency

### Tier the features

- **Tier 1 (10-15 features)**: Full implementation — backend tools + CRUD UI + seed data + unit tests + Playwright tests + verifiers
- **Tier 2 (5-10 features)**: UI stubs only — page renders with realistic seed data, navigation works, but mutations are limited or read-only

**"Rich" features, not just CRUD:** Tier 1 must include features beyond basic create/read/update/delete. Think dashboards with charts, reports with filters and exports, workflow automations, approval chains, status transitions, assignment rules, bulk operations, and search with faceted filters. If every feature is just a list + form, the clone won't feel like the real app.

**Why tier:** If a Playwright agent navigates to a page that 404s, the illusion breaks. Tier 2 stubs prevent that.

### Output

Copy `spec/FEATURES.md.example` to `spec/FEATURES.md` and fill in your 20+ features with their tier, page types, and (for Tier 1) tool names and DB tables.

---

## Step 2: Database Schema (`app/postgres/init.sql`)

Design the minimum tables needed for Tier 1 features.

Rules:
- Every table gets `id` (text PK), `created_at`, `updated_at`
- Use text PKs like `acc_001`, `con_001` — easier for agents and verifiers than UUIDs
- Foreign keys between related entities (contact → account, opportunity → account)
- Add `owner` field on key entities (for assignment-based tasks)
- Include an `audit_log` table for verifiers to trace what happened
- Tier 2 features that need seeded data get their own tables too, but simpler

---

## Step 3: Tool Server (`app/server.py`)

The skeleton has 2 example tools. Replace them with your app's 30-50 tools.

### HTTP contract

- `GET /health` → `{"status": "healthy"}`
- `GET /tools` → `{"tools": [...]}`
- `POST /step` → receives `{"action": {"tool_name": "...", "parameters": {...}}}`, returns `{"observation": {"is_error": bool, "text": str, "structured_content": ...}, "reward": null, "done": false}`
- `POST /reset` → wipes DB (seed must be re-run)
- `GET /snapshot` → dumps current DB state as JSON

### Tool definition pattern

```python
TOOLS = [
    {
        "name": "create_account",
        "description": "Create a new account.",
        "input_schema": CreateAccountArgs.model_json_schema(),
        "mutates_state": True,
    },
]
```

Each tool gets a Pydantic Args model in `schema.py` and a handler function in `server.py`.

---

## Step 4: React Frontend (100% UI Fidelity)

The frontend is a **first-class deliverable** — it must be indistinguishable from the real app at a glance.

### Tooling

- **Vite + React + TypeScript + Tailwind CSS** (already set up)
- **Claude Computer Use** for the closed-loop build cycle
- **Shared components** in `shared/components/` (AppShell, DataTable, RecordDetail, FormLayout, SearchBar, Modal) — customize with `design-tokens.css`, don't edit the components

### Build per feature

- **List view** — data table matching the real app's columns, search bar, filters, pagination
- **Detail view** — same field layout (two-column? tabs?), related lists, activity timeline
- **Create/Edit form** — same field order, input types, validation
- **Empty states** — screenshot the real app's empty pages and replicate

### Rules

- **Every tab, button, and link visible on screen must be clickable and render a page.** No dead links, no tabs that go nowhere. If the real app shows 6 tabs on a repo page (Code, Issues, Pull Requests, Actions, Wiki, Settings), all 6 must be clickable and show content — even if it's a Tier 2 stub with placeholder text. A Playwright agent that clicks a tab and gets nothing will fail the task.
- Every interactive element needs `data-testid` attributes for Playwright
- Every tool operation must be triggerable from the UI
- Navigation must work with URL routing (React Router)
- Loading and error states must exist

---

## Step 5: Seed Data

Seed data lives in `app/seed_data/*.json`. The seed script (`app/seed/seed_app.py`) reads these and calls `POST /step` against the tool server.

Rules:
- Seed through the tool server API (not direct SQL) — validates the tools work
- Use deterministic data (fixed names/dates, not random)
- Aim for 50-200 records across all tables
- Seed logic must be idempotent (safe to rerun)

---

## Step 6: Docker Packaging

Three images are pre-configured in `dockerfiles/`. They work without modification.

- `Dockerfile.app` — multi-stage: builds React, runs FastAPI
- `Dockerfile.postgres` — postgres:16 with your init.sql
- `Dockerfile.seed` — runs the seed script

---

## Step 7: Tests

**Unit tests** (`app/tests/test_tools.py`):
- Call every tool and assert the response structure
- Test edge cases: duplicate creation, missing records, invalid parameters
- Test `/reset` clears data
- Test `/snapshot` returns expected structure

**Playwright tests** (`app/tests/e2e/`):
- Navigate to each page, verify elements render
- Complete each CRUD flow through the UI
- Use `data-testid` attributes for selectors

---

## Step 8: Verification Pattern

Verifiers query Postgres directly to score agent performance:

```python
def verify(db_url: str, expected: dict) -> float:
    with psycopg.connect(db_url) as conn:
        row = conn.execute(
            "SELECT * FROM opportunities WHERE account_id = %s AND stage = %s",
            (expected["account_id"], expected["stage"])
        ).fetchone()
    if row and row["amount"] >= expected["min_amount"]:
        return 1.0
    return 0.0
```

This is the reason for building clones: verification is a simple SQL query against a schema you control.

---

## Build Order

1. **Design research** — Computer Use: screenshot real app, extract design tokens → `design-tokens.css`
2. **Feature research** — Catalog 20+ features, tier them → `spec/FEATURES.md`
3. **Schema** — `init.sql` for Tier 1 + Tier 2 tables
4. **Tool server** — `server.py` with all Tier 1 tools
5. **Seed data** — JSON fixtures + seed script (Tier 1 + Tier 2)
6. **React frontend** — Computer Use closed loop. App shell → Tier 1 pages → Tier 2 stubs
7. **Docker images** — `make up && make seed` to verify
8. **Desktop app** — `make desktop` to build the Electron .dmg/.exe, verify it launches
9. **Unit tests** — every Tier 1 tool
10. **Playwright tests** — every Tier 1 UI flow (web and/or Electron)
11. **Validate** — `make validate` must pass before delivery

## Local Dev Loop

```bash
# Option A: Docker (recommended for web)
make up        # builds + starts postgres + app
make seed      # seeds database
make test      # runs all tests

# Option B: Desktop app (Electron)
make up        # backend still runs in Docker
make desktop-dev  # launches Electron pointing at localhost:3000
# or
make desktop   # builds .dmg/.exe/.AppImage in app/frontend/release/

# Option B: Manual (for hot reload)
# Terminal 1: Postgres
docker run --name dev-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cloneapp -p 5432:5432 postgres:16

# Terminal 2: Backend (hot reload)
make dev-backend

# Terminal 3: Frontend (hot reload)
make dev-frontend

# Terminal 4: Seed
TOOL_SERVER_URL=http://localhost:8030 python app/seed/seed_app.py
```

## Acceptance Criteria

Every clone must meet these requirements:

1. **Working database** — seeded and accessible both via GUI (React UI) and programmatically (`POST /step`)
2. **Authentication** — login page, seeded users with roles, session management
3. **10-15 rich Tier 1 features** — not just CRUD; includes dashboards, reports, workflows, etc.
4. **5-10 Tier 2 stub features** — read-only pages so navigation never 404s
5. **100% visual fidelity** — the clone should be indistinguishable from the real app at a glance
6. **Every operation works via BOTH** the UI and the API — no API-only or UI-only features
7. **Extensive unit tests** — every Tier 1 tool tested, including edge cases
8. **Playwright browser tests** — every Tier 1 CRUD flow tested end-to-end through the UI
9. **50-200 seeded records** — realistic, deterministic data across all tables

## Delivery Checklist

Before notifying Collinear that your clone is ready:

- [ ] `spec/FEATURES.md` filled in with 20+ features, tiered
- [ ] `design-tokens.css` has real values from the target app
- [ ] Login page works with seeded users (`admin`/`admin`, `sarah.connor`/`password`, etc.)
- [ ] All Tier 1 tools implemented and working via both API and UI
- [ ] Tier 1 includes rich features (dashboards, reports, workflows — not just CRUD)
- [ ] Seed data creates 50-200 realistic records
- [ ] Frontend matches target app at 100% visual fidelity
- [ ] All Tier 2 stub pages render (no 404s in navigation)
- [ ] `make desktop` builds the Electron app successfully
- [ ] Desktop app launches and renders the clone correctly
- [ ] `make test` passes (unit + Playwright)
- [ ] `make validate` passes
