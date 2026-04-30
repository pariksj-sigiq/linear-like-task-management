# ORCHESTRATOR BRIEF — Autonomous SaaS Clone + CUA Task Build

Paste this message to your AI clone (the orchestrator) after filling in the
three placeholders at the top. The orchestrator runs the full pipeline in
`clone-template`: research → plan → spawn build subagents → judge fidelity
loop → validate → ship, without stopping until every exit condition is 100%.

---

## Document contract (read before acting)

This file is one of four that must stay in sync. If you change one, update
the others in the same commit.

- `pipeline/build/ORCHESTRATOR_BRIEF.md` (this file) — the pipeline.
  Owns: phases, exit conditions, gates, subagent split, escalation rules.
  Reads: `spec/FEATURES.md`, `spec/RESEARCH.md`, `spec/TASK_PLAN.md`.
- `spec/FEATURES.md` — the scope. Owns: feature inventory, Tier 1 vs Tier 2
  split, failure-mode targets, seed data totals. Reads: `spec/RESEARCH.md`
  (design tokens), `spec/TASK_PLAN.md` (task-driven seed records).
- `spec/RESEARCH.md` — the UI spec. Owns: screenshots index, design tokens,
  per-page layout spec, interactive state matrix, required data-testids.
  Reads: `spec/FEATURES.md` (which pages exist at all).
- `spec/TASK_PLAN.md` — the task spec. Owns: CUA failure-mode selection,
  per-task end-state + difficulty + seed-determinism mapping. Reads:
  `spec/FEATURES.md` (which entities exist), `pipeline/qa/TASK-PROCESS.md`
  (failure-mode table and per-task file structure).

All four files live at the top level (three outputs in `spec/`, the pipeline
docs in `pipeline/build/` and `pipeline/qa/`) so they are hard to miss and
easy to keep in sync.
If you change one, update the others in the same commit.

Phase → file map:
- Phase 1 writes: `spec/RESEARCH.md` and `spec/FEATURES.md` (from their `.example`).
- Phase 2 writes: `spec/TASK_PLAN.md` (from its `.example`) plus the system
  plan and subagent prompts. Reads: all three spec docs + this brief.
- Phase 3 subagents read: the three spec docs plus this brief; never
  re-derive tokens, pages, tiers, interactive states, or task design.
- Phase 4 reads: `spec/RESEARCH.md` § "Interactive state matrix" as the UI
  fidelity bar; `spec/TASK_PLAN.md` plus the per-task smoke tests as the
  task fidelity bar; `spec/FEATURES.md` to confirm no Tier 1 page was
  silently dropped.

A phase never exits if the four documents disagree (e.g. a page exists in
RESEARCH.md but not in FEATURES.md; a task cites an entity not in the
System Plan). Reconcile before moving on.

---

## Fill these in before starting
- APP_NAME: {{APP_NAME}}
- APP_URL:  {{APP_URL}}
- APP_CREDENTIALS: {{APP_CREDENTIALS}}   # username / password for the logged-in real-app tab
- REPO_ROOT: /Users/renanserrano/clone-template
- CLONE_URL (dev server, Phases 3 & 4): http://localhost:3000
- CLONE_URL (Docker, Phase 5 validation only): http://localhost:8030

### Clone URL per phase (do not mix these up)

| Phase | Use | URL |
| ----- | --- | --- |
| 1 Research | Tab A only (real app) — clone does not exist yet | n/a |
| 2 Plan | No browser work | n/a |
| 3 Build + self-verify | Tab B → dev server (`make dev`) | http://localhost:3000 |
| 4 Judge & reject (UI + Tasks) | Tab B → dev server | http://localhost:3000 |
| 5 Validate (Docker) | Tab B → Docker compose (`docker-compose -f docker-compose.dev.yml up`) | http://localhost:8030 |
| 6 Ship | n/a | n/a |

If Phase 5 Tab B shows the dev-server URL, stop and escalate — you are judging the wrong build.

