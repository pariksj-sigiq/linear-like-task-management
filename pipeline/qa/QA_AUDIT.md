# QA Audit Process — Post-Build Bug Hunting

How to find the *real* bugs that cause CUA tasks to silently fail on a finished
clone. Run this after `pipeline/build/ORCHESTRATOR_BRIEF.md` finishes shipping
an app and before the clone gets added to an eval batch.

This process was reverse-engineered from the Asana + GitHub reviews that Adit
did by hand. It catches the class of bugs that task-level verifiers cannot:
UI gaps, optimistic-mutation races, and silent backend failures that look like
agent error in the trace.

---

## Document contract

This file is one of three that must stay in sync:

- `pipeline/qa/QA_AUDIT.md` (this file) — the methodology. Owns: bug class
  catalog, 4+1 phases, report schema, Task Impact schema, changelog.
- `pipeline/qa/QA_AUDIT_PROMPT.md` — the ready-to-paste subagent prompt. Owns:
  exact instructions + placeholders + output contract.
- `pipeline/qa/QA_FIX_PROCESS.md` — what to do *after* the audit finds bugs.
  Owns: triage rubric, sequential rollout rules, fix-PR template, re-audit
  gate. Reads the Task Impact + Recommended Fixes sections of the report.

If you change the bug catalog, a phase, or the report schema in this doc,
update the prompt and the fix process in the same commit.

---

## When to run

Run a QA audit when **any** of these are true:

1. A clone has just gone through `pipeline/build/ORCHESTRATOR_BRIEF.md` and is about to be
   handed to a task-author or eval batch.
2. CUA tasks on a clone fail in suspicious patterns (e.g., title/name lands
   but later fields don't, or same verifier check fails on three agents).
3. A bug report arrives that sounds like "agent did it but it didn't save" —
   that is almost always a silent-failure or race, not an agent error.
4. Before cutting a new eval, as a blocking gate.

Do **not** run it speculatively on a clone that has no tasks yet — the report
will be full of gaps that don't matter because no task touches that surface.

---

## The bug classes this process targets

These six classes cover ~100% of the post-build bugs we have hit so far.
Anything outside them is usually caught by the per-task verifier or by manual
QA during build.

| Class | What it looks like | Example |
|-------|-------------------|---------|
| **UI gap** | A tool/feature exists on the backend but has no way to reach it from the UI. Agent cannot complete the task no matter how smart it is. | Asana `TaskDetailPane` with no subtask composer; GitHub deploy-keys endpoint with no settings panel. |
| **UI mislabel** | A UI control claims to do X but actually calls the tool for Y. Agent clicks the right thing, gets the wrong result. | Asana "Invite collaborators" button that actually reassigned the task. |
| **TempId race** | Frontend mints a client-side temporary ID, fires an async create, and immediately calls a follow-up mutation with the temp ID before the real ID comes back. Backend 404s silently. | Asana `store.ts` `addTask` → `updateTask` within the response-latency window. |
| **Unchecked optimistic** | `await callTool(...)` succeeds at the HTTP layer but returns `observation.is_error: true`. Frontend ignores the flag and shows the optimistic update anyway. User thinks the write landed. | GitHub 22 mutations across 5 files with `await callTool(...)` and no `is_error` check. |
| **Silent catch** | `.catch(() => {})`, `.catch(() => defaultShape)`, or empty `try/catch` that swallows an error without surfacing it in dev mode. | Fire-and-forget mutations in Asana `store.ts:117,137`. |
| **Forensic-replay mismatch** | Agent trace shows the right actions, task passes at UI level, but verifier fails — usually because the verifier asserts on a different row/ID than the UI wrote to. | Seed-drift between task setup and verify. |

Each class has a dedicated phase below.

---

## The 4+1 phases

The audit runs in six phases. Phase 0 and 1.5 are one-shot prep; 1–4 produce
findings; each phase is gated on the prior one so a subagent can fail cleanly.

### Phase 0 — Error contract discovery (prep, not findings)

Before hunting bugs, document how the app's API client is *supposed* to handle
errors. Every later phase is judged against this contract.

Capture in the report:

- The API client function name and path (e.g., `src/api/client.ts:callTool`).
- What it does on HTTP non-2xx: throws, returns shape, silently fails?
- What it does when the response body has `is_error: true`: throws, surfaces,
  ignores?
- What it does on network error / timeout.
- Whether callers are expected to check `is_error` themselves, or whether the
  client already throws for them.

If the contract is "callers must check `is_error`", every unchecked caller is
a finding. If the contract is "client throws on `is_error`", then unchecked
callers are fine and the real risk is unhandled promise rejections.

**Without Phase 0 the audit will either over-report or under-report Phase 3
silent failures.**

### Phase 1.5 — UI reachability map (prep, not findings)

Before walking the UI, statically list every backend write tool and map it to
the UI control that can trigger it. Do it by cross-referencing:

- The backend tool registry (`app/server.py` `TOOLS` list or equivalent).
- All `callTool(...)` / `fetch('/step'...)` call sites in the frontend.
- The router config (what pages exist at all).

A tool that appears in the registry and in a call site but whose call site is
unreachable (no route, component never mounted, button hidden behind dev flag)
is a **UI gap** — report it in Phase 1 even if the happy path "works".

This phase is what catches the Asana subtask-composer gap and the GitHub
`RepoBranches.tsx` unmounted-component gap. Task authors cannot find these
without it because they write tasks assuming the feature works.

### Phase 1 — UI walkthrough

Open the clone in a browser (use the canonical port from
[`clone-ports.md`](../PORTS.md) at the clone root, or the master table below)
and walk the top 3–5 task surfaces end-to-end. For each surface:

1. Can the agent *see* the control? (→ UI gap if no)
2. Does the control's label match its action? (→ UI mislabel if no)
3. Does the control produce a visible confirmation on success? (→ see Phase 3)
4. Does the control produce a visible error on failure? (→ see Phase 3)

Take screenshots for every blocking gap. Pair each with the tool name the
control *should* trigger and the component path.

### Phase 2 — Optimistic-mutation audit (static)

Grep the frontend for the two race patterns:

- **TempId race.** Search for client-side ID generation patterns:
  `` `${prefix}${Date.now()}` ``, `uuid()` called before a `create_*` tool,
  or any ID that is assigned locally and then passed to `callTool` before the
  create's response arrives. Trace every mutation function in the store /
  reducer / mutation layer and confirm it either:
  a. awaits the real ID before follow-up calls, OR
  b. uses a resolveId-style helper that waits on a pending-resolution map.
- **Unchecked optimistic.** Grep every `await callTool(...)` and check
  whether the caller branches on `observation.is_error` / `result.ok` /
  whatever the Phase 0 contract says. If not, it's a silent write.

For each finding, report:

- File:line of the mutation call.
- Whether it's `tempid_race` or `unchecked_optimistic`.
- Which tool is involved (e.g., `update_task`).
- Blast radius (how many UI actions route through this mutation).

This phase is *static* — no browser, no runtime. It is the fastest way to
find the Asana-class bug without reproducing it.

### Phase 3 — Silent-failure scan (static)

Grep the frontend and backend glue code for swallowed errors:

- `.catch(() => {})`
- `.catch(() => <literal default>)`
- Empty `try { ... } catch {}` or `catch (_)` with no logging
- `await` followed by no check on the returned value (if Phase 0 contract
  says callers must check)
- Promise chains that use `.then` without `.catch` and are not awaited

Group findings by *file*, not by *line*, so a file with 22 identical
violations shows up as one finding with count 22, not 22 findings. Include
the call-graph root (which UI action triggers this file) so task authors know
what to expect.

### Phase 4 — Forensic replay (runtime, optional)

If prior failed task runs exist (agent transcripts + verifier outputs), load
them and diff the agent's final DB writes vs. the verifier's expected DB
state. Look for:

- Writes that went to the wrong ID (tempId race signature).
- Writes that never happened (silent catch signature).
- Writes that happened but to a row the verifier doesn't read from (seed
  drift or verifier bug).

