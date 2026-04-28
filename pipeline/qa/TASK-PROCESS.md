# CUA Task Generation Process

How to build a web app and create hard CUA evaluation tasks for it. Follow this order — each step depends on the previous one.

> 📖 **Canonical principles live elsewhere.** This document covers
> clone-template-specific infrastructure (local `docker-compose.dev.yml`,
> per-clone `PORTS.md`, Vite proxy, the build → audit → fix → task loop).
> The universal CUA task-gen principles (12-category difficulty
> taxonomy, 4-class failure triage, 8 calibration anti-patterns, 30-rule
> audit checklist, GUI-only mandate) live in the mirror at
> [`mirrors/cua-clone-apps-taskgen.md`](./mirrors/cua-clone-apps-taskgen.md),
> which is synced from `collinear-ai/vibe-rl-gym` branch
> `tasks/clone-apps`. **Before authoring any new task, read the mirror
> and check vibe-rl-gym for updates to the canonical source.**

---

## Phase -1: Check QA status before writing any task (hard gate)

If the clone already has tasks (i.e. you are *extending* a task set, not
building a new one from scratch alongside the app), this phase runs first
and gates every other phase. It exists because writing tasks on top of
surfaces with known UI gaps, tempId races, or silent-failure mutations
produces tasks that look reasonable on paper and fail 100% in eval — and
the root cause is the clone, not the task.

Checklist:

1. Does `<CLONE_PATH>/QA_REPORT.md` exist?
   - **No** → run `pipeline/qa/QA_AUDIT.md` first. Do not write new tasks on a
     clone that has no QA baseline. The first task you write will bake in
     bugs you don't know exist and every future task will inherit them.
   - **Yes** → continue to step 2.

2. Open the report. Read the **Summary** health rating:
   - `red` → pause task authoring entirely. Wait for the P0 fixes from
     `pipeline/qa/QA_FIX_PROCESS.md` to land and the report to re-run green or
     yellow before proceeding.
   - `yellow` → continue, but respect the Task Impact restrictions in step 3.
   - `green` → continue freely.