## Your role
You are the ORCHESTRATOR. You do four things: RESEARCH, PLAN, JUDGE, VALIDATE.
You do NOT edit source files. You do NOT fix CSS, write tools, or author tasks.
All implementation is done by subagents you spawn. You are allowed to spawn as many
parallel subagents as you need — there is no cap. Each subagent runs in its own
worktree / isolated scope and gets a self-contained prompt from you.

I am leaving the office. Do not stop, do not ask for optional input, and do not
hand back early. You work in a loop until ALL three exit conditions below are
simultaneously true. Only ping me if a HARD blocker hits (see § Escalation).

## Exit conditions (all three, simultaneously, 100%)
1. UI fidelity = 100% match with {{APP_NAME}} on every page the clone exposes
   (judged by you via live side-by-side browser screenshots, not code review).
2. Every Tier 1 tool, every Tier 1 UI flow, every Playwright test, `make test`,
   `make validate`, and the Docker build all pass — 100% green, no skips.
3. Every checklist in the reference docs below is 100% covered, item by item:
   - README.md § "Acceptance Criteria" and § "Delivery Checklist"
   - pipeline/build/context-for-AI-agent.md § 8 "Verification Checklist"
   - Every per-task file required by pipeline/qa/TASK-PROCESS.md § "Per-task file structure"
   - CUA tasks pass both smoke tests (negative fresh DB → 0.0, golden_apply → 1.0)

## Browser setup (what I left running)
- **Tab A — the real app (ground truth).** Already open and logged into
  {{APP_URL}} with {{APP_CREDENTIALS}}. Do NOT log out, do NOT navigate away
  from this session — it is the only source of truth for UI fidelity judgments.
- **Tab B — the clone (does not exist yet).** You will open it yourself at the
  start of Phase 3, once the dev server is running. Point Tab B at the URL
  for the current phase (see § Clone URL per phase above). Keep Tab B alongside
  Tab A for every fidelity judgment from Phase 3 onward.
- Before Phase 3, verify Tab A is still authenticated (screenshot the dashboard).
  If the session died, stop and escalate — do not try to log in yourself.
- Before Phase 5, tear down Tab B (dev server) and re-open it against the
  Docker URL. Do not leave two Tab Bs open at once.

## Reference material you MUST load and follow verbatim
Read these once at start, then keep them in working memory. Do not duplicate
their content into subagent prompts — link the path and tell the subagent to
read it. This keeps subagents aligned with the canonical protocol.

- {{REPO_ROOT}}/README.md
  → Stack, directory layout, acceptance criteria, delivery checklist, auth spec
    (seeded users: admin/admin, sarah.connor/password, john.smith/password,
    viewer/password), build order, Makefile targets.
- {{REPO_ROOT}}/pipeline/build/SWARM_PLAN.md
  → 6-phase pipeline, parallel agent split, orchestrator-judges-only separation,
    rejection triggers, verification checklist.
- {{REPO_ROOT}}/pipeline/build/AUTONOMOUS_WORKFLOW.md
  → Fidelity loop per page, multi-pass pattern (Structure → Usability → Pixel),
    screenshot-before-claiming-fixed rule, orchestrator/agent boundary.
- {{REPO_ROOT}}/pipeline/build/context-for-AI-agent.md
  → UI fidelity lessons, common bugs table, interactive states, design tokens,
    verification checklist.
- {{REPO_ROOT}}/pipeline/qa/TASK-PROCESS.md
  → Failure-mode-first CUA task design, per-task file structure,
    golden_apply-before-verify rule, smoke test, shipping criteria, hardening.
- {{REPO_ROOT}}/skills/taskgen-SKILL.md
  and {{REPO_ROOT}}/skills/accounting-example-SKILL.md
  → Domain skill templates. Use these as patterns when you produce the
    per-domain skill file for {{APP_NAME}}.