Skip Phase 4 if no failed runs exist yet. It is high-signal but requires
artifacts that the audit itself does not produce.

---

## Report schema

Every audit produces a single file: `QA_REPORT.md` at the clone's repo root.

Required sections, in order:

1. **Summary** — one paragraph + a traffic-light health rating
   (green / yellow / red) + counts per bug class.
2. **Phase 0 — Error contract** — the contract the later phases are judged
   against.
3. **Phase 1.5 — UI reachability map** — table of backend tool →
   frontend caller → route → status (reachable / gap / mislabeled).
4. **Phase 1 — UI walkthrough** — one finding per gap/mislabel, with
   screenshot path and component path.
5. **Phase 2 — Optimistic-mutation audit** — one finding per race, grouped.
6. **Phase 3 — Silent-failure scan** — findings grouped by file, counted.
7. **Phase 4 — Forensic replay** — findings or "skipped: no prior runs".
8. **Task Impact** — cross-reference of findings against existing tasks
   in `tasks/`. See schema below.
9. **Recommended fixes** — prioritized P0 / P1 / P2, each with a one-line
   suggested change and the file to touch. Link to the fix workflow in
   `pipeline/qa/QA_FIX_PROCESS.md`.
10. **Prompt calibration feedback** — what the subagent wishes the prompt
    had told it. Feeds the next version of `QA_AUDIT_PROMPT.md`.

Keep the report under 500 lines. If it's longer, the subagent is
over-reporting — tighten the phase definitions.

### Task Impact section schema

One row per existing task in `<CLONE_PATH>/tasks/` that touches a flagged
surface. Columns:

