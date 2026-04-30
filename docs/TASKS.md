# CUA Tasks

Directory: `tasks/linear-T{NN}-{slug}/`. 15 shipped tasks (T01–T15). Smoke runner: `tasks/smoke_test.py`.

## Task shape

Each task dir has exactly four files:

```
tasks/linear-TNN-slug/
├── instruction.md           GUI-only prose for the agent
├── task.toml                metadata, verifier command, env limits
└── tests/
    ├── golden_apply.py      POSTs /step calls that achieve the end state
    └── verify.py            psycopg2 SQL checks; prints JSON with `reward` 0.0 or 1.0
```

### `instruction.md`

- GUI-only. Conversational. Unnumbered. ASCII.
- Ends with: `Please complete this through the application UI only. Do not use browser developer tools, API calls, terminal commands, scripts, or direct database edits.`
- Example: `tasks/linear-T01-submission-review-bulk/instruction.md`.

### `task.toml`

```toml
version = "1.0"
[metadata]
id = "linear-TNN"
name = "..."
author_name = "Collinear AI"
category = "linear-clone"
tags = ["cua", "linear", "gui-only", "tier1", ...]
difficulty = "L2" | "L3"
difficulty_explanation = "..."
features = [...]
tools = [...]
failure_modes = [...]
[environment]
template = "cua-eval-linear-clone"
allow_internet = false
cpus = 4
memory_mb = 6144
storage_mb = 15360
[verifier]
timeout_sec = 90
command = "python tests/verify.py"
```

### `golden_apply.py`

- Reads `TOOL_SERVER_URL` (default `http://localhost:8030`).
- Defines `CALLS: list[tuple[str, dict]]`.
- Posts each to `/step`. On `observation.is_error`, prints JSON with `ok: False` and exits 1.
- Final line: `{"task_id":"linear-TNN","ok":true,"calls":N}`.

Template: `tasks/linear-T01-submission-review-bulk/tests/golden_apply.py`.

### `verify.py`

- Reads `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/cloneapp`).
- Defines `CHECKS: list[tuple[str, str]]` of (name, boolean SQL).
- Runs each with `psycopg2`. All-true → `reward: 1.0`; any false → `0.0`.
- Emits one JSON object on stdout: `{"task_id","reward","checks"}`.

Verifiers should:

- Join against stable identifiers (usernames, `LIN-*`, `prj-*`, `cyc-*`).
- Include distractor assertions (e.g. "LIN-133 is NOT Ready for QA") so bulk ops can't score by mutating everything.
- Check `activity_events` / `audit_log` when the task requires a specific bulk verb was used.

## Task matrix

From `spec/TASK_PLAN.md`:

| ID | Dir | Failure mode | Difficulty | Summary |
|---|---|---|---|---|
| T01 | `submission-review-bulk` | Bulk selective | L3 | LIN-130/131/132 → Ready for QA, label Submission, comment |
| T02 | `tool-coverage-subissues` | Multi-step | L3 | LIN-104 gets 3 named sub-issues assigned Maya |
| T03 | `relation-cleanup` | Self-referential | L2 | LIN-121 blocked_by LIN-087, LIN-122 duplicates LIN-087, comments |
| T04 | `reviewer-handoff` | Mode confusion | L2 | LIN-099 reassign Sam + In Progress + Reviewer label |
| T05 | `project-risk-update` | Wrong column | L2 | prj-api-hardening → at_risk + project update |
| T06 | `cycle-scope-rebalance` | Data-dependent | L3 | LIN-140/141 move W18→W19 + scope comment |
| T07 | `saved-view-tooling-risk` | Deep nav | L2 | Alex owns saved view with specific filter set |
| T08 | `inbox-blocker-cleanup` | Data-dependent | L3 | Non-blocker unread → read+archived; blockers untouched |
| T09 | `command-palette-reassign` | Deep nav | L2 | LIN-077 via palette: assign Maya + In Review + comment |
| T10 | `label-state-hygiene` | Mode confusion | L2 | Regression label (red) + Ready for QA state + label apply |
| T11 | `taskqa-bulk` | Bulk selective | L3 | LIN-150/151/152 → high + Taylor + W18 |
| T12 | `project-update-from-comments` | Data-dependent | L3 | CUA Task Pack update summarizes 3 escalation comments, at_risk |
| T13 | `board-column-correction` | Wrong column | L2 | LIN-160→In Review (LIN-161 stays), relation LIN-160↔LIN-087 |
| T14 | `create-linked-submission-issue` | Multi-step | L3 | New issue under LIN-170, assigned Priya, labels, link LIN-171 |
| T15 | `my-issues-priority-pass` | Multi-step | L3 | Alex's 3 active issues reprioritized + commented + 1 inbox read |

## Smoke runner

```bash
.venv/bin/python tasks/smoke_test.py              # all tasks
.venv/bin/python tasks/smoke_test.py T03 T14      # subset by id/slug fragment
.venv/bin/python tasks/smoke_test.py --negative-only
.venv/bin/python tasks/smoke_test.py --positive-only

# With fresh seed between tasks:
TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && make seed >/dev/null' \
  .venv/bin/python tasks/smoke_test.py
```

Expected output per task: negative verify `0.0`, golden apply `ok:true`, positive verify `1.0`. All 15 currently pass per `QA_REPORT.md`.

## Authoring a new task

1. Pick a failure mode from `spec/TASK_PLAN.md` §1 that isn't already over-represented.
2. Design golden DB end-state first. Identify distractors that must NOT change.
3. Confirm the seed already makes the answer unique. If not, patch `seed_app.py` — then fix-up existing verifiers if you change shared records.
4. Copy an existing task dir as template.
5. Write `instruction.md` as if a coworker is asking for the change. GUI-only closing line.
6. Write `verify.py` `CHECKS` covering: (a) target end-state, (b) distractors unchanged, (c) any activity/audit trail requirement.
7. Write `golden_apply.py` `CALLS` that pass `verify.py`.
8. Run smoke: reset+seed → `verify.py` should be `0.0` → `golden_apply.py` `ok:true` → `verify.py` `1.0`.
9. Task auto-discovered by `smoke_test.py` glob (`tasks/linear-T*-*`).

## Difficulty calibration (summary — see `pipeline/qa/mirrors/cua-clone-apps-taskgen.md` for full)

- **L1**: single-record CRUD. Avoid for real tasks.
- **L2**: 2–3 mutations, may require a non-obvious filter or deep-nav.
- **L3**: multi-step, bulk-with-distractors, self-referential relations, or reasoning over comments/activity.

Forbidden per `spec/TASK_PLAN.md` §1:

- Plain single-record CRUD.
- Date-range-only filters.
- Summary text matching instead of final DB state.
- Partial credit.

## Tool name stability

Golden scripts reference tool names directly. Do not rename a locked tool; add a compatibility alias in `TOOL_DEFS` instead. Locked list: `spec/FEATURES.md` "Locked Tool Names".