- {{REPO_ROOT}}/spec/FEATURES.md.example → copy to `spec/FEATURES.md` in Phase 1.
- {{REPO_ROOT}}/spec/RESEARCH.md.example → copy to `spec/RESEARCH.md` in Phase 1.
  Contains the screenshots index, design tokens, per-page layout, and — most
  importantly — the Interactive state matrix that Phase 4 uses as the UI
  fidelity bar.
- {{REPO_ROOT}}/spec/TASK_PLAN.md.example → copy to `spec/TASK_PLAN.md` in
  Phase 2. Contains the failure-mode selection, per-task end-state,
  expected difficulty, and seed-determinism mapping that Phase 3 CUA task
  subagents and Phase 4 task judging both read.
- {{REPO_ROOT}}/spec/screenshots/ → Phase 1 saves every PNG here.
- {{REPO_ROOT}}/shared/  → DO NOT EDIT. Reuse AppShell, DataTable, RecordDetail,
    FormLayout, SearchBar, Modal, seed_runner.py, test_helpers.py.
- {{REPO_ROOT}}/Makefile → use `make up`, `make seed`, `make test`,
    `make validate`, `make desktop`, `make dev-backend`, `make dev-frontend`.
  Do not invent new commands; extend the Makefile if something is missing and
  have the subagent commit the change.

## The pipeline you will run (loop until exit conditions are met)

### Phase 0 — Preflight (you, 5 min)
Before you do anything else, verify you can actually execute this brief.
Treat every checkbox as a hard gate; if any fails, STOP and escalate rather
than improvise a workaround.

Bootstrap checklist:
- [ ] `{{REPO_ROOT}}` exists and is a git checkout of
      `https://github.com/collinear-ai/clone-template.git`. If the path does
      not exist, clone it there before continuing.
- [ ] You can read every reference file listed in the "Reference material"
      section below. Try each path once; if any read fails, STOP and
      escalate — do not proceed with missing context.
- [ ] You have a browser tool with screenshot + DOM-inspection capability
      (Cursor browser MCP, Playwright, equivalent). If not, STOP and
      escalate — Phase 1 and Phase 4 are impossible without it.
- [ ] Tab A is open and logged into {{APP_URL}} with {{APP_CREDENTIALS}}.
      Screenshot the landing page as baseline. If not logged in → HARD
      BLOCKER, escalate (do not try to log in yourself).
- [ ] `git status` on {{REPO_ROOT}} is clean OR you have inventoried any
      uncommitted work from a previous session and decided reuse-or-reset.
      Do NOT blow away uncommitted work without logging what you found.
- [ ] `spec/` folder exists. If missing, `mkdir -p spec/screenshots`.

If any of the six boxes cannot be checked, stop here and report. A
mis-configured Phase 0 produces a hallucinated Phase 1, which poisons every
downstream phase.

### Phase 1 — Research {{APP_NAME}} (you, ~60-90 min — go deep, not fast)
Phase 1 is the spec that every other phase reads. If it is shallow, Phase 4
judging is impossible and Phase 3 subagents will invent details. Be thorough.

In Tab A, drive the real app yourself and capture concrete artifacts to disk.
Do NOT describe states from memory or inference — every claim in RESEARCH.md
must trace back to a saved PNG.

#### 1a. Screenshot capture (to disk, not just referenced)
Save every screenshot as a PNG into `{{REPO_ROOT}}/spec/screenshots/`. Create
the folder if it does not exist. Filename convention: `{page}-{state}.png`
(e.g. `home-grid.png`, `share-modal-default.png`, `toolbar-bold-hover.png`).

Minimum per-page set (capture each before moving on):
- Every top-level nav destination (one screenshot per route)
- Every detail / edit / admin page
- Every empty state (no data, no results, no permissions)
- Every modal, drawer, and side panel (open + scrolled if tall)
- Every dropdown / menu, open (File menu, Insert menu, role dropdown, etc.)
- Every list-view variant (grid, list, density options)
- Every error / loading / skeleton state you can trigger

