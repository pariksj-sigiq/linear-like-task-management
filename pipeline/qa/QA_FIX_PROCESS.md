# QA Fix Process — From Report to Merged PR

What to do *after* `pipeline/qa/QA_AUDIT.md` finds bugs. This doc closes the
build → audit → fix → task loop. It exists so a human reviewer can approve
fixes at the pace of one clone at a time, without ever having eight open
clone PRs to hold in their head.

For the methodology that produces `QA_REPORT.md` see `pipeline/qa/QA_AUDIT.md`.
For the task-authoring gate that depends on this process see
`pipeline/qa/TASK-PROCESS.md` § "Phase -1".

---

## Document contract

This file is part of the three-file QA contract:

- `pipeline/qa/QA_AUDIT.md` — the methodology + report schema.
- `pipeline/qa/QA_AUDIT_PROMPT.md` — the subagent prompt.
- `pipeline/qa/QA_FIX_PROCESS.md` (this file) — the remediation workflow.

If you change the triage rubric, PR template, or re-audit gate here,
update the cross-reference in `QA_AUDIT.md` (report section 9,
"Recommended fixes").

---

## When to run

Run this process on a clone as soon as its `QA_REPORT.md` exists and the
Summary section rates `red` or `yellow`. Green clones need no fix work.

Do **not** run this in parallel across multiple clones. The whole point of
this doc is to serialize fixes so one human can review them without context
thrash — see § "Sequential rollout" below.

---

## Triage rubric

Every finding in `QA_REPORT.md` gets a priority. The rubric is deliberately
small — three buckets — so there is no arguing about P1 vs P2.

### P0 — fix before next eval, blocks the fix PR from merging

A finding is P0 if **any** of these are true:

- It appears in the Task Impact section with `impact: blocked` on an
  existing task.
- It is a `tempid_race` on any mutation that a task touches.
- It is an `unchecked_optimistic` on a mutation whose success is asserted by
  any task's `verify.py`.
- It is a UI gap that makes a backend write tool entirely unreachable
  from the clone's UI.
- It is a UI mislabel where the visible label calls a different tool than
  the one a task expects.

P0 findings gate the fix PR: the PR cannot merge until every P0 in the
report is either fixed in the PR or explicitly deferred with a linked
follow-up issue and a one-line justification in the PR body.

### P1 — fix before next batch of new tasks on this clone

A finding is P1 if it is:

- An `unchecked_optimistic` that is not currently asserted by a task but is
  likely to be once the surface is used.
- A silent-catch pattern in a write-path whose tool is listed in the
  backend `TOOLS` registry.
- A UI gap on a surface that the task roadmap (if any) plans to use.

P1 findings do not block this clone's fix PR, but they block writing any
*new* task that touches the affected surface (see `TASK-PROCESS.md`
§ "Phase -1", step 3).

### P2 — issue only, not PR work

Everything else. File as a GitHub issue against the clone repo with the
`qa-p2` label. Close-out is not required for task work to continue.

---

## Sequential rollout (why, not parallel)

**One fix PR per clone, merged one at a time, in a deliberate order.**

Why not parallel:

- Parallel PRs across 8 clones produce 8 simultaneous review surfaces. By
  clone 3 the reviewer is thrashing context and missing real issues. By
  clone 5 the reviewer rubber-stamps.
- If clone 3's fix introduces a regression, the reviewer has already
  merged clones 1 and 2 and may have half-reviewed clones 4 and 5 — the
  recovery cost compounds.
- Parallel fixes also race on shared infra (Docker ports, seed data,
  PORTS.md) because multiple subagents are editing adjacent surfaces.

Recommended order (update as the clone list changes):

1. **Pilot** — whichever clone was used to calibrate `QA_AUDIT_PROMPT.md`
   most recently. At time of v2 this is GitHub.
2. **Reference** — whichever clone already has a fix PR landed that matches
   the template. At time of v2 this is Asana (the race-condition fix).
3. The remaining clones in the order their reports land.

Within each clone: ship one PR, get it reviewed and merged, re-run the
relevant QA phase, confirm green on the affected surfaces, then move to
the next clone. Do not start the next clone's fix PR until the current
clone is merged and re-verified.

---

## Per-fix workflow

1. **Read the report.** Load `<CLONE_PATH>/QA_REPORT.md` and filter to P0
   findings only.
2. **Pick the scope.** All P0 findings for one clone go in one PR. If that
   PR would exceed ~600 lines of diff, split by bug class
   (UI gaps → one PR, races → another PR) and ship the one-per-clone
   discipline at the class level.
3. **Branch.** Create `fix/qa-<clone-name>-p0` off the clone's default
   branch (usually `main`).
4. **Implement.** For each P0 finding:
   - UI gap / mislabel → ship the missing component, wire the correct
     tool, screenshot before/after.
   - `tempid_race` → apply the `pendingIdResolution` / `resolveId` pattern
     from the Asana reference (see § "Canonical example" below).
   - `unchecked_optimistic` → either (a) make the API client throw on
     `is_error` and update the caller contract in Phase 0, or
     (b) branch on `is_error` at each call site. Pick one and be
     consistent within the clone.
   - `silent_catch` → replace silent `.catch(() => {})` with
     `.catch(err => logAsyncError(context, err))` (dev-mode surfacing).
