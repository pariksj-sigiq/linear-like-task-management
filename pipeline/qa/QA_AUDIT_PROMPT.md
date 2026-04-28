# QA Audit Subagent Prompt (v2)

Paste everything below the `---` into a subagent after filling in the four
placeholders at the top. One subagent per clone. Subagents are fully
independent and can run in parallel.

For the methodology behind this prompt see `pipeline/qa/QA_AUDIT.md`. For the
canonical port assignments see the master table in that doc or the
per-clone `PORTS.md`.

---

<!-- cut here: everything below is the prompt -->

You are a QA auditor for the `<CLONE_NAME>` clone at `<CLONE_PATH>`.

Your job is to produce `QA_REPORT.md` at the clone repo root that finds the
six classes of post-build bugs listed in the catalog. Do not write tasks, do
not fix bugs, do not open PRs — just report.

## Inputs

- Clone name: `<CLONE_NAME>`
- Clone path: `<CLONE_PATH>`
- Frontend URL: `<CLONE_FRONTEND_URL>`
- Backend URL: `<CLONE_BACKEND_URL>`
- Methodology reference (read once before starting):
  `/Users/renanserrano/clone-template/pipeline/qa/QA_AUDIT.md`

If the frontend or backend is not up, run `make up && make seed` inside
`<CLONE_PATH>` and wait for `/health` on the backend URL before starting.
Do not create new Docker networks. Do not touch other clones.

## Bug class catalog

You are hunting exactly these six classes. Anything outside them is noise —
drop it.

1. **UI gap** — backend tool exists but no UI control can reach it.
2. **UI mislabel** — UI control's label does not match the tool it calls.
3. **TempId race** — client-side ID is used in a follow-up mutation before
   the `create_*` response supplies the real ID.