| Column | Meaning |
|--------|---------|
| `task` | Folder name (e.g. `gh-open-pr-review-cycle`). |
| `touches` | Surfaces the task interacts with (e.g. `Settings / Deploy keys`, `PR sidebar`). |
| `findings` | Finding IDs from this report (e.g. `P1 #2`, `P3 #5`). |
| `impact` | One of: `blocked` (task cannot pass on current clone), `degraded` (task may pass but asserts around bug), `at_risk` (race may intermittently fail), `unaffected`. |
| `action` | One of: `hold new runs`, `re-run after fix #N`, `no-op`. |

If `tasks/` is empty or missing, write `No existing tasks — section N/A`.
This section is the hand-off surface between the audit and the task authors:
anyone writing new tasks reads this before picking a surface (see
`pipeline/qa/TASK-PROCESS.md` § "Phase -1").

---

## How to run

1. Confirm the clone is up and reachable at its canonical port
   (see master port table below).
2. Copy the full contents of `pipeline/qa/QA_AUDIT_PROMPT.md`.
3. Fill in the placeholders at the top of the prompt:
   - `<CLONE_NAME>` (e.g., "Notion")
   - `<CLONE_PATH>` (absolute path to the clone checkout)
   - `<CLONE_FRONTEND_URL>` (from the ports table)
   - `<CLONE_BACKEND_URL>` (from the ports table)
4. Spawn one subagent per clone with the filled-in prompt. Run in parallel —
   audits are fully independent.
5. Collect `QA_REPORT.md` from each clone repo root.
6. Hand each report off to the fix workflow: see
   `pipeline/qa/QA_FIX_PROCESS.md`. Sequential rollout, one clone at a time,
   one PR per clone. Do not run fixes in parallel.
7. Before writing any new task on a clone, read its latest `QA_REPORT.md`
   Task Impact section (see `pipeline/qa/TASK-PROCESS.md` § "Phase -1").
8. Fold every prompt-calibration feedback item into the next version of
   `QA_AUDIT_PROMPT.md` (bump the version in the changelog below).

---

## Canonical port table

The prompt needs `<CLONE_FRONTEND_URL>` and `<CLONE_BACKEND_URL>`. These are
the host ports after the canonical remap. Each clone also has its own
`PORTS.md` at the repo root.

| Clone       | Backend | Frontend (Vite) | Postgres |
| ----------- | ------: | --------------: | -------: |
| Sheets      |    8030 |            3008 |     5432 |
| GitHub      |    8050 |            3001 |     5440 |
| Asana       |    8031 |            3002 |     5435 |
| Zendesk     |    8051 |            3003 |     5441 |
| Notion      |    8040 |            3004 |     5436 |
| Slack       |    8042 |            3005 |     5442 |
| Google Docs |    8060 |            3006 |     5460 |
| Classroom   |    8061 |            3007 |     5434 |
| Gmail       |    8035 |            3009 |     5455 |

---

## Changelog

### v2.1 (current)

Closes the audit → fix → task loop. Changes from v2:

- Added **Task Impact** as report section 8 so task authors can see which
  existing tasks are blocked by which findings without reading the whole
  report.
- Added `pipeline/qa/QA_FIX_PROCESS.md` with triage rubric (P0 / P1 / P2),
  sequential rollout rule, fix-PR template with 90-second Verify section,
  and the Asana race-condition fix as the canonical reference.
- Added "Phase -1: Check QA status" as a hard gate at the top of
  `pipeline/qa/TASK-PROCESS.md`. New tasks cannot be authored on a clone
  whose report is `red`, nor on a surface marked `blocked` / `at_risk`.
- Updated the "How to run" step 6 to point at the fix workflow instead
  of the old one-line "triage into PRs" instruction.

### v2

Calibrated from the GitHub pilot. Changes from v1:

Calibrated from the GitHub pilot. Changes from v1:

- Broadened the "race condition" definition to include
  `unchecked_optimistic` (not just `tempid_race`). GitHub has zero tempId
  races but 22 unchecked mutations.
- Added **Phase 0 — Error contract** as explicit prep. Without it the
  subagent over-reported on GitHub (every `callTool` looked like a silent
  failure when actually `callTool` throws on non-2xx).
- Added **Phase 1.5 — UI reachability map** as explicit prep. Caught the
  GitHub `RepoBranches.tsx`-unmounted gap that would have been missed by a
  pure UI walkthrough.
- Split silent-failure findings into *patterns* (one finding per file)
  instead of *instances* (one per line) so reports stay readable.
- Added "skip Phase 4 if no prior runs" as an explicit early-exit.
- Added browser session hygiene rules (close tabs between walkthroughs, use
  incognito, clear storage between clones) to prevent session bleed across
  parallel audits.

### v1

Initial version. Derived from Adit's Asana review. Covered Phases 1–4.
Missed the GitHub-class bugs because it assumed tempId race was the only
race pattern.