#### 1b. Interactive state matrix (go DEEP — four states per element)
For every element in the Target Elements list below, capture and document
FOUR states: `default`, `hover`, `focus` (keyboard Tab), `active/pressed`.
For inputs, dropdowns, and any button that can be disabled, also capture
`disabled`. State capture is Playwright-MCP-driven — inference from memory
is banned. Record per-state deltas in RESEARCH.md § "Interactive state
matrix" (one row per element × state) with columns: element, state, bg
hex, border hex, text hex, icon hex, shadow, ring, source screenshot
filename.

Exact MCP sequence per element:
1. `mcp__playwright__browser_snapshot()` — record the element's `ref`
2. Default: `mcp__playwright__browser_take_screenshot({filename: "<elem>-default.png"})`
3. Hover: `mcp__playwright__browser_hover({target: <ref>})` → screenshot `<elem>-hover.png`
4. Focus: `mcp__playwright__browser_press_key({key: "Tab"})` repeatedly until the element is focused → screenshot `<elem>-focus.png`
5. Active: `mcp__playwright__browser_click({target: <ref>})` (for buttons / dropdowns) → screenshot `<elem>-active.png`
6. Disabled (when applicable): navigate to a state where element is disabled → screenshot `<elem>-disabled.png`

Every row in the matrix must cite the filename produced by step 2-6. A
row without a filename does not pass the Phase 1 exit gate.

Target Elements (capture all; add app-specific ones you encounter):
- Primary pill buttons (e.g. Share, Upgrade, Done, Save)
- Secondary / outline buttons (e.g. Copy link, Cancel)
- Icon buttons in toolbars (undo, redo, bold, italic, underline, etc.)
- Menu-bar items (File / Edit / View / Insert / Format / Tools / Help / ...)
- Menu items inside dropdowns (including submenu parents with `▸`)
- Combobox / select controls (font, font-size, style, zoom)
- Mode dropdowns (e.g. Editing / Suggesting / Viewing)
- Cards and rows in list/grid views (doc card hover, row hover, row selected)
- 3-dot "more" buttons on cards and rows
- Tabs / pills (left panel tabs, gallery tabs)
- Text inputs and searchboxes (default, focus, filled, disabled, error)
- Star / favorite / checkbox toggles (off / on / hover / focus)
- Role dropdowns inside share modals
- General-access dropdowns inside share modals
- Right-click context menus on cards and rows
- Ruler / drag handles (default, drag-in-progress, snapped)
- Avatar / account button

#### 1c. Design tokens (hex, sampled from a saved screenshot)
Sample every color value directly from the saved screenshots (eyedropper or
equivalent). Every hex in RESEARCH.md must be followed by the filename it
was sampled from, e.g. `#0b57d0 (editor-share-dialog.png)`. No hex without
a source.

#### 1d. RESEARCH.md must contain (all sections, in this order)
Use `{{REPO_ROOT}}/spec/RESEARCH.md.example` as the template.

- Document contract (points at FEATURES.md and pipeline/build/ORCHESTRATOR_BRIEF.md)
- Screenshots index — table: filename → page → state → what it captures
- Global design tokens (typography, colors, radii, spacing) — each hex cites
  its source screenshot
- Navigation map (global, per-major-surface)
- Per-page layout spec (one subsection per page; required data-testids listed)
- Interactive state matrix (see 1b) — the most important section for Phase 4
- Common bug targets (app-specific; inherits general ones from
  `pipeline/build/context-for-AI-agent.md`)
- Design tokens CSS block ready for paste into
  `app/frontend/src/design-tokens.css`

#### 1e. Also fill `{{REPO_ROOT}}/spec/FEATURES.md` from `spec/FEATURES.md.example`
Feature inventory (20+ items), Tier 1 vs Tier 2 split, failure-mode targets,
seed data totals. `spec/FEATURES.md` and `spec/RESEARCH.md` must agree on the
page list — a page listed in RESEARCH.md per-page layout must appear in
FEATURES.md with a tier, and vice versa.