5. **Write regression tests.** Every P0 fix needs a test that fails on
   pre-fix code and passes after. If the clone has no test framework
   wired up yet, wire it up as part of the fix PR (Vitest for frontend
   stores, pytest for backend tools).
6. **Re-run the QA phase.** Re-run just the phase(s) the fix closes, not
   the whole audit. Capture the delta in the PR body.
7. **Open the PR** using the template below.

---

## Fix PR template

Copy this into the PR body. The **Verify this fix** section is the
human-reviewer entry point — it must let a reviewer confirm the fix in
90 seconds without reading the diff.

```md
## Verify this fix (90 seconds, no code reading required)

Pre-reqs:
- Clone running at <CLONE_FRONTEND_URL> and <CLONE_BACKEND_URL>
- Signed in as admin / admin in a fresh incognito window

Steps:
1. <navigate somewhere>
2. <click / type something>
3. <observe result>
4. <refresh page to confirm write persisted>

Pre-fix behavior: <what used to happen — link to the QA finding ID>
Post-fix behavior: <what happens now>

## What changed

Bullet list of the files touched, one line each. No code.

## QA report reference

- Fixes P0 findings #<N>, #<N+1> from `<CLONE_PATH>/QA_REPORT.md`.
- Re-ran Phase <X> on post-fix build — affected rows now status: reachable.
- Screenshots of the re-audit output attached below (or linked).

## Regression tests

- `<path/to/test/file>` — <N> new tests. Failed on pre-fix code, passing
  now. Run with `<command>`.

## Deferred findings (P0 not fixed in this PR)

None.  <!-- or, if any, list each with a linked follow-up issue + 1-line
reason for deferring -->

## P1 / P2 follow-ups

- P1: issue #<N> filed against the clone repo, `qa-p1` label.
- P2: issue #<N> filed, `qa-p2` label.
```

Keep the PR body under 80 lines. The verify section is the critical part —
everything else is supporting context.

---

## Canonical example — Asana race-condition fix

This is the reference implementation the rest of the clones should copy.
It is the cleanest worked example of a P0 fix that includes regression
tests, a dev-mode leak guard, and a minimal-surface refactor.

**Report finding**: `tempid_race` in `src/data/store.ts` affecting
`addTask → updateTask` within the create-task response latency window.

**Fix shape**:

1. Add a module-scoped `pendingIdResolution: Map<string, Promise<string>>`
   in the store.
2. Add `resolveId(id)` and `resolveIds(ids)` helpers — any mutation that
   receives an ID from the caller passes it through these before using it
   in a backend call.
3. `addTask` / `addSubtask` / `addTag` / `addProject` / etc. call
   `registerPending(tempId, createPromise)` at mint time. Every
   follow-up mutation on a tempId blocks on the resolve.
4. Replace all silent `.catch(() => {})` with
   `.catch(err => logAsyncError(context, err))`. Check
   `observation.is_error` on every awaited `callTool`.
5. Add a dev-mode `checkForTempIds` guard in `src/api/client.ts` that
   logs a console error if any client-minted tempId pattern leaks into
   an outbound API call.
6. Wire Vitest + jsdom + `@testing-library/react`. Add 9 regression
   tests in `src/data/store.race.test.ts` that mock slow backend
   responses and verify every follow-up mutation awaits ID resolution.

**Verification**:

- Vitest 9/9 pass.
- 7/9 tests fail on pre-fix control experiment (two pass by coincidence —
  documented in PR body).
- TypeScript clean.

**PR body**: see the Asana clone's PR #2 on `collinear-ai/Asana-Clone` for
the exact wording of the Verify / What changed / QA reference sections.

---

## Re-audit gate

Before the fix PR can merge, the author (or the fix subagent) must re-run
the affected QA phase(s) and include the delta in the PR body:

- Phase 1 / 1.5 fixes → re-run Phase 1.5 and include the updated UI
  reachability table. Every previously `gap`/`unmounted`/`mislabeled`
  row must now be `reachable`.
- Phase 2 fixes → re-run the static grep patterns from Phase 2 and confirm
  zero matches for the race patterns the fix targeted.
- Phase 3 fixes → re-run the silent-failure grep and confirm the grouped
  file findings drop by the count fixed.

The re-audit is scoped to the fixed phase(s) — a full audit is not
required until the clone is stable again (usually after 2–3 fix PRs land).

---

## Post-merge — reopen the loop

Once the fix PR merges:

1. Move any deferred P0s from the PR body into new issues on the clone
   repo. Do not let them age out of the report silently.
2. Re-run the full QA audit to regenerate `QA_REPORT.md`. Commit the new
   report to the clone repo as `QA_REPORT.md` (overwrite the old one).
3. Update the Summary health rating. If it is now `green`, the clone is
   cleared for new task authoring (`TASK-PROCESS.md` § "Phase -1" will
   green-light it).
4. Unblock any tasks that the old report had marked `blocked` or
   `at_risk` — the Task Impact section of the new report is the source
   of truth.
5. Move to the next clone in the rollout order.

---

## Rollback rules

If a fix PR breaks an existing passing task (caught by task smoke tests
post-merge):

- Revert the PR on `main` of the clone repo.
- File an issue describing the regression and link the reverted PR.
- Do NOT move to the next clone in the rollout until the revert lands and
  the old QA_REPORT.md is restored.

Breaking a passing task is worse than leaving a QA finding unfixed —
tasks are the deliverable, the clone is infrastructure.
