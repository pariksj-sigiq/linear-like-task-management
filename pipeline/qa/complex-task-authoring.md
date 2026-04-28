# Complex-Task Authoring From a Feature Inventory

When a clone has more backend tools and UI panels than it has
published tasks, the tasks that exist probably exercise only a thin
slice of the surface. That is when to run this workflow: it takes you
from "we shipped the clone" to "every feature is exercised by at
least one multi-step CUA task."

This is complementary to `QA_AUDIT.md`. QA audits find bugs on the
shipped surface. This doc builds tasks that *use* the shipped surface.
Run the QA audit first — there is no point authoring a task against a
broken tool.

> 📖 **Canonical principles live elsewhere.** This document covers the
> feature-inventory-driven *workflow* (Phase 0–3: inventory → design →
> execute → validate). The universal CUA task-gen principles
> (12-category difficulty taxonomy, 4-class failure triage, 8
> calibration anti-patterns, 30-rule audit checklist, GUI-only mandate,
> seed-data adversarial-quality features, four-file task contract) live
> in the mirror at
> [`mirrors/cua-clone-apps-taskgen.md`](./mirrors/cua-clone-apps-taskgen.md),
> which is synced from `collinear-ai/vibe-rl-gym` branch
> `tasks/clone-apps`. **Before authoring any new task, read the mirror
> and check vibe-rl-gym for updates to the canonical source.**

---

## When to run this

Run it when any of the following is true for a clone:

- The clone has ≥30 registered tools but <3 published tasks.
- `tasks/README.md` is empty or covers fewer than 50% of the tools
  listed in `server.py`'s `TOOLS = [...]`.
- The clone just finished a QA audit with green or yellow rating and
  you want to convert the now-trusted surface into evaluation
  coverage.
- A reviewer asked "do we actually test X feature" and the answer is
  "no task hits it."

Do **not** run it if the QA audit is still `red` for that clone —
fix the P0s first, otherwise your new tasks will inherit the broken
surface.

---

## Phases

Run in order. Each phase is read-only up until Phase 2 (execution).
Nothing writes to the clone repo before Phase 2.

### Phase 0 — Feature inventory (read-only)

Produce a single source of truth for what the clone can do. Write it
to `<CLONE_PATH>/FEATURE_INVENTORY.md` (or append a section to the
existing `FEATURES.md`). For each feature area, list:

1. **Backend tools.** Every name in
   `server.py`'s `TOOLS = [...]` (or the per-module `TOOLS` lists for
   clones like Asana that shard by domain). Include `mutates_state`.
2. **UI panels.** Every page or panel under
   `app/frontend/src/pages/` (or the Next.js `src/app/` routes for
   Spotify-style clones) that mounts a call site for any of those
   tools.
3. **Seed data coverage.** Which JSON files under `app/seed_data/`
   populate the rows those tools read / write.
4. **Existing task coverage.** From `tasks/`, list which tasks touch
   each tool or panel. If a tool is unreferenced by any task, mark it
   `UNCOVERED`.

Deliverable: a table roughly shaped like this

```
| Feature area | Tools (mutate?) | UI panels | Seed | Tasks that hit it |
|---|---|---|---|---|
| Issues | create_issue (M), update_issue (M), close_issue (M), list_issues, search_issues | /issues, /issues/new, issue-detail | issues.json, labels.json | GH-T01, GH-T03 |
| Labels | create_label (M), update_label (M), delete_label (M), list_labels | LabelPicker, /settings/labels | labels.json | (UNCOVERED) |
| ...
```

Identify the `UNCOVERED` rows — those are your candidates.

### Phase 1 — Task-candidate ideation (read-only)

Group UNCOVERED or under-covered tools into **multi-feature chains**.
A good chain has:

- **≥ 4 tool calls across ≥ 3 feature areas** (e.g., label + issue +
  milestone + PR + review + notification). Single-feature tasks are
  unit tests in disguise.
- **Natural data dependencies.** Every step consumes output from a
  previous step (create an issue, apply a label to *that* issue,
  open a PR that closes *that* issue, request review from an assignee
  that *was* added to the team). Dependencies force the agent to
  handle state — which is where TempId races, optimistic mutations,
  and silent catches get caught at eval time.
- **At least one trap.** A trap is a step that requires the agent to
  verify state rather than guess: "apply label `p0`, which does not
  yet exist — you must create it first," or "rename the issue after
  assigning a milestone, and verify both survive." Traps prevent the
  agent from pattern-matching a shallow solution.
- **A verifier that reads Postgres directly**, not the API. If the
  verifier calls the same API the agent used, the agent can
  hallucinate the API response and still pass.

Write each candidate as a two-line pitch in a scratchpad:

```
GH-T06 "issue-triage-to-close"
  Tools: create_issue, create_label, apply_labels, set_milestone,
         assign_issue, create_pull_request, link_pr_to_issue,
         request_review, submit_review, merge_pull_request
  Trap: milestone must exist with due date in past; merging must
        close the linked issue automatically
```