3. Read the **Task Impact** section. Do not design new tasks that touch any
   surface marked `blocked` or `at_risk`. If a surface is `degraded`, it is
   usable but you must write the task to avoid asserting on the degraded
   behavior (and add a note in the task's `instruction.md` explaining why).

4. Read the **Recommended fixes** section. If any P0 fix is in-flight (PR
   open, not merged), prefer to wait for it to merge rather than design a
   task that will need to change once the fix lands.

This gate is not a suggestion — it is the feedback loop that closes the
build → audit → fix → task loop. Skipping it is how an eval batch ships
with 40% verifiable failures that look like "agent error" but are
really "clone bugs plus poorly-targeted tasks".

For brand-new clones that have never been audited (no tasks yet, no
report): run the full `pipeline/build/ORCHESTRATOR_BRIEF.md` pipeline through
Phase 6, then `pipeline/qa/QA_AUDIT.md`, then come back here for Phase 0.

---

## Phase 0: Choose Failure Modes Before Anything Else

Before picking an app domain or writing any code, decide which UI difficulty patterns you want to test. These are the proven failure modes from ~300 CUA eval trials across Odoo, Moodle, and Zendesk-clone:

| Fail Rate | UI Pattern | Example |
|-----------|-----------|---------|
| ~100% | Inline grid editing with narrow columns | Filling journal entry line items in Odoo |
| ~80% | Mode confusion (two similar actions, one correct) | Internal note vs public reply, "Log note" vs "Send message" |
| ~60% | Data-dependent reasoning (read, compare, decide) | "Find which org has the most urgent tickets and escalate only that one" |
| ~60% | Reading the wrong visually-similar column | Tax-inclusive vs tax-exclusive totals |
| ~50% | Multi-step stateful workflows | Create → assign → comment → escalate → resolve → CSAT |
| ~50% | Self-referential linking (entity A references entity B of same type) | Problem-incident ticket linking |
| ~40% | Multi-entity selective actions | 5 tickets, each needs a different status/assignee |
| ~30% | Deep menu navigation (3+ levels) | Admin > Objects and rules > Tickets > Fields |
| ~30% | Step budget exhaustion (8+ sub-goals) | Any task with too many independent actions |

**Pick 3-5 of these as your primary difficulty targets.** Every app feature and task should be designed to hit at least one.

### What does NOT work as difficulty

These patterns produce trivially easy tasks (<20% fail rate):

- Single-workflow CRUD (navigate to one page, fill form, save)
- Reading and summing numbers from a list view
- Date-range filtering
- Creating calendar events or basic entities
- Generous tolerances (>10% numeric, loose text matching)

---

## Phase 1: Design the App FOR the Failure Modes

Build features specifically because they produce hard UI interactions, not just because the real app has them.

### Feature checklist (map each to a failure mode)

| Feature | Failure Mode It Enables | Priority |
|---------|------------------------|----------|
| Reply composer with internal/public mode toggle | Mode confusion | Must have |
| Data tables with similar-looking columns | Wrong column read | Must have |
| Admin settings buried in nested sidebar | Deep navigation | Must have |
| Inline row editing in table views | Narrow click targets | High |
| Multi-step status workflow (new→open→pending→solved→closed) | Stateful workflows | High |
| Entity self-references (ticket links to another ticket) | Self-referential linking | High |
| Custom fields stored as JSONB | Complex form + verification | Medium |
| Bulk operations (select multiple, apply different actions) | Multi-entity selective | Medium |
| Macro/template system (one-click applies N actions) | Side-effect verification | Medium |

### App architecture requirements

- **Tool-server RPC pattern**: All mutations go through `POST /step` with `{tool_name, parameters}`. This gives you a programmatic API for `golden_apply.py` without needing ORM shells.
- **Direct DB access**: Verifiers query the database directly (SQL). Use PostgreSQL with plain-text columns for key fields (avoid JSONB for names/titles that verifiers need to check).
- **SPA with server-side fallback**: The frontend must serve `index.html` for all client-side routes so agents can navigate by URL.
- **Accessible UI elements**: Every clickable row, button, and link must be a proper `<a>`, `<button>`, or have ARIA roles. CUA agents interact via accessibility tree refs — `<div onClick>` is invisible to them.
- **Session-based auth**: Cookie-based login so the agent can authenticate via the browser.
- **Docker Compose**: 3 services minimum (database, app, seed). Reproducible from scratch with `make up`.

---

## Phase 2: Design Seed Data FOR the Tasks

Seed data is not demo data. Every record should exist because a specific task needs it.

### Principles

1. **Design the answer first, then seed the data.** If task T12 needs "Acme has the highest impact score of 13," seed Acme's tickets to produce exactly score=13. Don't seed random data and hope it works.

2. **Make answers deterministic.** No ties, no ambiguity. If the task asks "which agent is most overloaded?", one agent must have clearly more than the others.

3. **Seed enough entities for cross-entity reasoning.** You need 3+ organizations, 3+ agents, 20+ tickets to create meaningful comparison tasks. Fewer than that and the tasks become trivially small.

4. **Seed both "has data" and "doesn't have data" scenarios.** If a task asks "find tickets with no agent response," some tickets must have responses and some must not. The agent must distinguish.

5. **Verify seed data assumptions immediately.** After seeding, dump the actual DB and confirm every task's assumptions hold. We found 5 ID mapping bugs in our first audit because the seed API auto-incremented differently than expected.

### Seed data verification script

After `make up`, run:

```sql
-- Verify ticket assignments match task assumptions
SELECT id, subject, status, priority, assignee_id, organization_id, tags
FROM tickets ORDER BY id;

-- Verify comment distribution (which tickets have agent replies?)
SELECT tc.ticket_id, t.subject,
  COUNT(*) FILTER (WHERE tc.is_public = true) as public_replies,
  COUNT(*) FILTER (WHERE tc.is_public = false) as internal_notes
FROM ticket_comments tc JOIN tickets t ON tc.ticket_id = t.id
GROUP BY tc.ticket_id, t.subject ORDER BY tc.ticket_id;

-- Verify agent workloads
SELECT u.name, u.id,
  COUNT(*) FILTER (WHERE t.status NOT IN ('solved','closed')) as active_tickets
FROM tickets t JOIN users u ON t.assignee_id = u.id
GROUP BY u.id, u.name;
```

Run this BEFORE writing any task files. Fix the seed if the data doesn't match what you need.

---

## Phase 3: Build Tasks (One Domain at a Time)

### Per-task file structure

```
cua-zendesk-T01/
  task.toml           # metadata
  instruction.md      # what the agent sees (conversational, no steps)
  environment/
    services.sh       # starts the app
    setup.sh          # per-task DB edits + opens browser
  tests/
    golden_apply.py   # programmatic correct answer (WRITE THIS FIRST)
    verify.py         # SQL checks (write AFTER golden_apply)
```

### Build order per task (non-negotiable)

1. **instruction.md** — Write the instruction in conversational tone (colleague's email). No numbered steps, no menu paths. State the desired end-state.

2. **golden_apply.py** — Programmatically apply the correct answer using the tool-server API. This is your reference implementation. If you can't script the answer, the task is underspecified.

3. **verify.py** — Write SQL checks AFTER golden_apply. For each check, run the SQL against the golden state to confirm it returns the expected value. This catches verifier bugs before they masquerade as agent failures.

4. **Smoke test both directions:**
   - Negative: fresh DB → verify.py returns 0.0 (task isn't trivially passing)
   - Positive: golden_apply.py → verify.py returns 1.0 (verifier accepts the correct answer)

### Instruction writing rules

- Conversational tone, like an email from a colleague
- Never give numbered steps or menu paths
- State the desired end-state, not the process
- Include "Do not use browser developer tools, API calls, or any programmatic approach"
- Use ASCII `--` instead of em-dashes (Unicode breaks some input methods)
- Reference tickets by ID + subject hint: "ticket #5 (the SSO/Okta setup question)"

### Verifier rules

- All-or-nothing scoring: `reward = 1.0 if all checks pass else 0.0`
- 7-12 checks per task, each independent
- Exact match for enum fields (status, priority, role)
- Fuzzy match for text (ILIKE '%keyword%')
- `int(sql(...) or 0)` — never bare `int(sql(...))`, empty results crash
- Include `-h localhost` in psql calls when DB runs in Docker
- Emit structured JSON output with failure_mode tags
- Float precision guard: `aggregate >= 1.0 - 1e-9`

### Task difficulty targets

| Level | Checks | Sub-goals | Expected fail rate |
|-------|--------|-----------|-------------------|
| Easy (L1) | 5-7 | 2-3 | <30% — too easy, needs hardening |
| Medium (L2) | 7-10 | 4-6 | 30-50% — acceptable |
| Hard (L3) | 10-12 | 6-8 | 50-70% — target zone |
| Very hard | 12+ | 8+ | >70% — risk of step budget exhaustion |

---

## Phase 4: Smoke Test Everything

### Smoke test script

Build a single script that tests all tasks in both directions. See `tasks/smoke_test.py` for reference.

```bash
# Test all tasks (resets DB between each)
python tasks/smoke_test.py

# Test specific tasks
python tasks/smoke_test.py T01 T02

# Negative only (fast sanity check)
python tasks/smoke_test.py --negative-only --no-reset
```

### Common bugs caught by smoke tests

| Bug | Symptom | Fix |
|-----|---------|-----|
| `int(sql(...))` on empty result | verify.py crashes | Use `int(sql(...) or 0)` |
| psql can't connect to Docker | verify.py returns all empty | Add `-h localhost` |
| Wrong port in golden_apply | All positive tests fail | Match port to docker-compose |
| API response nesting | golden_apply succeeds but no DB changes | Check `response.observation.structured_content` path |
| Stale Docker cache | Frontend fixes not in running image | `docker compose build --no-cache` |
| Ticket ID assumptions wrong | Checks fail on correct golden state | Dump actual DB, compare to task assumptions |
| Seed data race condition | Intermittent failures | Add sleep/wait after `make up` before testing |

---

## Phase 5: Eval and Iterate

### Classification framework

After running a CUA agent against each task:

| Result | Classification | Action |
|--------|---------------|--------|
| reward=0.0, agent engaged correctly but missed details | **genuine_fail** | Ship it |
| reward=0.0, verifier bug (wrong SQL, bad assumption) | **task_bug** | Fix verifier, re-eval |
| reward=0.0, agent hit infra issue (timeout, crash) | **infra_error** | Re-run without changes |
| reward=1.0, agent solved in <50 steps | **too_easy** | Harden (add checks, tighten tolerances, add sub-goals) |
| reward=1.0, agent solved in 80+ steps | **borderline** | Keep — may fail on harder model settings |

### Hardening too-easy tasks

When a task passes, don't throw it away. Harden it:

1. **Tighten tolerances**: 15% → 3% numeric tolerance catches wrong-column-read
2. **Add mode-discrimination checks**: Require `is_public=false` with subtype check, not just `body ILIKE`
3. **Add sub-goals**: "Also create a summary ticket documenting what you did"
4. **Add data-dependent reasoning**: "Find the one with the highest X, then act on it"
5. **Add negative checks**: "Verify the agent did NOT accidentally do X" (e.g., no public leak of internal info)

### Shipping criteria

A task ships (moves from wip to shipped) when ALL of these are true:

1. golden_apply.py + verify.py agree (positive smoke test = 1.0)
2. Fresh DB + verify.py returns 0.0 (negative smoke test)
3. CUA agent eval returns reward=0.0 with genuine agent failure (not task bug)
4. Failure mode is tagged and documented
5. Task is in canonical directory layout

---

## Phase 6: Domain Expansion

After the first domain is stable (10+ shipped tasks), expand to the next domain. Each domain gets its own skill file documenting:

- Domain-specific failure modes discovered during eval
- SQL verification patterns that work vs break
- Seed data gotchas
- Common agent behaviors in that domain

### Recommended domain progression

| Order | Domain Type | Why This Order |
|-------|-------------|---------------|
| 1 | Core entity CRUD + workflows | Validates the app works, produces baseline difficulty data |
| 2 | Configuration / Admin | Tests deep navigation, form complexity |
| 3 | Cross-entity reasoning | Hardest tasks — requires data gathering across multiple pages |
| 4 | Reporting / Analytics | Tests numeric reasoning, comparison, file creation |

---

## Anti-Patterns (Things That Waste Time)

1. **Building 40 tasks before evaluating any.** The accounting-SKILL built 40 tasks, then discovered 10+ had verifier bugs. Build 5, eval 5, fix, then build more.

2. **Predicting difficulty without eval data.** You cannot guess which tasks are hard. Run the agent and measure.

3. **Hardcoding expected values for derived quantities.** If the number is computed (sum, average, tax-inclusive total), query it dynamically from the DB. Hardcoded values drift when seed data changes.

4. **Using `<div onClick>` instead of `<a href>` or `<button>`.** CUA agents navigate via accessibility tree. Non-semantic elements are invisible.

5. **Not testing the search feature.** If global search is broken, agents can't find entities. Test it end-to-end.

6. **Building the app first, tasks second.** Start from failure modes and design the app to produce them.

7. **Skipping golden_apply.** Every "genuine failure" without golden_apply validation is suspect. The accounting-SKILL's first batch had 0 golden_apply scripts — only 27% passed when they were finally tested.