4. **Unchecked optimistic** — `await callTool(...)` call does not check
   `observation.is_error` (or the Phase 0 error contract's equivalent flag)
   before updating UI state.
5. **Silent catch** — `.catch(() => {})`, empty `try/catch`, or defaulted
   `.catch(() => shape)` that hides an error from dev.
6. **Forensic-replay mismatch** — prior failed run shows a write that went
   to the wrong ID, never happened, or landed in a row the verifier
   doesn't read.

## Phases

Run in order. Each phase gates the next.

### Phase 0 — Error contract discovery (prep)

Read the API client code (usually `app/frontend/src/api/client.ts` or
equivalent). Document:

- The function name and signature callers use for backend calls.
- What it does on HTTP non-2xx: throw, return shape, silent?
- What it does when `response.body.is_error === true`: throw, return flag,
  silent?
- What it does on network error.
- The caller contract: are callers expected to check a flag themselves, or
  does the client already throw for them?

Write this up at the top of the report. Later phases are judged against
this contract — if the client already throws on `is_error`, unchecked
callers are not findings; if it does not, they are.

### Phase 1.5 — UI reachability map (prep)

Build a table. For every backend write tool:

- Find the tool name in the backend tool registry
  (`app/server.py` `TOOLS = [...]` or equivalent).
- Grep the frontend for `callTool('<tool_name>'` and list the call sites.
- Check the router config for the route that mounts those call sites.
- Mark one of: `reachable`, `gap` (tool exists, no call site), `unmounted`
  (call site exists but component is never mounted), `mislabeled` (label
  does not match tool).

Every `gap`, `unmounted`, and `mislabeled` row becomes a Phase 1 finding.

### Phase 1 — UI walkthrough

Open `<CLONE_FRONTEND_URL>` in a browser (incognito, empty storage). Sign
in with `admin / admin` unless the clone README says otherwise. Walk the
top 3–5 task surfaces — pick them by reading any existing
`tasks/README.md` at the clone root. For each surface, verify you can
reach every backend write tool that belongs to that surface. Screenshot
every gap and mislabel.

If `tasks/README.md` does not exist, walk the surfaces that the reachability
map flagged.

Do not hunt for visual-fidelity bugs — that is a different process. Only
report gaps and mislabels that block agents from completing a task.

### Phase 2 — Optimistic-mutation audit (static)

Grep the frontend mutation layer (store, reducer, or equivalent). For
every `create_*` mutation:

- Does it mint a client-side ID before the backend responds? (pattern:
  `` `${prefix}${Date.now()}` ``, local `uuid()`, etc.)
- If yes, is there a `pendingIdResolution`-style helper that any
  follow-up mutation must await before using the ID?
- If no such helper exists, trace every follow-up mutation that could be
  called with the temp ID and flag each as a `tempid_race`.

Then grep every `await callTool(...)` (or equivalent). For each one,
confirm the caller checks `observation.is_error` (or the Phase 0
equivalent). Flag each unchecked caller as `unchecked_optimistic`.

Report format per finding:

- `file:line`
- Class (`tempid_race` or `unchecked_optimistic`)
- Tool involved
- Blast radius: one-line description of which UI actions route through
  this mutation

### Phase 3 — Silent-failure scan (static)

Grep for:

- `.catch(() => {})`
- `.catch(() => <literal>)`  (non-throwing default)
- `catch (_)` / `catch {}` with no logging
- Awaited calls without post-check (when Phase 0 says callers must check)
- `.then(...)` chains without a paired `.catch` and not awaited

Group findings by **file**, not by line. A file with 22 identical
violations is one finding with `count: 22`. Include the call-graph root
so task authors know which UI actions are exposed.

### Phase 4 — Forensic replay

Look for prior failed run artifacts under:

- `<CLONE_PATH>/tasks/*/runs/` or similar
- `<CLONE_PATH>/agent-transcripts/` if it exists
- Any `.jsonl` or `.log` next to `verify.py` outputs

If none exist, write "skipped: no prior failed runs" and move on.
Otherwise diff agent final DB state vs. verifier expected DB state. Flag:

- Writes that landed on a temp ID (`tempid_race` confirmation).
- Writes that never happened (`silent_catch` confirmation).
- Writes that landed but to a row the verifier never reads (seed drift).

## Output

Write `<CLONE_PATH>/QA_REPORT.md` with the following sections, in order:

1. **Summary** — one paragraph + traffic-light health rating
   (green / yellow / red) + counts: `{ ui_gaps, ui_mislabels, tempid_races,
   unchecked_optimistic, silent_catches, replay_mismatches }`.
2. **Phase 0 — Error contract**
3. **Phase 1.5 — UI reachability map** (full table)
4. **Phase 1 — UI walkthrough** (findings with screenshot paths)
5. **Phase 2 — Optimistic-mutation audit**
6. **Phase 3 — Silent-failure scan** (grouped by file)
7. **Phase 4 — Forensic replay** (findings or "skipped")
8. **Task Impact** — cross-reference each flagged finding with every
   existing task in `<CLONE_PATH>/tasks/`. For each task that touches
   a flagged surface, emit one row with columns: `task`, `touches`,
   `findings`, `impact` (`blocked` / `degraded` / `at_risk` /
   `unaffected`), `action` (`hold new runs` / `re-run after fix #N` /
   `no-op`). If `tasks/` is empty or missing, write
   `No existing tasks — section N/A`. This section is what task authors
   read before picking a surface for new tasks, so be specific.
9. **Recommended fixes** — P0 / P1 / P2, each with `file:line` + one-line
   suggested change. Point each P0 at the fix workflow in
   `pipeline/qa/QA_FIX_PROCESS.md` (one PR per clone, sequential rollout).
10. **Prompt calibration feedback** — what you wish this prompt had told
    you. Be concrete. This feeds the next version of the prompt.

Keep the whole report under 500 lines. If it is longer, you are
over-reporting — tighten the groupings.

## Rules

- Do not modify any code. No fix PRs, no task changes. This is audit-only.
- Do not touch other clones. Do not `docker compose down` anything you
  did not start. Do not change ports.
- Use the canonical host port from `<CLONE_PATH>/PORTS.md` if it exists,
  otherwise from the master port table in `pipeline/qa/QA_AUDIT.md`.
- Browser session hygiene: use an incognito window, clear localStorage
  between walkthroughs, close tabs from prior audits. Session bleed
  across parallel audits produces phantom findings.
- If a phase is impossible (e.g., Phase 4 has no artifacts), say "skipped"
  with a one-line reason. Do not skip silently.
- Rate-limit your own browser actions: take a snapshot before every
  interaction, verify the action landed, move on.
- End the session by writing the report file. Do not leave Docker
  containers in a stopped state — leave the clone up if it was up when
  you arrived, down if it was down.

## Health rating rubric

- **Green** — zero P0 findings. Clone is safe for eval.
- **Yellow** — 1–3 P0 findings, all fixable in a small PR. Clone is
  usable if tasks avoid the broken surface.
- **Red** — ≥4 P0 findings or any `tempid_race` on a task-critical
  mutation. Clone should be pulled from eval until fixed.

Return only the path to the written report file and the three-bucket
counts. Do not echo the full report in your reply.
