> ⚠️ **MIRROR — NOT THE SOURCE OF TRUTH**
>
> Canonical location:
> `collinear-ai/vibe-rl-gym` branch `tasks/clone-apps` at
> `.claude/skills/cua-clone-apps-taskgen/SKILL.md`.
>
> **Before authoring any new CUA task, `git fetch origin tasks/clone-apps`
> in `vibe-rl-gym` and diff against this mirror to pick up any updates.**
> This mirror is a snapshot and may be stale.
>
> - Mirror synced: 2026-04-22 from `vibe-rl-gym` commit `1aa8f13`.
> - Resync command:
>   ```bash
>   cd ~/vibe-rl-gym && git fetch origin tasks/clone-apps
>   git show origin/tasks/clone-apps:.claude/skills/cua-clone-apps-taskgen/SKILL.md \
>     | (echo "<banner-from-this-file>"; cat) \
>     > ~/clone-template/pipeline/qa/mirrors/cua-clone-apps-taskgen.md
>   ```
>
> **Scope note:** the infrastructure examples in this skill are scoped
> to Slack + Asana in the E2B `cua-eval-clones` template. The
> *principles* (12-category difficulty taxonomy, 4-class failure
> triage, 8 calibration anti-patterns, 30-rule audit, GUI-only mandate,
> seed-data adversarial-quality features, four-file task contract)
> apply to every clone. For clones that are not slack/asana
> (Spotify, Docs, Classroom, Gmail, Sheets, Notion, Zendesk, GitHub)
> you adapt the infrastructure patterns to each clone's local
> `docker-compose.dev.yml` / `PORTS.md` / Vite proxy — see
> `pipeline/qa/TASK-PROCESS.md` for that layer.

---

---
name: cua-clone-apps-taskgen
description: Design, generate, verify, and difficulty-calibrate hard CUA tasks for the Slack + Asana Docker-clone sandboxes (`cua-eval-clones` template). Self-contained — inlines the 12-category difficulty taxonomy, the 4-class failure triage (env_issue / verifier_bug / task_design / model_fail), the 8 calibration anti-patterns, and the seed-data adversarial-quality principles so this skill works even if the source docs on `vincent/cua` are unavailable. Calibration target is 0–33% pass rate against gpt-5.4 xhigh: a 0/3 ships unmodified iff every failure passes triage as `model_fail`. Covers per-clone DB schemas, REST API surface, the four-file task layout, the 30+ verifier rules, and the trap-pattern catalog adapted to chat + project-tracker UIs. Read `cua-clone-apps-env` first for the infrastructure side. Use whenever you are writing, auditing, or recalibrating a Slack-clone, Asana-clone, or dual-app CUA task.
argument-hint: [slack | asana | dual | task idea]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# Generating Hard CUA Tasks for the Slack + Asana Clone Sandboxes

This skill is the **task-author** companion to `cua-clone-apps-env`. The env skill covers the E2B template and per-task `services.sh` boot — assume it is built. This skill covers everything that happens *after* boot:

1. **§1 — Set up the env** (a fast pointer to `cua-clone-apps-env` with the must-know facts inlined; you should not have to context-switch for the common case).
2. **§2 — Write hard, high-quality tasks and verifiers** (instruction shape, verifier idioms specific to the two clones' DB schemas, the audit checklist, the trap catalog adapted to chat + project-tracker UIs).
3. **§3 — Calibrate to ~1/3 pass rate against gpt-5.4 xhigh** (when to add/remove requirements, which boundary skills work for these apps, the eval loop).

It is self-contained: everything needed to design, implement, verify, and calibrate a clone-apps task (no em-dashes, all-or-nothing scoring, GUI-only mandate, `golden_apply.py` agreement, the 30-rule audit, the 12-category difficulty taxonomy) is inlined here. You should not have to read any other skill to ship a task.

> **TL;DR generation contract.** A shippable task is a directory of 5 files (§2.1), passes all 30 audit rules (§2.7), has a `golden_apply.py` whose end-state makes `verify.py` print `1.0`, and lands at **0–33% pass rate** after at most 3 calibration iterations against gpt-5.4 xhigh, 150 steps. A `0/3` is shippable *unmodified* iff the §3.6 triage confirms every failure is `model_fail`, not `env_issue` / `verifier_bug` / `task_design`.

---

## 0. Core principles (the source of truth — read once, then apply)

This section compresses the principles that the rest of this skill operationalizes. The on-disk docs in `computer-use/` (`CUA_DIFFICULTY_TAXONOMY.md`, `CALIBRATION_PLAYBOOK.md`, `ERROR_ANALYSIS_PROCEDURE.md`, `VERIFIER_FIXES.md`, `GENERATION.md`, `synthesis_pipeline_cua/prompts/*`, the `cua-synthesis-loop` SKILL) all expand on these — but they live on a different branch (`vincent/cua`). Treat this section as authoritative if those files are absent.

### 0.1 Why these tasks are hard — the 12-category taxonomy

Pick a target category before designing a task. The verifier should fail when *that* failure mode fires.

| Class | Category | What breaks (concise) | % of CUA failures |
|---|---|---|---|
| Skill | **A. GUI grounding** | downsampled screenshots → pixel-precision miss; tiny icon targets; sliders / drag-drop | **40–60%** |
| Skill | **B. OCR** | reading long opaque strings off the screen (API keys, addresses) | — |
| Skill | **C. Workflow knowledge** | doesn't know `Insert > Chart`-class menu paths; multi-step wizards | — |
| Skill | **D. Scale / pagination** | bulk N-of-M ops; only reads page 1 of long lists | — |
| Skill | **E. Content fidelity** | regenerates content from scratch via UNO bridge → loses original wording | — |
| Skill | **F. State management** | doesn't notice/clean GIMP filter layers, autosave artifacts, lock files | — |
| Time | **G. Async / flipbook** | screenshots miss notifications, dropdown closes between captures | 21% (WebArena) |
| Time | **H. Looping / frozen exploration** | 5-22 min frozen loops, retries same fix forever | **15–25%** |
| Time | **I. Premature termination** | returns first plausible result; ignores filter / temporal / count constraints | — |
| Time | **J. Goal coherence drift** | forgets deliverable after step 50; gets distracted | — |
| Env | **K. Auth walls** | CAPTCHA / 2FA / anti-bot — anti-test, design around it | — |
| Env | **L. Bypass shortcuts** | terminal scripting / API calls / UNO bridge — block these or you test scripting, not CUA | — |
| Bound | **M. Error compounding** | per-step accuracy compounds; 95% × 50 steps = 8% task success | — |
| Bound | **N. Latency** | 75–94% of latency is LLM inference; each step ~3× slower as context grows | — |
| Bound | **O. Prompt injection** | architecturally unsolved; vendor problem, not task-design problem | up to 51% (VPI-Bench) |

For the Slack + Asana clones the dominant categories are **C** (deep menus, dynamic dropdowns), **D** (long member/task lists), **G** (WebSocket fan-out vs screenshot timing), **H** (chat-search loops), **I** (agent calls "done" before pinning the last message), and **L** (the GUI-only mandate is the lever that keeps the test honest).

### 0.2 The 4-class failure triage (apply BEFORE blaming the model)

Every failed run lands in exactly one of four buckets. Default to the first three when in doubt — mislabeling a task bug as a model failure corrupts eval data forever.

| Class | Detect by | Action |
|---|---|---|
| **1. env_issue** | 0 steps, exception in `result.json`, `setup.sh` crashed, sandbox died | Re-run; if reproducible, fix the env layer. Don't blame the model. |
| **2. verifier_bug** | high agent step count, screenshots show completed work, but verifier fails | Inspect `verifier/result.json`; if `aggregate_score > 0.5` but `reward = 0.0`, almost certainly a verifier bug. Fix the verifier. |
| **3. task_design** | instruction says X, verifier checks Y; or task is unsolvable as specified | Rewrite instruction OR verifier so they describe the same task. |
| **4. model_fail** | env clean, verifier sound, instruction unambiguous — agent just couldn't do it | **This is the signal.** Keep the task. A `0/3` of `model_fail` runs is a *shippable* hard task. |

A cheap detection trick: **if the same critical check fails identically across all 3 runs**, suspect verifier_bug or task_design first; if **different checks fail in different runs**, suspect model_fail.

### 0.3 The eight calibration anti-patterns (these are NOT calibration)

Every one of these fakes difficulty without changing what the agent must actually do. They corrupt the eval signal.

1. ❌ Promoting a non-critical check to critical without changing the instruction.
2. ❌ Dropping passing runs to lower the recorded score.
3. ❌ Making verifier checks stricter than what the instruction asks for.
4. ❌ Adding a verifier check for something the instruction doesn't mention.
5. ❌ Widening tolerances to let wrong answers pass.
6. ❌ Adding a requirement the agent **completely lacks** (always 0/3 — that's not at the boundary, it's beyond it).
7. ❌ Stacking 2+ new requirements at once (multiplicative failure: 50% × 50% = 25% → 3/3 jumps to 0/3, skipping 1/3).
8. ❌ Promoting a process check (`agent_used_GUI`, `clicked_X`) — only outcomes are legitimate signal.

The rule that operationalizes all eight: **the verifier always faithfully checks exactly what the instruction says — no more, no less. Calibration changes both files together, or it changes neither.**

### 0.4 The four-call dependency chain (and why writing order matters)

Each artifact reads everything earlier in the chain. Writing out of order produces a verifier that checks values nobody put in the seed and an instruction that demands sub-elements the setup never provisioned.

```
instruction.md  →  setup.sh  →  (data/, optional)  →  verify.py  →  golden_apply.py
   colleague        health-wait     seed files in       outcome         REST end-state
   email tone,      → seed →        /tmp/task_data/     checks          that makes
   8-25 lines       open Chrome     (rare for           on DB state     verify == 1.0
                                    clone-apps —
                                    state lives in
                                    the DBs)
```

Two-tier scoring inside `verify.py`: **CRITICAL** checks (content correctness, data values, structure) determine the reward; **NON-CRITICAL** checks (formatting, style names, margins) are diagnostic only. `reward = 1.0 iff every critical check passes`. There is no partial credit. Partial credit silently rewards near-miss agents and is the #1 way calibration signal goes bad.

### 0.5 Seed-data adversarial-quality features (when the task uses files, and most clone-apps tasks won't)

Carried over from `GENERATION.md`. If your task seeds a CSV / DOCX / PDF (rare for clone-apps but possible), these features prevent shortcutting:

- **Near-duplicate rows** placed 20+ rows apart so dedupe-by-eye fails.
- **Embedded blanks and irregularities** (missing fields, text in numeric columns).
- **Distractor values close to the answer** (so wrong picks look right).
- **Mixed formats within a column** (ISO vs prose dates, varied number formatting).
- **Repeated header rows** mid-file in long CSVs (so naive `header=0` parsing fails).

For DB seeding the analog is: distinct usernames that share a prefix (`devraj.patel` and `dev.kumar`), channel names that differ only in casing or hyphens (`q3-planning` vs `Q3 Planning`), tasks that share a title prefix across two different sections.

### 0.6 The GUI-only mandate is the difficulty lever

Empirical: pool_40_run1 showed ~30% of "passes" were terminal bypasses before `instruction_writer` rule 10a was added. After adding it, 0% of passes used shell commands. The single sentence *"Please complete this through the application UIs - do not open a terminal, edit files, or call any APIs"* converts L-class (bypass) failures back into A-class (grounding) and C-class (workflow knowledge) failures, which are the *interesting* signal. Every clone-apps instruction must end with this sentence.

### 0.7 The cost asymmetry that drives every other rule

Investigating a pipeline bug costs hours; mislabeling a pipeline bug as a model failure corrupts eval data forever. Therefore: **default to "pipeline bug" when in doubt**, log to the changelog, and only call something `model_fail` after the §3.6 triage clears every other class.

---

## 1. Setting up the clone-app environment

Read **`.claude/skills/cua-clone-apps-env/SKILL.md`** for the long version. Here is the minimum you need to start writing tasks.

### 1.1 The three-layer split

| Layer | Lives in | Built by | When it changes |
|---|---|---|---|
| **E2B template `cua-eval-clones`** | E2B servers, tied to the API key | `computer-use/env/build_clones.py` (one person, one time) | only when clone source or base deps change |
| **Per-task files** | `computer-use/tasks/clone-apps-wip/<subdomain>/<task>/` | **you** | every new task |
| **Orchestrator** `computer-use/orchestrator.py` | this repo | already written, generic | rarely; never per-task |

The template bakes in: Docker engine, both clone source trees (`/opt/slack-clone` + `/opt/asana-clone`), pre-built compose images, `postgresql-client`, and three launcher scripts in `/usr/local/bin/`:
- `start-slack.sh` — starts only the Slack stack (postgres on `5433`, app on `8040`, db `cloneapp`).
- `start-asana.sh` — starts only the Asana stack (postgres on `5435`, app on `8031`, db `asana_clone`).
- `start-clones.sh` — starts both (the common case).
- `open-clones-tiled.sh [dual|slack|asana]` — opens the apps as Chrome `--app` windows tiled side-by-side in a single Chrome process (so the agent sees both apps in every screenshot).

### 1.2 The four-file task contract (what the orchestrator reads)

The orchestrator (see `computer-use/orchestrator.py:793-816`) reads exactly these files. Anything else in the directory is ignored.

```
clone-apps-wip/<subdomain>/cua-clones-XX/
├── task.toml                # metadata + template + cpu/memory asks
├── instruction.md           # the prompt the agent sees
├── environment/
│   ├── services.sh          # each non-comment line is run BACKGROUNDED in parallel
│   ├── setup.sh             # one-shot, blocking, 300s timeout
│   └── data/                # (optional) files uploaded to /tmp/task_data/
└── tests/
    ├── verify.py            # prints {"reward": 1.0, ...} JSON last line
    └── golden_apply.py      # programmatic end-state — must make verify return 1.0
```

### 1.3 Minimal `task.toml` for a dual-app task

```toml
version = "1.0"

[metadata]
name = "cua-clones-XX"
author_name = "Collinear AI"
category = "clone-apps"
tags = ["cua", "slack", "asana", "gui-only"]
difficulty_explanation = "<one sentence; rewritten after calibration>"

[environment]
template     = "cua-eval-clones"
allow_internet = false
cpus         = 4
memory_mb    = 8192          # 6144 if single-clone; 8192 for both
storage_mb   = 15360

[verifier]
timeout_sec = 90              # 60 is too tight when both DBs are queried
```

### 1.4 Boilerplate `services.sh` and `setup.sh`

`services.sh` — pick the launcher matching the apps the task touches. **One line.** The `> /tmp/<name>.log 2>&1` redirect is mandatory: the orchestrator runs each line with `background=True, timeout=10` (`orchestrator.py:811`), and without an explicit stdout drain the child stalls silently — containers never boot. A/B verified 2026-04-18 on `cua-eval-clones`: without redirect `health[1..90] slack=000 asana=000`; with redirect both clones up in ~60 s.

```bash
# pick exactly one (always redirect — see paragraph above)
sudo /usr/local/bin/start-clones.sh > /tmp/start-clones.log 2>&1   # both apps (most tasks)
sudo /usr/local/bin/start-slack.sh  > /tmp/start-slack.log 2>&1    # slack only
sudo /usr/local/bin/start-asana.sh  > /tmp/start-asana.log 2>&1    # asana only
```

`setup.sh` — health-wait, per-task SQL/REST seeding, then open Chrome tiled. Note: **do not wrap `open-clones-tiled.sh` in `sudo`**. `setup.sh` runs as user `user`; the launcher's internal `pkill` / `rm /tmp/chrome-clones` / `google-chrome` / `xdotool` calls all want to run as that user. Running Chrome as root aborts with `Running as root without --no-sandbox is not supported`, and the agent sees an empty xfce desktop. Confirmed on 2026-04-18.

```bash
#!/bin/bash
export DISPLAY=:0

# 1) wait for BOTH stacks to be healthy AND SEEDED.
#    IMPORTANT: /health=200 fires as soon as the app boots, which is BEFORE
#    `docker compose run --rm seed` populates base users/orgs/teams. Per-task
#    seeding (SQL insert referencing org_001/team_001, or REST /auth/register
#    relying on organization_id='org_001' FK) FAILS SILENTLY if it races the
#    seed. The reliable "seed done" probe is: admin/admin login succeeds on
#    BOTH apps — admin is a seeded user, so login returns a token only after
#    seed has committed. Observed 2026-04-18: a plain /health wait caused
#    5/5 task smokes to fail with "missing Asana users" or "FK violation".
for i in $(seq 1 90); do
    slack_ok=$(curl -sf -X POST http://localhost:8040/api/login \
        -H 'content-type: application/json' \
        -d '{"username":"admin","password":"admin"}' 2>/dev/null | grep -c token)
    asana_ok=$(curl -sf -X POST http://localhost:8031/auth/login \
        -H 'content-type: application/json' \
        -d '{"username":"admin","password":"admin"}' 2>/dev/null | grep -c token)
    [ "$slack_ok" = "1" ] && [ "$asana_ok" = "1" ] && break
    sleep 2
done

# 2) per-task seeding (raw SQL or REST — see §2.4 for which to use)
# PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d cloneapp -c "..."
# PGPASSWORD=postgres psql -h localhost -p 5435 -U postgres -d asana_clone -c "..."

# 3) open both apps tiled in ONE Chrome process. `dual` is the default.
#    NO SUDO — see paragraph above this code block.
/usr/local/bin/open-clones-tiled.sh dual
exit 0
```

The instruction must tell the agent: *"You will see Slack on the left half of the screen and Asana on the right half. Click the app you want to interact with."* Do **not** say alt-tab — there is nothing to alt-tab to.

### 1.5 The Slack `?cua=1` helper (do not strip it)

Slack's `index.html` ships an in-page script that activates only when `?cua=1` appears in the URL. It (a) monkey-patches React's controlled-input value setter so synthetic X11 keystrokes survive the next render (without it, React reverts typed text inside ~100 ms), (b) auto-logs-in by polling for filled credential fields, and (c) installs Escape-to-focus and link-nav blocking. `open-clones-tiled.sh` already appends `?cua=1` to the Slack URL. **Never strip it.** If you write a task where the agent must visit a different Slack URL (e.g., `?cua=1#/channel/<id>`), keep the `?cua=1` query.

Asana has **no equivalent helper yet**. Until one is added to `Asana-Clone/app/frontend/asana-clone/index.html`, Asana login flows in the GUI are flaky. Workaround: pre-authenticate with curl and open Chrome at a post-login URL — see §2.4 example.

### 1.6 Resource floor (do not undershoot)

| Setting | Value | Why |
|---|---|---|
| `cpus` | 4 | dockerd + 3 containers per clone |
| `memory_mb` | 8192 (dual) / 6144 (single) | Vite rebuilds OOM at 4096 |
| `storage_mb` | 15360 | overlay2 is fine, but compose images + pgdata need headroom |
| `timeout_sec` | 90 | two `psql` round-trips per check on both DBs |

---

## 2. Writing hard, high-quality tasks and verifiers

These rules are distilled from `computer-use/GENERATION.md`, `CALIBRATION_PLAYBOOK.md`, `CUA_DIFFICULTY_TAXONOMY.md`, `VERIFIER_FIXES.md`, and the `synthesis_pipeline_cua/prompts/*.md` writer prompts. Treat them as the audit checklist a reviewer would run on a freshly-generated task.

### 2.1 The five files, in writing order

Write in **strict dependency order** so each step sees the prior outputs:

1. `instruction.md` — the prompt; everything downstream pins its values from here.
2. `environment/setup.sh` — seeds the desktop / DBs and opens Chrome.
3. `environment/data/*` — only if the task includes file inputs (rare for clone-apps; most state lives in the DBs).
4. `tests/verify.py` — checks the agent's end-state.
5. `tests/golden_apply.py` — programmatic end-state that makes `verify.py` return `1.0` (smoke test).

Then run the audit (§2.7), fix anything ERROR-level, then proceed to evaluation (§3).

### 2.2 Instruction design (the colleague-email tone)

The agent reads `instruction.md` once. Tone: a hurried colleague Slack-DMing you a request. Length: **8-25 lines**. No code fences, no markdown headers above level 2. Plain ASCII (no em-dashes, no smart quotes — they break xdotool, see audit rule R1).

**Hard rules** (every shippable task obeys all of them):

- **HR-1: Tell the agent WHAT, not HOW.** Forbidden: "open Settings > Workspace > Members > Add". Allowed: "add Sarah Chen as a member of the #q3-planning channel". The agent must discover GUI menu paths on its own.
- **HR-2: Pin every requirement to a specific value.** No "appropriate", "relevant", "several", "a few", "as needed", "if applicable". Replace with a concrete count, name, or phrase.
- **HR-3: Numeric specificity.** Counts must appear as digits in the instruction. *"Pin exactly 3 messages"*, not *"pin a few messages"*.
- **HR-4: Backticked phrases are LITERAL strings the verifier greps.** Reserve backticks ONLY for required output text and required filenames/IDs. Never backtick UI button names or example placeholders.
- **HR-5: Enumerate sub-elements.** If the deliverable has multiple parts (channels, projects, sections, messages), list them as a bullet list. The agent cannot infer a `paragraph_contains_X` check from an instruction that does not say `X`.
- **HR-6: GUI-only mandate.** End the instruction with a sentence like *"Please complete this through the application UI - do not open a terminal, edit any files directly, or call any APIs."* This was the single biggest difficulty-multiplier discovered in pool_40_run1 (rule 10a in the writer prompt; before adding it, ~30% of "passes" were terminal bypasses).
- **HR-7: Anchor in real seed values.** The instruction must reference at least one specific seed value (a channel name, a user, a task title) so the agent knows the data is the source of truth. This also kills the *"vague determiner"* failure mode (writer prompt rule 10).
- **HR-8: One closing sentence on where the work lands.** *"Apply changes via the Slack and Asana UIs."* No file save path — both clones store state in their DBs.

**Tone template (dual-app):**

> Hey - I am pulling together the Q3 planning kickoff. Two things, when you have a minute:
>
> 1. In Slack, create a private channel called `q3-planning`. Add Sarah Chen, Devraj Patel, and Mei Lin as members. Pin two messages to it: the kickoff message I drafted (`Kickoff: Q3 OKRs - read first.`) and the link to the Asana project below.
> 2. In Asana, create a project called `Q3 Planning` under the `Operations` team. Add three tasks under a `Discovery` section: `Confirm OKR scope`, `Schedule kickoff`, `Draft pre-read`. Assign them to Sarah, Devraj, and Mei in that order. Set their due dates to 2026-04-22, 2026-04-24, and 2026-04-29.
>
> You will see Slack on the left half of the screen and Asana on the right half. Click the app you want to interact with. Please complete this through the application UIs - do not open a terminal, edit files, or call any APIs.

That single instruction has **11 atomic checks** (1 channel created, 3 members added, 2 messages pinned, 1 project created, 3 tasks created with correct titles + assignees + due dates) — comfortably inside the 7-12 sweet spot for hard difficulty.

### 2.3 Trap patterns — what makes clone-app tasks hard

Trap patterns to embed in clone-apps tasks. Pick 1-2 traps per task; do not stack 4+ or you push to 0/3 (§0.3 anti-pattern #7).

| # | Trap | Where it bites in a clone task | Verifier hook |
|---|---|---|---|
| T1 | **Cross-app reconciliation** | Agent must carry an exact string (channel name, task ID, due date) from one app to the other. Mistypes single characters (`Cloudnex` → `Cloudex`). | `WHERE name = 'q3-planning'` in Slack DB AND `WHERE name = 'Q3 Planning'` in Asana DB; both must hit. |
| T2 | **Dynamic many-to-one dropdown** | Slack's "add user to channel" autocomplete; Asana's project/team picker. Agent must type-to-search, wait, click. Often grabs the wrong row. | Check FK column (e.g. `channel_members.user_id` resolves to the right user, not a similarly-named one). |
| T3 | **Stateful workflow** | Asana task: create → assign → set due date → mark blocked → add comment. Each is a separate UI flow; agent skips one. | One critical check per state transition. |
| T4 | **Form wizard with sub-records** | Slack channel-create with topic + description + privacy + initial members; Asana project-create with template + sections + custom fields. | Verify the parent row AND the child rows; both must exist. |
| T5 | **Deep menu navigation** | Slack: "Workspace settings → Permissions → Channel management → Who can archive channels". Asana: "Project actions → Customize → Add custom field". | SQL on the resulting setting/field row. |
| T6 | **Last-mile skip** | Agent fills 3 of 4 required fields, drops the last (e.g. assigns 2/3 tasks, leaves 1 unassigned). | All-or-nothing critical scoring across the N required rows. |
| T7 | **Invisible config** | Asana custom-field option list, Slack channel-notification override. No visible output until clicked. | Direct DB read of the config row. |
| T8 | **Search-pagination thoroughness** | Channel has 200 messages; agent searches once, picks a wrong match from page 1 instead of scrolling. | Verify the agent acted on the *correct* message ID, not just any message containing the keyword. |
| T9 | **React-input fragility** (Slack only — see §2.6) | Without `?cua=1`, React clobbers the agent's typed value inside 100 ms. | `?cua=1` is hard-coded by `open-clones-tiled.sh`; do not strip it. If you reproduce a bug here, file it; don't work around it. |
| T10 | **Flipbook async** | Slack's WebSocket push delivers a notification badge after the agent has moved on; agent acts on stale screenshot. | Verify the *final* DB state, not a particular screen. |
| T11 | **Conflicting seed data** | Pre-seed Slack DM and Asana task with contradictory due dates; instruction names the authoritative source. | Verify the deliverable matches the authoritative source's value, not the other. |
| T12 | **Strategic-shortcut bypass** | Agent abandons GUI mid-task and tries `psql` / `curl`. The HR-6 GUI mandate + `allow_internet=false` blocks this for outbound APIs but not for in-sandbox shells. | Audit rule R10 (`no_process_vetoes`) prevents adding *"agent didn't use a shell"* checks; instead, verify outcomes that REQUIRE the GUI (e.g. messages must have realistic `created_at` clusters that scripted inserts wouldn't produce — see §2.5 for tactics). |

### 2.4 Per-task seeding — pick SQL or REST per check

Both clones publish their Postgres ports to the host, so the simplest seeding is `psql` from `setup.sh` (template installs `postgresql-client`). **Two caveats** drive when to fall back to REST:

1. **Raw SQL skips the app's `audit_log` / WebSocket fan-out.** If a verifier check is "an audit_log entry exists for the seed channel's creation", the seed must use `POST /api/channels`, not `INSERT INTO channels`.
2. **Slack uses prefixed, zero-padded string IDs (`user_001`, `ch_003`, `msg_0042`).** Picking IDs collides easily with the seed pack. Either deliberately skip the range (`ch_task_001`) or compute `lpad(max(...)+1, 3, '0')`.

**SQL pattern (preferred for plain row inserts):**

```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d cloneapp -c "
INSERT INTO channels (id, workspace_id, name, topic, is_private, created_at)
VALUES ('ch_task_001', 'ws_001', 'q2-archive', 'Old Q2 work', false, NOW() - INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;
"
```

**REST pattern (use when audit_log / fan-out matters or for Asana auth):**

```bash
# Asana login + create a pre-existing project that the task references
curl -s -c /tmp/asana.jar -X POST http://localhost:8031/api/login \
    -H 'content-type: application/json' \
    -d '{"username":"sarah.connor","password":"password"}' >/dev/null
curl -s -b /tmp/asana.jar -X POST http://localhost:8031/api/projects \
    -H 'content-type: application/json' \
    -d '{"name":"Q2 Retro","team_id":"team_001"}' >/dev/null
```

**Order of operations in `setup.sh` matters:** health-wait → seed (SQL or REST) → open Chrome. Otherwise Chrome's React cache shows the pre-seed state.

### 2.5 Verifier patterns specific to the two clones

The full verifier-writer rules live in `computer-use/synthesis_pipeline_cua/prompts/verifier_writer.md`. Here is the **clone-apps-specific subset**, with the exceptions the writer prompt does not yet cover.

#### 2.5.0 How the orchestrator consumes verifier output (the contract)

1. **Upload.** `tests/verify.py` (preferred) or `verify.py` (fallback) is read from disk and written to `/home/user/verify.py` inside the sandbox. Optionally, if `tests/golden.json` exists it is uploaded to `/home/user/golden.json` and any `os.path.join(os.path.dirname(__file__), "golden.json")` literal in the verifier is rewritten to `/home/user/golden.json`.
2. **Dependency preinstall.** If the verifier source text contains the literal string `openpyxl`, `pip install -q openpyxl` runs first. No other auto-installs — anything else you import must be stdlib or already baked into the template (`postgresql-client` is, `psycopg2` is NOT).
3. **Execute.** `python3 /home/user/verify.py` runs with a **hard 30-second timeout** inside the sandbox. `[verifier].timeout_sec` in `task.toml` is NOT currently plumbed through — the 30s ceiling applies regardless. If your verifier can't finish in 30s, batch SQL into a single `psql` command per DB (one round-trip that returns a TSV of all check values) instead of N sequential round-trips. Going over 30s is a pipeline-level `task_design` failure, not a model failure.
4. **Parse (primary path).** The orchestrator reads stdout, locates the **last non-empty line**, and parses it as JSON. The parsed dict must contain a numeric `"reward"` key (0.0–1.0). That value is written to `<trial_dir>/reward.txt`.
5. **Persist.** The pretty-printed JSON is written to `<trial_dir>/verifier/stdout.json` — always valid JSON, safe to `jq` / `json.load` / open in any editor. `stderr` (per-check PASS/FAIL diagnostics, free-form) lands in `<trial_dir>/verifier/stderr.txt`. `exit_code` lands in `<trial_dir>/verifier/exit_code.txt`. Non-zero exit codes do NOT by themselves fail the task — only the parsed reward matters.
6. **Parse (fallback).** If JSON parsing fails on the last line, the orchestrator scans stdout bottom-up for the first `float(...)`-parseable line and uses that — preserving reward extraction even from legacy/broken verifiers. In that case, raw stdout is saved to `verifier/stdout.raw`, and a short note is written to `verifier/parse_error.txt` explaining what went wrong. Treat `parse_error.txt` existing as a soft signal of a `verifier_bug`.

**Contract for the verifier**: print **exactly one line** to stdout — a JSON object with a numeric `"reward"` field. Everything else goes to stderr. Top-level `try/except` (audit rule R24) ensures the verifier always emits valid JSON, even on crashes.

#### 2.5.0b The `deliverables/` rollout convention (catch task bugs offline)

**Problem.** When a task scores `0/3` you need to decide: `model_fail` or `verifier_bug`/`task_design`? The §3.6 triage asks you to inspect whether screenshots match what the verifier accepted or rejected. For desktop tasks (ODF files) the orchestrator already downloads the deliverable files to `<trial_dir>/artifacts/`, so you can re-parse them offline. For clone-apps tasks the deliverable is **DB state** — ephemeral, lost the moment the sandbox is killed. Without a snapshot, you cannot re-run the verifier against the agent's actual end-state, cannot sanity-check an SQL predicate, cannot replay a hypothesis-fix to the verifier against a known-to-be-"correct" or "incorrect" DB.

**What the stock orchestrator already saves** (`computer-use/orchestrator.py:928-981`, the `finally` block after verification):

```
<trial_dir>/
├── step_*.png                 # per-step screenshots
├── traj.jsonl                 # actions and thoughts
├── reward.txt                 # just the float
├── verifier/
│   ├── stdout.txt             # the verifier's JSON + reward line
│   ├── stderr.txt             # per-check PASS/FAIL lines
│   └── exit_code.txt
├── artifacts/
│   ├── <any Desktop or Downloads files>   # auto-sweep of /home/user/{Desktop,Downloads}/*.*
│   └── <any files the agent wrote under /home/user/{Desktop,Downloads}/>
└── result.json                # summary
```

**The `deliverables/` subtree** — created by the orchestrator's `finally` block, populated with both clone DB dumps (`pg_dump` against `localhost:5433` / `localhost:5435`) plus anything the verifier chose to drop under `/home/user/deliverables/`.

**The division of labour**:

- **The orchestrator** (after the `deliverables/` patch is landed; see §2.5.0c) is authoritative for DB snapshots. In its `finally` block it runs `pg_dump` against `localhost:5433` (Slack) and `localhost:5435` (Asana) inside the sandbox, pipes through `gzip`, and saves both files to `<trial_dir>/deliverables/`. This runs **even if the verifier crashed**, so state is never lost.
- **The verifier** is authoritative for per-check diagnostics. It may additionally write anything it wants under `/home/user/deliverables/` — `verifier_result.json` (a copy of its stdout JSON), `verifier_stderr.log` (a copy of the PASS/FAIL lines), attachment bytes the agent uploaded, etc. The orchestrator sweeps `/home/user/deliverables/*` alongside the pg_dumps.

Resulting rollout layout:

```
<trial_dir>/
├── step_*.png
├── traj.jsonl
├── reward.txt
├── verifier/{stdout,stderr,exit_code}.txt
├── artifacts/                 # /home/user/{Desktop,Downloads}/ sweep
└── deliverables/
    ├── slack_dump.sql.gz      # orchestrator: pg_dump -h localhost -p 5433 cloneapp
    ├── asana_dump.sql.gz      # orchestrator: pg_dump -h localhost -p 5435 asana_clone
    ├── verifier_result.json   # (verifier, optional) its own stdout JSON
    ├── verifier_stderr.log    # (verifier, optional) PASS/FAIL tail
    └── files/                 # (verifier, optional) attachments etc.
        └── ...
```

**Offline re-verification workflow** — why this pays for itself:

```bash
# 1. Spin up a bare local postgres (or reuse the template's pre-built image)
docker run -d --name verify_slack -p 15433:5432 -e POSTGRES_PASSWORD=postgres postgres:16
docker run -d --name verify_asana -p 15435:5432 -e POSTGRES_PASSWORD=postgres postgres:16

# 2. Restore the trial's end-state
gunzip -c <trial_dir>/deliverables/slack_dump.sql.gz | psql -h localhost -p 15433 -U postgres cloneapp
gunzip -c <trial_dir>/deliverables/asana_dump.sql.gz | psql -h localhost -p 15435 -U postgres asana_clone

# 3. Re-run the verifier with patched ports, OR run ad-hoc SQL to inspect
psql -h localhost -p 15433 -U postgres cloneapp -c "SELECT * FROM channels WHERE name LIKE 'q3%'"
```

This is the mechanism that lets you distinguish `model_fail` from `verifier_bug`:

- If the re-run verifier still says `0.0` AND ad-hoc SQL shows the channel is missing → `model_fail`. Ship the 0/3.
- If the re-run verifier says `0.0` but ad-hoc SQL shows the channel IS present with the right name → `verifier_bug` (probably a broken `LIKE` pattern, a case-mismatch, or a missing join). Fix verifier, re-run locally, then re-run on E2B.
- If ad-hoc SQL shows a *similar* but not exact channel (`Q3 Planning` instead of `q3-planning`) → arguably `task_design` (instruction didn't pin casing) OR a legitimate `model_fail` if the instruction used backticks to pin it. Decide per §0.3 anti-pattern rule #3.

#### 2.5.0c Implementation — what's already in the orchestrator, what's optional in the verifier

**A. What the orchestrator does for you** (`computer-use/orchestrator.py`, inside the `finally:` block; landed on this branch). You do not need to copy this into tasks:

```python
# For each clone DB, pg_dump from the sandbox shell (the port is published
# locally by the compose stack), gzip, download to trial_dir/deliverables/.
dump_specs = [
    ("5433", "cloneapp",    "slack_dump.sql.gz"),
    ("5435", "asana_clone", "asana_dump.sql.gz"),
]
for port, db, out_name in dump_specs:
    dump_cmd = (
        f"PGPASSWORD=postgres pg_dump -h localhost -p {port} "
        f"-U postgres --data-only --no-owner {db} 2>/dev/null "
        f"| gzip > /tmp/{out_name}"
    )
    res = desktop.commands.run(dump_cmd, timeout=60)
    if res.exit_code == 0:
        dump_bytes = desktop.files.read(f"/tmp/{out_name}", format="bytes")
        (deliverables_dir / out_name).write_bytes(bytes(dump_bytes))

# Then sweep anything the verifier dropped under /home/user/deliverables/*
```

Single-clone tasks (Slack-only or Asana-only) harmlessly skip the dump for the unreachable port — an empty `deliverables/<clone>_dump.sql.gz` slot just doesn't exist for those runs.

**B. What the verifier MAY write** (optional; only if you want extra artifacts beyond the DB dumps):

```python
DELIV = "/home/user/deliverables"
os.makedirs(DELIV, exist_ok=True)

# After computing and printing the JSON result:
result_line = json.dumps(result_obj)
print(result_line)  # the only stdout line — orchestrator json.loads it

# (Optional) archive the JSON itself — useful when triaging trials where the
# orchestrator's stdout capture was truncated, or where you want to diff the
# per-check breakdowns across many trials.
try:
    with open(f"{DELIV}/verifier_result.json", "w") as f: f.write(result_line)
except Exception: pass
```

If the task involves the agent uploading a file to Slack (the `files` table holds a Postgres large-object ID and a server filesystem path), the verifier can copy the bytes out of the Slack container volume into `/home/user/deliverables/files/<original_filename>` for offline inspection.

**C. Audit rule.** Because the orchestrator now owns DB dumping, there is **no per-task obligation** to emit DB dumps from the verifier — that work is done for you. The clone-apps audit rule therefore reads:

- **★C7 `deliverables_dir_respected`**: if the verifier writes anything beyond its stdout/stderr (e.g. a copy of its JSON result, attachment bytes, computed intermediate values worth preserving), it writes to `/home/user/deliverables/`, not elsewhere — so the orchestrator's sweep picks it up. Pure-stdout verifiers (no extra artifacts) pass this rule vacuously.

#### 2.5.1 The mandatory output shape

`verify.py` MUST emit **exactly one line** to stdout — a JSON object with a numeric `"reward"` field. The orchestrator `json.loads` that line, extracts `reward` → `reward.txt`, and pretty-prints the whole object to `verifier/stdout.json`. Diagnostics go to stderr.

```python
#!/usr/bin/env python3
import json, os, subprocess, sys, traceback

SLACK = dict(host="localhost", port="5433", user="postgres", db="cloneapp")
ASANA = dict(host="localhost", port="5435", user="postgres", db="asana_clone")

def sql(conn, q):
    env = {**os.environ, "PGPASSWORD": "postgres"}
    r = subprocess.run(
        ["psql", "-h", conn["host"], "-p", conn["port"], "-U", conn["user"],
         "-d", conn["db"], "-tAc", q],
        capture_output=True, text=True, env=env, timeout=15,
    )
    return r.stdout.strip()

try:
    categories = []
    slack_checks = []

    # --- channel created ---
    try:
        n = sql(SLACK, "SELECT count(*) FROM channels WHERE name = 'q3-planning' AND channel_type = 'private'")
        ok = (n == "1")
        slack_checks.append({"name": "channel_q3_planning_created_private", "passed": ok, "critical": True})
        if not ok:
            slack_checks[-1]["failure_detail"] = f"expected 1 private channel, found {n}"
        print(f"CRITICAL {'PASS' if ok else 'FAIL'}: channel_q3_planning_created_private", file=sys.stderr)
    except Exception as e:
        slack_checks.append({"name": "channel_q3_planning_created_private",
                             "passed": False, "critical": True,
                             "failure_detail": str(e)[:200]})

    # ... 6-10 more checks ...

    categories.append({"slack": {"weight": 0.5,
                                  "score": 1 if all(c["passed"] for c in slack_checks if c["critical"]) else 0,
                                  "checks": slack_checks}})

    # --- asana checks (mirror) ---

    all_checks = [c for cat in categories for ch in cat.values() for c in ch["checks"]]
    crit = [c for c in all_checks if c.get("critical")]
    crit_pass = all(c["passed"] for c in crit)
    crit_fail = [c["name"] for c in crit if not c["passed"]]
    agg = sum(1 for c in all_checks if c["passed"]) / len(all_checks) if all_checks else 0.0

    print(json.dumps({
        "reward": 1.0 if crit_pass else 0.0,
        "passed": crit_pass,
        "aggregate_score": round(agg, 3),
        "critical_checks_passed": crit_pass,
        "critical_failures": crit_fail,
        "categories": categories,
    }))
except Exception as e:
    print(json.dumps({
        "reward": 0.0, "passed": False, "aggregate_score": 0.0,
        "critical_checks_passed": False,
        "critical_failures": [f"verifier_crash:{type(e).__name__}"],
        "categories": [], "crash_trace": str(e)[:500],
    }))
```

#### 2.5.2 Calibration rules (carried over from `verifier_writer.md` — these are MANDATORY)

- **CR-13 NEVER require exact verbatim text.** Use case-insensitive substring or 3-5 distinctive keywords. The agent is not a copy-paste machine.
- **CR-14 5% numeric tolerance** for any computed value (counts, durations, message indices). Hard equality is only legitimate for IDs and enum values.
- **CR-15 At least 2 critical checks must verify SEED-DERIVED values.** Pure structural checks (file exists, channel exists) are baseline; *content* (the right user was added, the right text was pinned) is the test.
- **CR-19c Negative checks.** Include at least one critical check that something is NOT present (no extra channels, no stray DMs, no extraneous tasks). Catches sloppy completions.
- **CR-20b Critical checks must map to instruction sentences.** If `verify.py` checks for `channel_topic_set` but `instruction.md` never says "set the channel topic", demote to non-critical or remove. The audit rule `verifier_critical_alignment` enforces this by tokenizing check names and grepping the instruction for content-bearing tokens — name your checks so the keyword the instruction uses appears literally.
- **CR-7 No process vetoes.** Forbidden: `agent_used_terminal`, `veto_called_curl`, `clicked_X_button`. Only check observable end-state.

#### 2.5.3 SQL idioms specific to these clones

**Slack-clone DB (`cloneapp`, port 5433, 42 tables).** Notable tables: `workspaces`, `users`, `channels`, `channel_members`, `messages`, `mentions`, `reactions`, `pins`, `bookmarks`, `saved_items`, `files`, `dms`, `dm_members`, `threads`, `audit_log`. IDs are prefixed-padded strings (`ch_003`).

```python
# Membership: join with users to assert by username
sql(SLACK, """
SELECT count(*) FROM channel_members cm
JOIN channels  c ON c.id = cm.channel_id
JOIN users     u ON u.id = cm.user_id
WHERE c.name = 'q3-planning' AND u.username IN ('sarah.connor','devraj.patel','mei.lin')
""")  # expect "3"

# Pinned messages — match by body keywords (CR-13 substring)
sql(SLACK, """
SELECT count(*) FROM pins p
JOIN messages m ON m.id = p.message_id
JOIN channels c ON c.id = m.channel_id
WHERE c.name = 'q3-planning'
  AND lower(m.content) LIKE '%kickoff%' AND lower(m.content) LIKE '%q3%'
""")  # expect "1"
```

**Asana-clone DB (`asana_clone`, port 5435, 37 tables).** Notable tables: `organizations`, `users`, `teams`, `team_members`, `projects`, `project_members`, `sections`, `tasks`, `task_projects`, `task_followers`, `task_dependencies`, `comments`, `mentions`, `activity_log`, `tags`, `custom_fields`, `task_custom_field_values`, `notifications`. IDs are also prefixed-padded.

```python
# Tasks with assignee + due date in correct section
sql(ASANA, """
SELECT count(*) FROM tasks t
JOIN sections s ON s.id = t.section_id
JOIN projects p ON p.id = s.project_id
JOIN users u    ON u.id = t.assignee_id
WHERE p.name = 'Q3 Planning' AND s.name = 'Discovery'
  AND t.title IN ('Confirm OKR scope','Schedule kickoff','Draft pre-read')
  AND u.username IN ('sarah.connor','devraj.patel','mei.lin')
  AND t.due_date BETWEEN '2026-04-22' AND '2026-04-29'
""")  # expect "3"

# Negative check (CR-19c): no stray sections
sql(ASANA, """
SELECT count(*) FROM sections s JOIN projects p ON p.id = s.project_id
WHERE p.name = 'Q3 Planning' AND s.name NOT IN ('Discovery')
""")  # expect "0"
```

#### 2.5.4 Common verifier traps (ported from `VERIFIER_FIXES.md`, adapted)

- **Raw SQL inserts skip `audit_log`.** If a check reads `audit_log`, the seed MUST use the REST API. Same goes for WebSocket-driven fields like `messages.last_seen_by`.
- **Timestamps drift.** Never compare timestamps with `=`; use `>= setup_start` or `BETWEEN` ranges. Both clones stamp `created_at` with `NOW()` server-side.
- **`is_private` defaults differ.** Slack's `channels.channel_type` defaults to `false`; if the instruction says "private channel", explicitly assert it. Don't assume.
- **Asana `task_projects` is a join table** — a task can belong to multiple projects. Always join through `task_projects`, not by hypothetical `tasks.project_id` (it doesn't exist).
- **Username vs display name.** Slack `users.username` is the @-handle (`sarah.connor`); `users.display_name` is the rendered string ("Sarah Connor"). Most verifier checks should hit `username` (stable); only check `display_name` when the instruction explicitly says to set it.
- **Verifier crashes on empty result.** Wrap every `[index]` in `try/except`, prefer `.get()`, and check `if rows:` before subscripting. Unprotected subscripts are the #1 cause of `verifier_crash` (writer prompt rule 5b).
- **90s `verifier.timeout_sec`**, not 60. Two `psql` round-trips per check on two DBs adds up.

### 2.6 The `golden_apply.py` smoke test (mandatory)

Every shippable task ships with `tests/golden_apply.py` — a Python script that programmatically produces the correct end-state via REST. It is run by the smoke harness to prove the verifier *agrees* with the instruction. Without it, you ship tasks where verifier and instruction silently diverge and the agent gets blamed.

Smoke contract:

1. Boot a fresh sandbox (`services.sh` + `setup.sh` only).
2. Run `python /tmp/tests/golden_apply.py` inside the sandbox.
3. Run `python /tmp/tests/verify.py`.
4. Assert the JSON `reward == 1.0`.
5. Wipe the sandbox, boot fresh again, **don't** run golden_apply, run verify.
6. Assert `reward == 0.0` (verifier doesn't trivially pass on empty state).

Use REST, not raw SQL, because that is what the agent's GUI does — it exercises the same code paths (audit_log, fan-out, FK resolution) the verifier checks against.

**Endpoint facts (verified 2026-04-18 against the committed clone sources under `computer-use/env/files/{slack,asana}-clone/app/server.py`):**

- **Slack** — mostly REST:
  - `POST /api/login` — NOT `/api/auth/login`. Body `{"username": "...", "password": "..."}`. Session cookie set.
  - `POST /api/channels` — body `{"name": "...", "is_private": bool, "invite_members": [<user_id>, ...]}`. **invite_members wants user IDs, not usernames** — resolve with `GET /api/users` first and map by `u.username`.
  - `POST /api/channels/<id>/messages` — body `{"content": "..."}` (the column is `content`, not `body`).
  - `POST /api/messages/<id>/pin` — no body.
  - `POST /api/channels/<id>/members` — body `{"user_id": "..."}` (again, ID not username).
  - Default superuser: `admin`/`admin`. Other seeded users: password `password`.
- **Asana** — **dispatcher-style, NOT RESTful.** The app exposes only:
  - `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me`.
  - `POST /step` — body `{"tool_name": "<name>", "parameters": {...}}`. THIS is how every domain mutation happens: `create_project`, `create_section`, `create_task`, `update_task`, `add_team_member`, `get_users`, `add_comment`, etc.
  - `GET /tools` — live catalog of tool names + schemas; use this to discover parameter shapes.
  - `POST /reset`, `GET /snapshot`, `GET /health`.
  - **No `/api/projects`, `/api/sections/<id>/tasks`, etc — they 404.** Trying RESTful Asana paths was the #1 smoke-test failure on 2026-04-18.
- **requests may not be installed in the sandbox's system Python** — the clone-apps smoke harness runs `python3 golden_apply.py` on a fresh sandbox where the `requests` package is NOT baked in. Every `golden_apply.py` must handle this:

```python
import subprocess, sys
try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests"])
    import requests
```

```python
#!/usr/bin/env python3
"""golden_apply.py - produces the canonical end-state via REST.
Run inside the sandbox. Must make tests/verify.py print reward=1.0."""
import subprocess, sys
try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests"])
    import requests

SLACK, ASANA = "http://localhost:8040", "http://localhost:8031"

s = requests.Session()
s.post(f"{SLACK}/api/login",
       json={"username": "admin", "password": "admin"}).raise_for_status()

# Resolve usernames → user IDs (channels.invite_members wants IDs)
users = {u["username"]: u["id"] for u in s.get(f"{SLACK}/api/users").json()}
member_ids = [users["devraj.patel"], users["mei.lin"]]

ch = s.post(f"{SLACK}/api/channels",
            json={"name": "q3-planning", "channel_type": "private",
                  "invite_members": member_ids}).json()

m1 = s.post(f"{SLACK}/api/channels/{ch['id']}/messages",
            json={"content": "Kickoff: Q3 OKRs - read first."}).json()
m2 = s.post(f"{SLACK}/api/channels/{ch['id']}/messages",
            json={"content": "Linked Asana project: Q3 Planning"}).json()
for m in (m1, m2):
    s.post(f"{SLACK}/api/messages/{m['id']}/pin").raise_for_status()

a = requests.Session()
a.post(f"{ASANA}/auth/login",
       json={"username": "admin", "password": "admin"}).raise_for_status()

def step(tool, **params):
    r = a.post(f"{ASANA}/step",
               json={"tool_name": tool, "parameters": params})
    r.raise_for_status()
    return r.json()

# Look up the user IDs Asana uses (get_users tool — default scope)
au = step("get_users", limit=200)
ausers = {u["username"]: u["id"] for u in au.get("users", [])}

proj = step("create_project", name="Q3 Planning", team_id="team_001")
sec  = step("create_section", project_id=proj["project"]["id"], name="Discovery")
for title, user, date in [
    ("Confirm OKR scope", "sarah.connor",  "2026-04-22"),
    ("Schedule kickoff",  "devraj.patel",  "2026-04-24"),
    ("Draft pre-read",    "mei.lin",       "2026-04-29"),
]:
    step("create_task",
         section_id=sec["section"]["id"],
         title=title, assignee_id=ausers[user], due_date=date)
```

Exact parameter names per tool may vary — `GET http://localhost:8031/tools` inside the sandbox to confirm before writing `golden_apply.py`. (Subagent 004 discovered this pattern on its own during smoke; keep it consistent across tasks.)

### 2.7 The audit checklist (30 rules, ERROR-blocking ones starred)

Run mentally on every task before evaluating. The synthesis pipeline's `audit.py` codifies these as automated checks; for hand-authored tasks, scan the list. ★ rules block convergence; ☆ rules log only.

| # | Rule | Source file |
|---|---|---|
| ★1 | `no_em_dashes` (U+2014 anywhere) — breaks xdotool | instr / setup / verify |
| ☆2 | `no_smart_quotes` (U+2018/2019/201C/201D) | instr / verify |
| ★3 | `setsid_nohup` — every GUI app launched with `setsid nohup … &` | setup |
| ☆4 | `setup_exit_zero` — trailing `exit 0` | setup |
| ☆5 | `setup_seeds_from_tmp` — references `/tmp/task_data/` if `data/` exists | setup |
| ☆6 | `setup_noise_files` — desktop noise files (NOT required for clone-apps tasks since the deliverable is DB state, not a desktop file; safe to skip) | setup |
| ★7 | `packages_consistent` — every app in setup is in `task.toml` packages or already in template | setup / toml |
| ★8 | `all_or_nothing` — `reward = 1.0 if crit_pass else 0.0`, never partial | verify |
| ☆9 | `no_gimmicks` — no exact hex colors, no <5% tolerance | verify |
| ★10 | `no_process_vetoes` — no `veto_called_*`, no `used_terminal`, no `clicked_X` | verify |
| ★11 | `total_checks_matches` — declared `n_checks` == actual `checks_passed += 1` count | verify |
| ★12 | `xfconf_validated` — N/A for clone-apps | — |
| ★13 | `file_reads_protected` — every `open()` outside try/except | verify |
| ☆14 | `format_agnostic` — N/A for clone-apps (no file deliverable) | — |
| ☆15 | `instruction_alignment` — requirements count vs check count match | verify / instr |
| ★16 | `task_toml_valid` — `[metadata]`, `[environment]`, `template = "cua-eval-clones"` | toml |
| ★17 | `instruction_alignment` — every critical check name has a matching content token in the instruction | verify / instr |
| ★18 | `file_reads_protected` — JSON parses wrapped | verify |
| ★19 | `format_agnostic_subscripts` — `.get()` over `[]` for dicts; `if len(rows) > i` for lists | verify |
| ☆20 | `setup_absolute_paths` — `/home/user/Desktop/` not `~/Desktop/` (less critical for clone-apps; matters only if you do drop noise files) | setup |
| ★21 | `setup_no_shell_injection` — no unescaped `$` in double-quoted paths | setup |
| ☆22 | `setup_gui_app_wait` — `sleep 3-6` after launching Chrome | setup |
| ☆23 | `verifier_subscript_safety` — see #19 | verify |
| ★24 | `verifier_json_crash_wrap` — top-level `try / except`, JSON fallback on crash | verify |
| ☆25 | `verifier_critical_alignment` — restated for emphasis: critical check names share content tokens with instruction | verify |
| ★26 | `instruction_no_vague_terms` — no "appropriate", "relevant", "several" | instr |
| ☆27 | `instruction_backticks_in_verifier` — every backticked phrase in instruction is grepped by verifier | instr / verify |
| ☆28 | `seed_filenames_distinctive` — N/A for clone-apps | — |
| ☆29 | `seed_filename_length` — basenames ≤ 45 chars (only relevant if you ship `data/` files) | data |
| ☆30 | `seed_data_volume` — seed files ≥ 15 lines (only if you ship `data/`) | data |

**Clone-apps-specific additions** (not yet in `audit.py`):

| # | Rule | What to check |
|---|---|---|
| ★C1 | `health_wait_present` | `setup.sh` polls both health endpoints (or the relevant one) before `psql` and before opening Chrome |
| ★C2 | `cua_query_param` | Slack URLs in setup or instruction include `?cua=1` |
| ★C3 | `chrome_layout_launcher_used` | `setup.sh` ends with `/usr/local/bin/open-clones-tiled.sh <mode>` — **NO sudo** (Chrome aborts as root; confirmed 2026-04-18) |
| ★C3b | `services_log_redirect` | every non-comment line in `services.sh` ends with `> /tmp/<name>.log 2>&1` (orchestrator's `background=True, timeout=10` stalls without an explicit stdout drain) |
| ★C3c | `slack_messages_column` | any `messages` table check uses `.content`, never `.body` (init.sql defines `content TEXT NOT NULL`) |
| ★C4 | `verifier_timeout_min` | `task.toml` `[verifier].timeout_sec >= 90` |
| ★C5 | `golden_apply_present` | `tests/golden_apply.py` exists and uses REST (not raw SQL) for any audit_log-touching check |
| ☆C6 | `seed_ids_safe` | per-task SQL inserts use prefixed IDs like `ch_task_*` to avoid collision with the seed pack |
| ★C7 | `deliverables_snapshot_emitted` | `verify.py` dumps both clone DBs (or the one DB for single-clone tasks) to `/home/user/deliverables/{slack,asana}_dump.sql.gz` BEFORE running any checks, and copies its own JSON result to `deliverables/verifier_result.json` after printing. See §2.5.0b/c. |

### 2.8 Scoring is binary

`reward = 1.0 if all critical checks pass else 0.0`. Period. The aggregate score in the JSON is for diagnostics only — partial credit silently rewards near-miss agents and corrupts calibration signal. A trial returning `reward = 0.5` or `0.7` is therefore always a `verifier_bug` (§0.2) and the fix is to make the verifier all-or-nothing, not to interpret the fraction.

### 2.9 A complete worked example (the 11-check dual-app task from §2.2)

Decompose the instruction's 11 atomic asks into critical checks. Naming convention: `<app>_<thing>_<state>`, with content tokens that match the instruction (audit rule R17/R25):

```
slack_channel_q3_planning_created_private               (HR-3, T4)
slack_channel_q3_planning_members_three                 (T2, T6)
slack_channel_q3_planning_pinned_kickoff_message        (CR-13, T4)
slack_channel_q3_planning_pinned_asana_link             (T1)
slack_no_extra_channels_created                         (CR-19c)
asana_project_q3_planning_under_operations_team         (T2)
asana_section_discovery_present                         (T4)
asana_task_confirm_okr_scope_assigned_sarah_due_apr22   (T1, T3)
asana_task_schedule_kickoff_assigned_devraj_due_apr24   (T1, T3)
asana_task_draft_pre_read_assigned_mei_due_apr29        (T1, T3)
asana_no_extra_sections_in_q3_planning                  (CR-19c)
```

All 11 critical, binary scoring. Two negative checks (CR-19c). Trap coverage: T1 cross-app reconciliation (channel-name <-> project-name string match), T2 dynamic dropdowns (member adds, assignees), T3 stateful workflow (create → section → task → assignee → due date), T4 wizard sub-records (channel + members + pins; project + section + tasks), T6 last-mile skip (3 assignees in a row → high P(drop one)).

---

## 3. Calibrating to 0–33% pass rate against gpt-5.4 xhigh

The target is **gpt-5.4 xhigh, 150 steps, pass rate in `[0, 33%]`** — the agent has the capability but cannot reliably execute, **or** the agent genuinely cannot solve the task at all. Both are shippable hard tasks.

**The 0/3 rule.** We accept anything in `[0, 33%]`, with one caveat: a `0/3` is shippable **iff** every failure passes the §3.6 triage as `model_fail`. If any failure traces to `env_issue`, `verifier_bug`, or `task_design`, fix that and re-run — do not ship a `0/3` that's hiding a pipeline bug.

### 3.1 The eval loop in one command

```bash
# from computer-use/
echo /Users/.../tasks/clone-apps-wip/dual/cua-clones-01 > /tmp/task_list.txt
echo /Users/.../tasks/clone-apps-wip/dual/cua-clones-01 >> /tmp/task_list.txt
echo /Users/.../tasks/clone-apps-wip/dual/cua-clones-01 >> /tmp/task_list.txt
bash eval.sh /tmp/task_list.txt cal_r1 30 150 xhigh
# 3 runs, 30-way concurrency, 150 step cap, xhigh reasoning
```

Output lands in `eval_results/cal_r1/cua-clones-01__<hash>/{reward.txt, traj.jsonl, verifier/...}`.

### 3.1b The cost-sensitive "1-then-2" trial protocol (for autoloop and budgeted runs)

Running 3 trials blind every time is wasteful: a task that passes on trial 1 is already too easy (≥1/3), and running 2 more trials just confirms it. In budgeted settings — e.g. the autoloop, CI smoke, or when sandbox quota is tight — use this early-stop protocol instead of the unconditional 3-trial sweep.

```
trial 1  →  reward = 1.0  ─────────────────────────► task is ≥1/3 → classify "too_easy"; do NOT run more trials
                                                     route to §3.4 boundary-skill adder, then re-eval from trial 1

trial 1  →  reward = 0.0, §3.6 triage = BUG ─────► do NOT run more trials; fix the env/verifier/design
                                                     (any trial after a known pipeline bug is a wasted sandbox).
                                                     After fix, re-eval from trial 1.

trial 1  →  reward = 0.0, §3.6 triage = model_fail  → launch trials 2 AND 3 together (parallel; saves wall clock)

after trials 1+2+3 land:  apply §3.2 four-buckets table as usual.
```

Why "only 2 more, not 1": once we've paid the trial-1 cost on a task that's at the boundary, trials 2 and 3 run in parallel in the same eval batch — total wall clock is one more eval, not two — and they give us the 3-trial convergence evidence the §3.8 criteria require. Running just one more (yielding 1/2 or 0/2) under-samples the pass-rate estimate and doesn't satisfy §3.8 item 3.

**Net savings.** Against the naive "always 3" policy:
- `3/3` tasks (common early in calibration): 1 trial instead of 3 = 67% saving.
- `0/3`-with-a-bug tasks: 1 trial instead of 3 (bug caught early) = 67% saving.
- `0/3` or `1/3` genuine boundary tasks: 3 trials, same cost.

When the skill says "3 runs" elsewhere (§3.2, §3.8), read it as "up to 3 runs" — a trial-1 pass short-circuits without compromising correctness.

For an actual calibration sweep over multiple tasks use `synthesis_pipeline_cua/calibrate.py`:

```bash
python3 -m synthesis_pipeline_cua.calibrate \
    --source tasks/clone-apps-wip/ \
    --output tasks_recalibrated/ \
    --target-score 1 --target-runs 3 \
    --direction auto \
    --eval-concurrency 30 --max-iterations 3
```

### 3.2 The four buckets and what to do

After 3 runs against gpt-5.4 xhigh:

| Result | Diagnosis | Action |
|---|---|---|
| **3/3 — too easy** | Capability is in-distribution. | Add 1 requirement from the §3.4 boundary list. **One** at a time — multiplicative failure jumps you from 3/3 to 0/3 (anti-pattern §0.3 #7). |
| **2/3 — slightly easy** | At the boundary but the agent has the right approach. | Read the passing trajectory, find where it hesitated, extend that subtask. Acceptable to ship as-is if you're scoping for breadth over a clean 1/3. |
| **1/3 — sweet spot.** | Hard but solvable. | Ship it. |
| **0/3 — TRIAGE FIRST, then maybe ship.** | Either genuinely too hard for the agent, or a pipeline bug is masquerading as model failure. | Run the §3.6 triage on every run. If **all three are `model_fail`**, ship without modification — a `0/3` of clean model failures is a legitimate hard task. If **any** run is `env_issue` / `verifier_bug` / `task_design`, fix that first, re-run, then re-classify. |

**The 0/3-without-modification rule.** Three model-fails in a row is data: it means the agent never solves this class of task at gpt-5.4 xhigh's current capability. That is exactly the signal a hard eval is meant to capture. Do **not** lighten the task to manufacture an occasional pass — that converts a true-negative signal into noise. The only legitimate reasons to weaken a 0/3 task are (a) one of the three failures didn't pass triage, or (b) you're explicitly scoping for a 1/3-target sub-pool and want this task in it.

### 3.3 Always read trajectories before changing the task

This is the single highest-leverage rule from `CALIBRATION_PLAYBOOK.md` (only 16% success rate on blind calibration; >50% when reading first). 5 minutes of reading saves a 40-min eval cycle.

For a 2/3-or-3/3 task: read **a passing run**. Note where the agent retried, what it skipped, what it did last. Those are the boundary skills — extend one of them.

For a 0/3 task: read the verifier output of all 3 runs. If all 3 fail the *same* check, that check is over-spec'd or buggy (see §3.6). If they fail *different* checks, it's a genuine multi-skill task at 0% — collapse to a single subtask.

### 3.4 Boundary skills for clone-apps (the §2.3 traps, ranked empirically)

Boundary-skill tiers for the two clone UIs, populated from the §2.3 trap catalog and matched to gpt-5.4's known-from-OSWorld behaviour. **Treat these as starting hypotheses** until we have empirical data from cua-eval-clones runs; mark each as "verified" once N≥10 evals confirm.

**TIER 1 — Sweet spot (~33% expected pass rate, ideal for moving 2/3 → 1/3):**

| Boundary | Why ~33% | Example extension |
|---|---|---|
| **T2 dynamic-dropdown** in Asana team/project picker | autocomplete needs type-wait-click; agent often picks the wrong row when 2 candidates start with the same prefix | "assign to Devraj Patel" when seed has `devraj.patel` and `dev.kumar` |
| **T1 cross-app exact string** | the agent paraphrases (`Q3 planning` vs `q3-planning` vs `Q3-Planning`) | require Slack channel name `q3-planning` AND Asana project named `Q3 Planning` (note casing) |
| **T7 invisible config** (Asana custom-field option list, Slack channel notification override) | nothing visibly changes; agent moves on without setting it | "set the channel notification preference to Mentions only" |
| **T6 last-mile skip** in 4+ row data entry | agent drops the last row ~33% of the time on long lists | require 4 tasks instead of 3, or 4 channel members |

**TIER 2 — Moderate (~40-50%, good for moving 3/3 → 1/3):**

| Boundary | Why intermittent | Example extension |
|---|---|---|
| **T5 deep menu navigation** (3-4 levels) | agent finds the area but picks the wrong submenu ~50% | "from Slack, archive the old `q2-archive` channel" (Workspace > Channel mgmt > More > Archive) |
| **T4 wizard sub-records** with optional fields | the agent sets required fields and skips optional ones | "create the project with description `Q3 OKR planning sprint`" — description is optional in the wizard |
| **T3 stateful workflow** with 4 states | each transition is independent; one drops ~25% | "create the task, assign, set due date, mark dependencies, then comment" |

**TIER 3 — Too hard (~0%, AVOID — they push the task to 0/3):**

| Trap | Why |
|---|---|
| Slack message editing of a *threaded reply* (3-deep) | thread navigation in the React UI is unreliable |
| Asana task **drag-reorder** between sections | drag-and-drop in Chrome is the worst grounding case (taxonomy A) |
| Adding a **custom emoji** to Slack | requires an upload + admin gate the agent can't navigate |
| Setting a Slack channel **retention policy** different from workspace default | buried 4 levels deep AND requires admin role escalation |
| Asana **portfolio**-level rollups | feature exists in clone schema but UI surface is incomplete |

**TIER 4 — Anti-test (block these, do not test them):**

| Trap | Why blocked |
|---|---|
| Auth / 2FA | clones don't implement it |
| Outbound API calls | `allow_internet=false` blocks them |
| Captchas | clones don't have them |

### 3.5 Calibration moves that are NOT calibration

See **§0.3** for the full list of eight anti-patterns. The shortest possible restatement: the verifier always faithfully checks exactly what the instruction says — no more, no less. Calibration changes both together, or it changes neither.

### 3.6 Distinguishing model-fail from pipeline-bug (the triage tree)

**Default to "pipeline bug" when in doubt** (§0.7). The cost of investigating a pipeline bug is hours; the cost of mislabeling a pipeline bug as a model failure is corrupted eval data forever.

Each run lands in one of the four classes from §0.2 (`env_issue`, `verifier_bug`, `task_design`, `model_fail`). Before applying the tree, **pull the trial's `deliverables/` dir** (§2.5.0b) — the two DB dumps plus `verifier_result.json` let you run the verifier and ad-hoc SQL offline against the exact end-state the agent produced. That is how you *cheaply* distinguish "verifier rejected a correct end-state" from "agent produced a wrong end-state", which is the pivotal decision in this tree.

Apply in order:

1. **`verifier/result.json` missing or empty** → verifier crashed → fix verifier (likely an unprotected subscript, see §2.5 / audit rule R19). Re-run.
2. **`reward = 0.5` or other non-binary** → verifier not all-or-nothing → fix verifier (audit rule R8). Re-run.
3. **0 steps, no screenshots** → setup crashed or sandbox died → check `setup.sh` and `traj.jsonl`. Most common causes for clone-apps:
   - Health-wait timed out → docker images weren't pre-built (check template); add a bigger `seq 1 N`.
   - `psql` "could not change directory" → run with `cd /tmp` prefix (postgres can't read `/home/user/`).
   - Slack `?cua=1` stripped → React reverts typing, agent never logs in.
4. **All 3 runs fail the same check** → likely over-spec'd or a verifier bug; read 1 trajectory and verify the agent's screenshot shows the correct state. If it does, it's a verifier bug. If not, the requirement is too hard — lighten or remove.
5. **Different runs fail different checks (1 critical fail each)** → genuine model failure, intermittent on different subtasks → calibration is *almost there*; either drop the noisiest subtask, or accept 1/3 if it lands.
6. **Trajectory shows agent in a tight loop on one screen** → category H (looping) → the UI affordance is broken / unreachable → pick a different boundary skill.
7. **Trajectory shows agent typing in the wrong window** → tile-layout regression → check `open-clones-tiled.sh` ran (the windows must be visible in screenshots).

When you find a pipeline bug, log it to `computer-use/CUA_PIPELINE_CHANGELOG.md` (creates a new entry; format already established).

### 3.7 The 1/3-task failure modes empirically observed

Reproduced from `CUA_1of3_DIFFICULTY_ANALYSIS.md`, kept here because they will recur on clone-apps:

- **Label/title omission** — agent does the data work but drops contextual labels.
- **Single-character transcription error** — one missing letter in a name copied across apps (most common with usernames containing punctuation: `dev.kumar`, `o-rourke`).
- **Last-mile skip** — final cell / final task / final assignee left blank.
- **Invisible-configuration skip** — agent does the visible work, skips the config-only step that has no immediate visual feedback.
- **Strategy switch to broken shortcut** — agent abandons the GUI mid-task and tries `psql` / `curl`. Once it fails, it can't recover. (Counter with HR-6, but it still happens occasionally.)
- **Step-limit exhaustion on long workflows** — at 150 steps, dual-app tasks with 11+ checks are right at the budget edge; expect 1 of 3 runs to time out without saving.

### 3.8 Convergence criteria

A task is **shipped** when ALL of the following hold:

1. All ★ audit rules (§2.7) pass; ☆ rules logged.
2. `golden_apply.py` → `verify.py` returns `reward=1.0`. Empty sandbox → `reward=0.0`.
3. Up to 3 runs against gpt-5.4 xhigh, 150 steps, with the §3.1b 1-then-2 protocol (early-stop on trial-1 pass; skip trials 2-3 when trial 1 already flags a pipeline bug). Final landing point must be pass rate ∈ `[0, 33%]`. Specifically:
   - **1/N pass (any trial passes)**: ship as-is. The passing run's `traj.jsonl` should contain only `mouse_*` / `type` actions, no `bash` / `exec` (otherwise the GUI-only mandate failed and the score is invalid — go fix the instruction or environment).
   - **0/3 pass rate**: ship as-is **iff** all 3 failures pass §3.6 triage as `model_fail`. If any single failure is `env_issue` / `verifier_bug` / `task_design`, fix and re-run; do not ship until all three are clean model-fails.
   - **1/1 pass (protocol short-circuit)**: NOT shippable — this is the "too easy" signal, route to §3.4 boundary-skill adder and re-run from trial 1.
4. `task.toml` `difficulty_explanation` rewritten to match the actual landing point ("0/3 against gpt-5.4 xhigh, 150 steps, all failures `model_fail` per §3.6 triage; primary capability gap: ${category}").

Tasks live under `computer-use/tasks_wip/` while being iterated and get promoted to `computer-use/tasks_shipped/` when the §3.8 criteria are met. The full lifecycle protocol is §5.

---

## 4. End-to-end checklist (the one-page "shipping a task" recipe)

**Always start a new task by copying the scaffold** — it bakes in the 2026-04-18 fixes (services.sh stdout redirect, setup.sh no-sudo on launcher, Slack `messages.content` column). Hand-writing a fresh services.sh/setup.sh is how those bugs get re-introduced.

```bash
cp -r computer-use/tasks_wip/_template computer-use/tasks_wip/<new-task>
# then edit task.toml name, instruction.md, setup.sh seeding block,
# verify.py checks, golden_apply.py.
```

```
[ ] cua-clone-apps-env template built and accessible (one-time)
[ ] scaffold copied from tasks_wip/_template/  ← do not hand-write services/setup
[ ] task.toml with template="cua-eval-clones", cpus=4, memory_mb>=6144, timeout_sec>=90
[ ] services.sh — exactly one `start-*.sh` line, WITH `> /tmp/<name>.log 2>&1` redirect
[ ] setup.sh — health wait → optional per-task SQL/REST → `/usr/local/bin/open-clones-tiled.sh` (NO sudo)
[ ] instruction.md — 8-25 lines, colleague tone, HR-1..HR-8, ?cua=1 unstripped
[ ] verify.py — ONE JSON line on stdout (see §2.5.0 new contract), all-or-nothing,
                7-12 critical checks, ≥2 seed-derived, ≥1 negative, no process vetoes,
                top-level try/except, .get() over [], <30s wall time (orchestrator cap
                — batch SQL into one round-trip per DB), content tokens match instruction.
                Slack messages column is `content` NOT `body`.
[ ] verify.py — (optional) writes extras to /home/user/deliverables/ (files the agent
                uploaded, computed intermediates). DB dumps are NOT needed — the
                orchestrator's finally block owns them (§2.5.0c-A).
[ ] golden_apply.py — REST-only (not raw SQL), produces verifier reward=1.0
[ ] audit (§2.7) all ★ rules pass (including ★C1-C7 clone-apps rules)
[ ] Smoke: golden_apply -> verify == 1.0; empty -> verify == 0.0
[ ] Task sits in computer-use/tasks_wip/<task_name>/ during iteration (§5.1)
[ ] Eval: 3 runs gpt-5.4 xhigh, 150 steps -> 0..1 passes (target ∈ [0, 33%])
[ ] status.md auto-updated by scripts/update_status.py after each batch (§5.4)
[ ] If 0/3: every failure passes §3.6 triage as model_fail (else fix and re-run)
[ ] If 2/3 or 3/3: add 1 boundary requirement from §3.4 Tier 1, re-run
[ ] Promote: python scripts/promote.py tasks_wip/<task_name>  →  tasks_shipped/
```

---

## 5. Autonomous task-gen + eval protocol (directory layout, status.md, lifecycle)

This section is the operational contract that the rest of this skill's principles hang off. A task does not exist in isolation — it lives in a directory, gets evaluated in batches, accumulates a history, and eventually ships. The protocol below makes every one of those states recoverable: a stopped-and-resumed pipeline, a crashed verifier, a partially-edited task — all survive because state lives on disk in fixed locations.

### 6.1 The three top-level directories

```
computer-use/
├── tasks_wip/                      # work-in-progress tasks
│   └── <task_name>/                # four-file contract (§1.2) + status.md
│
├── tasks_shipped/                  # promoted tasks (verified 1/3 or clean 0/3)
│   └── <task_name>/                # same tree + PROMOTED.md
│
└── task_runs/                      # every eval batch, grouped by timestamp
    └── YYYYMMDD-HHMMSS_<label>/    # one batch = one call to eval.sh
        ├── RUN_MANIFEST.md         # tasks, parameters, start/end timestamps
        └── <task_name>/
            └── trial_<k>__<hash>/  # §2.5.0b subtree (per-trial)
                ├── traj.jsonl, step_*.png, reward.txt, result.json
                ├── verifier/{stdout.json, stderr.txt, exit_code.txt}
                ├── artifacts/       # /home/user/{Desktop,Downloads}/ sweep
                └── deliverables/    # pg_dumps + verifier extras
```

Three separations matter:
- **Source vs history**: `tasks_wip/` / `tasks_shipped/` hold the **source** of a task (instruction, setup, verifier, golden). `task_runs/` holds the **history** (every trial, every batch). Editing a task never touches history; running an eval never touches source.
- **WIP vs shipped**: `tasks_shipped/` is append-only under normal flow. Once a task is promoted you don't edit it in place — you `cp -r tasks_shipped/X tasks_wip/X`, iterate, then re-promote. This keeps the shipped set stable.
- **Batch grouping**: every invocation of `eval.sh` produces exactly one `task_runs/<batch>/` dir. Batches are the unit of grouping for "what happened when" questions.

### 6.2 Batch naming: `YYYYMMDD-HHMMSS_<label>`

Example: `20260418-163042_smoke_dual_v2`. The `eval.sh` wrapper generates this automatically from the current time and an optional `LABEL` env var (`LABEL=smoke_dual_v2 bash eval.sh …`). Lexicographic sort = chronological sort. The label is free-form and meant for the human reading `ls task_runs/` a week later.

### 6.3 The per-trial subtree (§2.5.0b, restated here for the operational protocol)

```
task_runs/20260418-163042_smoke/cua-clones-01/trial_2__a1b2c3d4/
├── traj.jsonl                     # agent trajectory (actions + thoughts)
├── step_*.png                     # per-step screenshots
├── reward.txt                     # the single float (still authoritative for pass/fail)
├── result.json                    # orchestrator summary (task_name, model, steps, ...)
├── verifier/
│   ├── stdout.json                # the verifier's emitted JSON, pretty-printed
│   ├── stderr.txt                 # PASS/FAIL diagnostics
│   └── exit_code.txt
├── artifacts/                     # Desktop/Downloads sweep
└── deliverables/
    ├── slack_dump.sql.gz          # orchestrator: pg_dump localhost:5433 cloneapp
    ├── asana_dump.sql.gz          # orchestrator: pg_dump localhost:5435 asana_clone
    ├── verifier_result.json       # (optional) verifier's own copy
    └── files/…                    # (optional) attachments
```

### 6.4 Per-task `status.md` (the authoritative per-task log)

Every task in `tasks_wip/` or `tasks_shipped/` carries a `status.md` that is **auto-regenerated after every batch** by `scripts/update_status.py`. The tool scans `task_runs/*/<task_name>/trial_*/` and rebuilds the file — **you do not hand-edit `status.md`**.

Format:

```markdown
# Status: cua-clones-01

- State: WIP
- Source hash: a7f3c2e1    # sha256[:8] of instruction+setup+services+verify+golden
- Current verdict: 1/3 — sweet_spot
- Last eval: 20260418-163042_smoke_dual_v2
- Promotion-ready: YES

## Eval history (most recent first)

### 20260418-163042_smoke_dual_v2 — 1/3 — AUTHORITATIVE — hash=a7f3c2e1
- trial_1__e9d1: reward=1.0
- trial_2__a1b2: reward=0.0  failed=asana_task_draft_pre_read_assigned_mei_due_apr29  class=model_fail
- trial_3__b4c5: reward=0.0  failed=slack_channel_q3_planning_pinned_asana_link       class=model_fail
- primary_gap: T1 cross-app exact-string reconciliation
- notes: ships. One passing run used clean GUI-only trajectory.

### 20260418-150017_smoke_dual_v1 — 0/3 — OUTDATED — hash=9b2d0a44
- trial_1__7f7f: reward=0.0  failed=asana_section_discovery_present  class=verifier_bug
- trial_2__cc33: reward=0.0  failed=asana_section_discovery_present  class=verifier_bug
- trial_3__1122: reward=0.0  failed=asana_section_discovery_present  class=verifier_bug
- notes: SQL join missed project filter; verify.py edited → hash changed → run demoted.
```

**Invariants the helper enforces:**
1. Exactly **one** entry is AUTHORITATIVE — whichever batch matches the current source hash. All others are OUTDATED.
2. The top-summary block (state, verdict, last_eval) reflects the AUTHORITATIVE entry only.
3. Per-trial lines carry: `reward`, the first failed critical check (if any), and the triage class.
4. If no trial has a triage class assigned, the helper leaves `class=?` and prompts the user to triage — §3.6 is a human step, not automated.

**Source hash** = `sha256(instruction.md || services.sh || setup.sh || verify.py || golden_apply.py)[:8]`. Excludes `task.toml`, `status.md`, `environment/data/*`, and any `__pycache__`. Hash stability means: changing only `task.toml.difficulty_explanation` does not invalidate prior evals; changing `verify.py` does.

**Promotion-ready** is YES iff:
- AUTHORITATIVE entry exists.
- AUTHORITATIVE verdict is `1/3 — sweet_spot` OR `0/3 — clean_triage` (all three trials classified as `model_fail`).
- No trial is `env_issue`, `verifier_bug`, or `task_design` in the AUTHORITATIVE entry.

### 6.5 State-machine transitions

```
[CREATED] ─────────── scaffold task files ──────────▶ tasks_wip/<task>/
                                                       │ (status.md stub)
                                                       ▼
[SMOKE] ───── bash eval.sh with a single-task list ──▶ task_runs/<batch>/<task>/
                                                       │ (update_status.py updates status.md)
                                                       ▼
[TRIAGE] ──── human reads status.md + deliverables/ ──▶ classify each trial's failure
                                                       │
                            ┌──────────────────────────┼──────────────────────────┐
                            ▼                          ▼                          ▼
                     1/3 or 0/3-clean           2/3 or 3/3                 0/3-dirty
                     → [PROMOTE]                → edit task, re-eval       → fix bug, re-eval
                       scripts/promote.py         ("FIXED" — prior           ("FIXED" — prior
                       cp -r tasks_wip/<X>        entries now OUTDATED)      entries now OUTDATED)
                       tasks_shipped/<X>                │                          │
                       + PROMOTED.md                    └──── back to [SMOKE] ─────┘
```

### 6.6 Command surface (what you actually type)

Scaffold a new task:

```bash
mkdir -p computer-use/tasks_wip/cua-clones-01/{environment/data,tests}
# ... author the five files; see §2 ...
```

Run one eval batch against a set of tasks:

```bash
cd computer-use
ls tasks_wip/*/task.toml | xargs -n1 dirname > /tmp/tasks.txt
# Run 3 trials per task (concatenate the task list three times for 3x runs)
cat /tmp/tasks.txt /tmp/tasks.txt /tmp/tasks.txt > /tmp/tasks_3x.txt
LABEL=smoke_dual_v2 bash eval.sh /tmp/tasks_3x.txt
# eval.sh auto-generates job_name = $(date +%Y%m%d-%H%M%S)_smoke_dual_v2
```

Update status after a batch (called automatically by eval.sh; also runnable manually):

```bash
python scripts/update_status.py task_runs/20260418-163042_smoke_dual_v2/
# rewrites status.md for every task touched by that batch
```

Promote a task:

```bash
python scripts/promote.py tasks_wip/cua-clones-01
# → reads status.md; if promotion-ready, cp -r to tasks_shipped/, write PROMOTED.md
# → if not promotion-ready, prints what's blocking and exits non-zero
```

### 6.7 Recoverability guarantees

- **Crashed orchestrator mid-batch**: remaining tasks can be re-run with the same `LABEL`; `update_status.py` handles partial `task_runs/<batch>/` trees gracefully.
- **Edited a task after an eval**: running `update_status.py` against any prior batch recomputes the source hash and correctly flags the old entry as OUTDATED.
- **Deleted a `status.md` by accident**: regenerate with `update_status.py task_runs/*/<task_name>/` — it rescans all historical batches and reconstructs the log.
- **Lost a sandbox's DB state**: the `deliverables/*.sql.gz` under the trial dir is canonical; you can restore it into a local postgres (§2.5.0b) and re-run `verify.py`.

### 6.8 The perpetual autoloop (task-gen → smoke → 1-eval → conditional 2-more → ship / bump-difficulty)

When running the pipeline autonomously (Claude Opus driving subagents; 40-sandbox quota on this E2B account as of 2026-04-18), the loop shape below compresses §5-§6 into one state machine that a single driver script (`computer-use/scripts/autoloop.py`) owns. All state is on disk — the driver is restartable.

```
      ┌───────────────────┐
      │ GEN  (subagent)   │   spawn Agent() — picks a trap category, cp -r _template,
      │                   │   fills instruction/setup/verify/golden per skill §2
      └─────────┬─────────┘
                ▼
      ┌───────────────────┐
      │ SMOKE (1 sandbox) │   bash -c "services.sh + setup.sh + golden_apply.py + verify.py"
      │                   │   expect reward=1.0; also confirm empty-sandbox run → 0.0 via
      └─────────┬─────────┘   scripts/smoke_test_golden.py
                ▼
      ┌───────────────────┐
      │ EVAL_1  (1 SB)    │   orchestrator.py  --model gpt-5.4 --reasoning-effort xhigh
      │                   │                     --max-steps 150
      └─────────┬─────────┘
                ▼
      ┌───────────────────┐
      │ TRIAGE (§3.6)     │   classify reward=1.0 / model_fail / env_issue / verifier_bug /
      │                   │   task_design
      └─────────┬─────────┘
                ▼
    ┌───────────┼──────────────┬──────────────────┐
    ▼           ▼              ▼                  ▼
 reward=1.0  model_fail    env/verifier/     (reward=0.0 any reason we can't classify)
 TOO_EASY    EVAL_2+3      task bug → FIX     → TRIAGE_HUMAN (parked for review)
    │        (parallel,         │
    ▼         save wall)        ▼
 §3.4 adder                  edit skill/task,
 (Agent)                     restart from SMOKE
    │           │
    ▼           ▼
 back to SMOKE  TRIAGE (§3.2 four-buckets)
                   ▼
               0/3 clean OR 1/3 → PROMOTE
               2/3 or 3/3       → §3.4 adder
               dirty 0/3        → FIX
```

**Per-task state file** — `tasks_wip/<task>/autoloop.json`:
```json
{
  "stage": "EVAL_1",           // GEN / SMOKE / EVAL_1 / EVAL_2 / TRIAGE / TOO_EASY / BUG / SHIPPED
  "attempts": 1,               // count of SMOKE+EVAL cycles so far
  "last_source_hash": "a7f3c2e1",
  "trials": [
    {"batch": "20260418-223012_autoloop", "reward": 0.0, "class": "model_fail"},
    {"batch": "20260418-223521_autoloop", "reward": 0.0, "class": "model_fail"},
    {"batch": "20260418-223521_autoloop", "reward": 0.0, "class": "model_fail"}
  ],
  "next_action": "promote"     // promote / bump_difficulty / fix / re_eval
}
```

**Concurrency contract (40-sandbox quota).**
- At most 40 `orchestrator.py` + sandbox-probe processes running concurrently.
- Each SMOKE, EVAL_1, and EVAL_2-or-3 trial consumes 1 sandbox for ~12-15 min.
- Task-gen Agents (subagents) are FREE w.r.t. sandbox quota — spawn them as needed.
- Driver polls every 120 s: counts live orchestrator procs via `pgrep -c`, launches up to `40 - running` new trials from the ready queue.
- When the queue is empty AND no more GEN agents are outstanding, driver spawns N new task-gen Agents (target: keep queue at 10-20 tasks).

**Budget signal** — `1-then-2` (§3.1b) means:
- Trial 1 pass → 0 extra trials.
- Trial 1 fail+bug → 0 extra trials (fix first).
- Trial 1 fail+model_fail → 2 more trials, launched in parallel.
The driver must implement this, not blindly enqueue 3 trials per task.

**Retirement criteria** — after ≥ 3 full cycles (GEN → SMOKE → EVAL) the driver gives up on a task and moves it to `tasks_wip/_retired/`:
- Cycle 1: 3/3 too-easy → bump difficulty → Cycle 2 still 3/3 → bump again → Cycle 3 still 3/3 → retire (the design target is probably out of reach on these clones).
- Three consecutive BUG cycles on the same root cause → retire (the bug is structural, not task-fixable).

### 6.9 When to retire a task

Some tasks just don't work out — maybe they hit infrastructure walls that won't go away (category K auth, category L bypass), or the trap pattern turns out to be unreachable on this UI. Move the task dir to `tasks_wip/_retired/<task_name>/` and add a one-paragraph note to its `status.md` explaining why. `_retired/` is skipped by the default `ls tasks_wip/*/task.toml` glob so it stays out of future batches.

---

## 6. What this skill does NOT cover

- **Building / debugging the `cua-eval-clones` template.** That's `cua-clone-apps-env`.
- **Automated generate / evaluate / analyze / fix CLI.** Not maintained on this branch; the principles a loop like that operationalizes are inlined in §0 so a task author can apply them by hand.
- **Feature-level fidelity of the clones themselves.** That lives in each clone's `FEATURES.md` / `PROJECT_PLAN.md` inside `archive/slackdesktop-clone/` and `archive/Asana-Clone/`.
- **Domain-specific skills for clone-apps tasks.** Those should be created (e.g. `cua-clone-apps-pm-workflows`, `cua-clone-apps-ops`) only AFTER you have eval data showing where empirically the agent fails on these clones — not pre-emptively.