Aim for 3–6 candidates per clone. More than 6 and you are splitting
one big task unnecessarily; fewer than 3 and the clone is probably
too small to need this workflow.

### Phase 1.5 — Pitch review (gate)

Surface the pitches to the human reviewer. Ask explicitly:

- Do these chains cover the UNCOVERED surface?
- Are the traps realistic (something a real agent would get wrong)?
- Do the chains avoid the `red` surfaces the QA audit flagged?
- Pick N to execute. Default is all of them.

Do not proceed to Phase 2 until the reviewer picks the list.

### Phase 2 — Task authoring (writes)

For each approved candidate, author under
`<CLONE_PATH>/tasks/<descriptive-folder-name>/` using the canonical
task schema (same layout as every other task in
`collinear-ai/clone-template/spec`):

```
tasks/<task-slug>/
  README.md              # human summary, difficulty, why it's hard
  instruction.md         # exact instruction handed to the agent
  task.toml              # metadata (id, difficulty, tool list)
  environment/
    setup.sh             # reset + seed + any task-specific writes
    services.sh          # (rarely) extra services to start
  tests/
    golden.json          # canonical agent action trace
    verify.py            # Postgres-only verifier, no API reads
```

For task-specific seed data, prefer `POST /step` calls inside
`environment/setup.sh` over editing `seed_data/*.json`. That keeps
the base seed single-sourced for every clone and keeps task-specific
state isolated.

Author the `verify.py` *first*, then the instruction. If you cannot
write the verifier without inspecting the agent trace, the task is
under-specified — fix the instruction, not the verifier.

### Phase 3 — Hand-verification (writes)

For each task:

```
cd <CLONE_PATH>
make up && make seed
bash tasks/<task-slug>/environment/setup.sh
python tasks/<task-slug>/tests/verify.py  # must print baseline 0/N
# Then manually execute the instruction via UI + tool server.
python tasks/<task-slug>/tests/verify.py  # must print N/N
```

Baseline must be less than N (not everything passes trivially) and
the full run must reach N/N. If the baseline is N/N, the task is a
no-op — rewrite it.

Also run `tasks/run_golden_all.py` (or the clone's equivalent) to
make sure the new task does not break any existing one via seed
collisions.

### Phase 4 — PR

One PR per clone, titled
`feat(tasks): complex multi-feature CUA tasks for <clone>`. Include:

- The new `tasks/<slug>/` folders.
- Any engine additions needed (e.g., a new tool or a new
  verifier helper). Keep engine additions minimal and reviewed
  separately if they are substantial.
- An updated `tasks/README.md` row per new task.

Let CI prove the clone still builds + seeds + passes existing tests
before requesting review.

---

## Anti-patterns (caught on real clones)

1. **Single-feature tasks dressed as complex ones.** Six calls to the
   same tool with different args is not multi-feature. Count the
   *distinct* tool names in `task.toml`.
2. **API-reading verifiers.** `verify.py` calls `GET /step` with
   `list_issues` and asserts the list. The agent can populate the
   list and the DB can be wrong — always query Postgres directly.
3. **Golden trace as the specification.** The agent may take a
   different valid path. Verifiers must check *final state*, not the
   sequence of actions.
4. **Shared seed drift.** Task-specific writes landing in
   `seed_data/*.json` force every other task to work around them.
   Use `setup.sh`.
5. **Trap-less tasks.** A task that succeeds when the agent
   blindly calls every tool in order is training data for a parrot,
   not for a planner.

---

## Interaction with the QA pipeline

- **QA audit finishes first.** A `red` clone never moves past Phase 1
  in this workflow. A `yellow` clone is allowed to move to Phase 2 on
  the green surfaces only — do not author a task that routes through
  a P0 finding.
- **QA audit findings are inputs to the traps.** If the audit flagged
  `unchecked_optimistic` in `applyLabels`, the trap in a new
  label-focused task is exactly "rapid-fire label apply, verify the
  final set is correct" — turning the bug into a task that would
  have caught it.
- **Re-run the audit after merging tasks.** New tasks exercise the
  surface more aggressively than the audit did. If any task reveals a
  regression the audit missed, feed it back into
  `QA_AUDIT_PROMPT.md` as a v-next calibration note.

---

## Template for the pitch document

Copy this into `<CLONE_PATH>/TASK_CANDIDATES.md` during Phase 1.

```markdown
# <clone> task candidates — <date>

## Inventory summary
- Tools total: N
- Tools covered by existing tasks: M
- Uncovered tools: N - M

## Candidates

### <slug-1>
- Tools: ...
- Feature areas: ...
- Trap: ...
- Verifier sketch: ...

### <slug-2>
...

## Coverage after proposed additions
- Still-uncovered tools: (list or "none")
```

Ship the PR with this document alongside the task folders so the
review can see the coverage math.