#### 1f. Phase 1 exit gate (all must be true before entering Phase 2)
- [ ] `spec/screenshots/` exists and contains ≥ 1 PNG per target element ×
      state listed in 1b, plus the base per-page set from 1a.
- [ ] `RESEARCH.md` contains every section listed in 1d, non-empty.
- [ ] Every hex in RESEARCH.md cites a screenshot filename.
- [ ] Every page in RESEARCH.md § "Per-page layout spec" appears in
      FEATURES.md with a tier assignment, and vice versa.
- [ ] `RESEARCH.md` § "Interactive state matrix" has ≥ 4 rows per Target
      Element (default / hover / focus / active, plus disabled where
      applicable). No element left with only a default row.
If any checkbox is false, loop back into Phase 1 — do NOT spawn Phase 2.

### Phase 2 — Plan (you, ~45-60 min — task research is NOT one bullet)
Pre-read: confirm every Phase 1 exit-gate checkbox is true. Reference
`spec/RESEARCH.md` § "Interactive state matrix" and `spec/FEATURES.md` as
the single source of truth for pages, tokens, and interaction rules; do
not re-derive any of that here. Phase 2 has three sub-phases (2a, 2b, 2c)
and an exit gate. Do them in order.

#### 2a. Task Research — failure-mode-first (write `spec/TASK_PLAN.md`)
Read `pipeline/qa/TASK-PROCESS.md` §§ "Phase 0 — Choose Failure Modes
Before Anything Else" and "Phase 1 — Design the App FOR the Failure Modes"
verbatim before writing anything. Then copy
`{{REPO_ROOT}}/spec/TASK_PLAN.md.example` to `{{REPO_ROOT}}/spec/TASK_PLAN.md`
and fill it in with:

- Failure-mode selection — pick 3-5 from the pipeline/qa/TASK-PROCESS.md Phase 0 table.
  Justify each pick in one sentence using something you observed in
  Tab A during Phase 1 (e.g. "Suggesting vs Editing mode toggle in Docs
  → Mode confusion").
- Task matrix — one row per candidate task (aim for ≥ 15 Tier-1 tasks).
  Each row: task ID, one-sentence end-state, failure mode tag, entities
  touched, expected difficulty L1/L2/L3 per pipeline/qa/TASK-PROCESS.md § "Task
  difficulty targets", and seed-determinism note (which specific seed
  records make this task's answer unambiguous — e.g. "Q2 Roadmap doc has
  exactly 3 unresolved comments; no other doc has 3").
- Anti-pattern checklist — confirm each task is NOT on the "does NOT work
  as difficulty" list (single-workflow CRUD, list-sum, date filter, etc.).
- Build order reminder — every task will be built
  `instruction.md → golden_apply.py → verify.py → smoke both directions`.
  No exceptions. Verify.py is never written before golden_apply.py.

#### 2b. System Plan — entities, tools, pages, seed, tests
Now produce the engineering plan and write it to
`{{REPO_ROOT}}/spec/SYSTEM_PLAN.md` (single file — the Phase 3 subagents
read this, not scattered notes). Because 2a exists, the seed spec and
entity list are derived from task needs, not invented. `spec/SYSTEM_PLAN.md`
must contain these sections, in this order:

1. Entities — table list with relationships (for `app/postgres/init.sql`).
   Every entity referenced in `spec/TASK_PLAN.md` must be here; flag any
   Phase 1 feature that has no backing entity.
2. Tools — full tool list (50+) with input schemas (for `app/schema.py` +
   `app/server.py`). Every mutation a task requires in `spec/TASK_PLAN.md`
   must map to a named tool.
3. Pages — page list with layout description and required data-testids.
   This must match `spec/RESEARCH.md` § "Per-page layout spec" one-to-one.
4. Seed — seed data spec, realistic English names, deterministic, 50-200
   records. For every task-row seed-determinism note from 2a, the seed
   spec must contain the exact record(s) that produce it. The seed
   subagent reads this section; they do not read TASK_PLAN.md directly.
5. Tests — unit tests per Tier-1 tool, Playwright flows per Tier-1 UI
   flow, CUA task smoke tests per task in TASK_PLAN.md.

#### 2c. Build Prompts — self-contained prompts per subagent scope
Write one prompt file per Phase 3 scope to
`{{REPO_ROOT}}/pipeline/build_prompts/{scope}.md` (create the directory if
it doesn't exist). Scope names must match the Phase 3 split below
(e.g. `backend.md`, `seed.md`, `frontend-shell.md`, `frontend-core-pages.md`,
`frontend-crud-{entity}.md`, `frontend-admin.md`, `cua-tasks-batch-1.md`, …).
Each prompt contains:
- The full `spec/SYSTEM_PLAN.md` section relevant to them (pasted, not linked).
- The auth spec from `README.md`.
- "Read and follow `pipeline/build/AUTONOMOUS_WORKFLOW.md`" instruction.
- "Read and follow `pipeline/build/context-for-AI-agent.md`" instruction.
- For CUA-task subagents specifically: "Read and follow
  `pipeline/qa/TASK-PROCESS.md` § Phase 3 verbatim. Build order
  `instruction.md → golden_apply.py → verify.py → smoke` is non-negotiable.
  Build in batches of 5 tasks — after each batch, run both smoke directions
  and fix verifier bugs before starting the next batch. Never write
  verify.py before golden_apply.py."
- Explicit list of files they own (no two subagents touch the same file).
- The exact data-testids they must emit (copy from RESEARCH.md per-page).
- Self-verification contract: run the autonomous fidelity loop on their own
  pages/tasks before reporting "done". A subagent that reports done
  without self-verify is rejected immediately in Phase 4.

#### 2d. Phase 2 exit gate (all must be true before entering Phase 3)
- [ ] `spec/TASK_PLAN.md` exists, has ≥ 15 task rows, every row has a
      failure-mode tag, difficulty, and seed-determinism note.
- [ ] Every failure mode tagged in TASK_PLAN.md matches an entry in the
      pipeline/qa/TASK-PROCESS.md Phase 0 table (no invented failure modes).
- [ ] Every entity referenced in TASK_PLAN.md appears in the 2b entity list.
- [ ] `spec/FEATURES.md` § "Failure-mode targets" agrees with the failure
      modes selected in TASK_PLAN.md.
- [ ] `spec/SYSTEM_PLAN.md` exists and contains the five sections (Entities,
      Tools, Pages, Seed, Tests) in order.
- [ ] `spec/SYSTEM_PLAN.md` § Seed contains the specific seed records cited
      by every TASK_PLAN.md seed-determinism note.
- [ ] One build prompt exists per Phase 3 subagent scope under
      `pipeline/build_prompts/` (filename matches the scope).
If any checkbox is false, loop back into the failing sub-phase — do NOT
spawn Phase 3.

### Phase 3 — Build + Self-Verify (subagents, parallel, background)
Spawn as many subagents as the plan requires, in parallel, each in its own
worktree. Recommended split (expand as needed — unlimited):
- Backend (init.sql, models.py, schema.py, server.py)
- Seed (seed_data/*.json, seed/seed_app.py)
- Frontend Shell (AppShell, Login, App.tsx, design-tokens.css, routing)
- Frontend Core Pages (dashboard + top-traffic flows)
- Frontend CRUD Pages (one subagent per entity if beneficial)
- Frontend Admin + Tier 2 Stubs
- Tests (unit tests for every Tier 1 tool + Playwright flows)
- CUA Tasks (one subagent per domain group; each follows pipeline/qa/TASK-PROCESS.md
  build order `instruction.md → golden_apply.py → verify.py → smoke test`
  non-negotiably. Build in BATCHES OF 5 TASKS — after every batch the
  subagent runs both smoke directions, fixes verifier bugs, and only then
  starts the next batch. This directly avoids the "built 40 tasks, found
  10+ verifier bugs" anti-pattern in pipeline/qa/TASK-PROCESS.md § Anti-Patterns.
  verify.py is NEVER written before golden_apply.py.)
- Domain Skill (produces `skills/cua-{{APP_NAME}}-SKILL.md` per
  `skills/taskgen-SKILL.md`. The file MUST live under `skills/`, not
  `spec/` or `pipeline/`.)

Each subagent ships at ~85% fidelity by running the autonomous loop on its own
pages before reporting done. Do NOT accept a "done" that skipped self-verify.

### Phase 4 — Judge and Reject (you, looping)
You never write code. Phase 4 has two parallel tracks — UI fidelity (per
page) and task fidelity (per CUA task). Run both until every page and
every task is approved.

#### 4.UI — Per-page fidelity (read `spec/RESEARCH.md`)
For every page a subagent reports done, run the MCP sequence below. Free-form
"I looked at it" judgments are not accepted — every approval must be backed by
a PNG pair on disk.

  1. `mcp__playwright__browser_tabs({action: "select", index: <real-app-tab>})`
     → `mcp__playwright__browser_navigate({url: "<real page>"})`
     → `mcp__playwright__browser_take_screenshot({filename: "spec/screenshots/<app>/<page>-real.png"})`
  2. `mcp__playwright__browser_tabs({action: "select", index: <clone-tab>})`
     → `mcp__playwright__browser_navigate({url: "http://localhost:3000/<page>"})`
     → `mcp__playwright__browser_take_screenshot({filename: "spec/screenshots/<app>/<page>-clone.png"})`
  3. Compare the two PNGs with vision. List EVERY difference — colors (exact
     hex), spacing, typography, layout, components, icons, borders, shadows,
     interactive states. Cite both filenames in the diff.
  4. Walk the `RESEARCH.md` § "Interactive state matrix" row by row for every
     element visible on this page. For each row, reproduce the state in the
     clone tab via `mcp__playwright__browser_hover` / `browser_press_key(Tab)`
     / `browser_click`, capture with `browser_take_screenshot` into
     `spec/screenshots/<app>/<page>-<elem>-<state>-clone.png`, and diff each
     field (bg / border / text / icon / shadow / ring) against the matrix.
     A page is not approved until every applicable matrix row passes.
     Spot-check list-level states too: empty, loading, error, scrolled,
     modal open, menu open.
  5. If fidelity < 100% OR any rejection trigger from pipeline/build/SWARM_PLAN.md fires,
     send the responsible subagent back with a SPECIFIC rejection using the
     pipeline/build/AUTONOMOUS_WORKFLOW.md rejection template. Include:
       • each page that failed
       • each concrete diff (e.g. "submit button is #3b82f6, should be #1f73b7")
       • the URL to compare against
       • instruction to re-enter the autonomous loop until you re-approve
  6. Never say "close enough" at <100%. Never stop at 85%/90%/95%. The exit
     contract is 100%, so reject and loop. Two exceptions to the hard line:
       • Real app has something the clone's tiering explicitly drops to Tier 2
         stub — document it in FEATURES.md and still render a stub page.
       • You've looped the same page 5+ times with diminishing returns — log
         the residual gap, keep it in the final status report, keep going on
         the rest, and come back to it. Do not silently accept.

#### 4.Tasks — Per-task fidelity (read `spec/TASK_PLAN.md`)
For every CUA task a subagent reports done:
  1. Run the negative smoke: reset DB → `make seed` → `python verify.py`.
     Must return `0.0`. If it returns anything else, the task is trivially
     passing on a fresh DB — reject with "verify.py accepts fresh DB" and
     the specific checks that passed when they should not have.
  2. Run the positive smoke: reset DB → `make seed` → `python golden_apply.py`
     → `python verify.py`. Must return `1.0`. If < 1.0, reject with the
     exact checks that failed under the golden state.
  3. Confirm the task row in `spec/TASK_PLAN.md` is still accurate
     (entities, failure-mode tag, difficulty). If the subagent diverged,
     either update TASK_PLAN.md (if the divergence is better) or reject.
  4. Confirm build-order compliance: `golden_apply.py` git-mtime is earlier
     than `verify.py` git-mtime. If verify.py was written first, reject —
     the task is suspect per pipeline/qa/TASK-PROCESS.md § Anti-Patterns #7.
  5. Spot-check the instruction: conversational tone, no numbered steps,
     no menu paths, ASCII `--` not em-dashes, entity references by ID +
     hint (per pipeline/qa/TASK-PROCESS.md § "Instruction writing rules").

Repeat Phase 3 ↔ Phase 4 until every page + every task + every test +
every checklist item is approved. Track everything in a todo list, per
page and per task.

### Phase 5 — Validate (you)
Run from {{REPO_ROOT}}:
  make down && make up && make seed
  make test
  make validate
  make desktop   # build .dmg/.exe/.AppImage and verify it launches
All must pass. After Docker is up, point Tab B at the Docker URL
(http://localhost:8030) and spot-check 5 key pages — catch env var / port /
asset path bugs that only appear in the Docker build, not hot-reload. If Tab B
still shows http://localhost:3000, you are judging the dev server, not Docker —
re-open the tab before continuing. For CUA tasks:
  python tasks/smoke_test.py         # all tasks, both directions
Every task must return 0.0 on fresh DB and 1.0 after golden_apply.

### Phase 6 — Ship
Only when all three exit conditions from the top of this brief are TRUE:
  git add -A
  git commit -m "feat({{APP_NAME}}): complete clone + CUA tasks at 100% fidelity"
Do not push — leave the commit local for me to review.

## Escalation (HARD blockers only — ping me and keep every other subagent running)
- Real app credentials rejected / session expired on Tab A
- Permission denied on a `sudo`-level command
- An external service I need to provision (domain, API key, Marketplace install
  that requires terms acceptance — e.g. Clerk) is missing
- Codebase is in an unrecoverable git state and you need me to decide reset vs
  preserve
- No browser tool is available to the orchestrator (e.g. Phase 0 bootstrap
  check #3 fails). Without browser control you cannot drive Tab A or judge
  fidelity in Phase 4 — do not proceed past Phase 0.

For everything else — TypeScript errors, CSS bugs, Docker restarts, env var
pulls, seed data mismatches, task verifier bugs, failing smoke tests — solve
it yourself (or delegate to the responsible subagent) and keep moving.

## Operating rules (non-negotiable)
1. Orchestrator is a judge, not a worker. Never open a source file to edit it.
2. Screenshot-before-claiming-fixed. No fidelity claim is valid without a
   rendered browser screenshot. Code review is not verification.
3. Reject specifically. Vague rejections ("make it better") waste cycles.
4. Loop — don't settle. 100% means 100%, not "shipped with gaps."
5. English only — no Portuguese, Spanish, or non-ASCII strings anywhere in UI
   or seed data. `grep` before every commit.
6. Every clickable element navigates somewhere. No dead tabs, no 404s.
7. Every operation works via BOTH the UI (Playwright) and the tool server API
   (POST /step). Neither can be missing.
8. Every Tier 1 tool has unit tests. Every Tier 1 flow has a Playwright test.
   Every CUA task has golden_apply.py AND verify.py AND both smoke tests pass.
9. Reuse `shared/` components — customize via design-tokens.css, don't fork.
10. Track progress with a persistent todo list. One todo per page, per tool,
    per task, per checklist item.

You have everything you need. Start with Phase 0. Do not ask me for
confirmation on any optional decision — use the reference docs above. I will
see you when all three exit conditions are green.
