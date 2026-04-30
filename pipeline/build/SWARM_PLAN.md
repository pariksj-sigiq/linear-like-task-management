# Swarm Orchestration Plan — Multi-App Clone Builder

## Context

We're building realistic SaaS clone apps for AI agent training at Collinear. Each clone needs: FastAPI backend (50+ tools), React frontend (20+ pages), PostgreSQL (14+ tables), Docker packaging, Playwright tests, and 100% UI fidelity to the real app.

We proved the pattern works with the Zendesk clone (11K lines, 79 files, built in one conversation with 5 parallel agents). The main lesson: the backend/functionality is mechanical, but **UI fidelity is the bottleneck** — our first pass was ~60% fidelity, not the 85% we assumed. It took 3+ fidelity passes with **live browser comparison** to get closer.

### The critical insight from the Zendesk build

Static screenshot comparison (read reference image → read code → guess what it renders → fix) keeps fidelity stuck at ~60-70%. The breakthrough was **live browser control**: navigating both the real app and the clone simultaneously, taking real-time screenshots, making changes, and verifying the rendered output directly. This caught bugs that static analysis never would:

- CSS stacking context issues (dropdown menus bleeding through adjacent panels)
- Positioning bugs requiring `position: fixed` with dynamic `getBoundingClientRect()` calculations
- Pixel-level alignment between sidebar elements and topbar height
- Interactive state rendering (hover effects, open menus, active navigation highlights)
- Font rendering, line-height, and text truncation behavior in real content

**The rule: no fidelity claim is valid unless verified by rendering the actual page in a browser.**

---

## The Pipeline (per app)

### Phase 1: Research (5 min)

**Run by:** Orchestrator

1. Web search for "{app name}" agent/admin interface
2. Navigate to the **live production app** in a browser (using a real account or trial)
3. Take 15-20 reference screenshots of key pages: dashboard, list views, detail views, create forms, settings, admin panels
4. For each screenshot, extract with vision:
   - Exact hex colors (sidebar, topbar, buttons, status indicators)
   - Font sizes, weights, families
   - Layout structure (sidebar width, topbar height, panel ratios)
   - Component patterns (dropdowns, badges, tables, cards)
   - Navigation structure (sidebar items, admin sections)
   - Interactive patterns (hover states, active states, dropdown menus)
5. Write a structured research doc: `{app}/RESEARCH.md`

**Key difference from v1:** Don't just download static screenshots — navigate the live app and capture interactive states (menus open, hover effects, form states). These are the details that separate 70% fidelity from 100%.

### Phase 2: Plan (10 min)

**Run by:** Orchestrator

From the research, produce:

- Entity list (tables) with relationships
- Tool list (50+ tools) with input schemas
- Page list (20+ routes) with layout descriptions
- Seed data spec (who, how many, realistic content — **all in English**)
- Design tokens (extracted from live screenshots, not guessed)
- Feature tier list (Tier 1: full CRUD, Tier 2: stubs)
- **Interactive behavior spec** (what happens on hover, click, menu open — captured from live app)

Output: A self-contained build prompt that an agent can execute without any additional context.

### Phase 3: Build + Self-Verify (30-45 min)

**Run by:** 5-6 parallel background agents in a worktree

Each agent gets a self-contained prompt with the full plan **plus the autonomous workflow protocol** ([`AUTONOMOUS_WORKFLOW.md`](./AUTONOMOUS_WORKFLOW.md)). No agent depends on another.

| Agent | Files | Depends on |
|-------|-------|------------|
| Backend | init.sql, models.py, schema.py, server.py | Nothing |
| Seed | seed_data/*.json, seed_app.py | Tool names from plan |
| Frontend Shell | ZendeskShell.tsx, AdminShell.tsx, Login.tsx, App.tsx, design-tokens.css | Nothing |
| Frontend Core Pages | Dashboard, Views, TicketDetail, TicketCreate | Tool names + design tokens |
| Frontend CRUD Pages | UserList/Create/Detail, OrgList/Create/Detail | Tool names + design tokens |
| Frontend Admin+Stubs | All admin pages, reporting, search, KB stub | Tool names + design tokens |

Critical: Backend agent writes first (or the plan specifies all tool names upfront so frontend agents don't need to wait).

**Each frontend agent self-verifies using the autonomous workflow.** They don't just write code and hand it off — they run the comparison loop on their own pages before reporting "done." The build prompt for each agent includes:

```
After writing the code for your pages, run the autonomous fidelity loop:
1. Navigate to the real app page in the browser
2. Navigate to your clone page at localhost:3000
3. Screenshot both, list every difference, fix, re-verify
4. Only report "done" when your pages match the real app

See AUTONOMOUS_WORKFLOW.md for the full protocol.
```

This means agents ship at ~80-85% fidelity instead of ~60%, drastically reducing the orchestrator's review work.

### Phase 4: Orchestrator Judges, Agents Iterate (15-25 min)

**Run by:** Orchestrator (judge only) + Agents (do the work)

The orchestrator **never fixes code.** It only does two things: **screenshot** and **judge.** If a page isn't at 100%, the orchestrator sends the responsible agent back with specific feedback. The agent re-enters the autonomous loop and iterates until the orchestrator judges it passes.

> **Full protocol for agents:** [`AUTONOMOUS_WORKFLOW.md`](./AUTONOMOUS_WORKFLOW.md)

#### The orchestrator judge loop

Use these Playwright MCP tools directly — do not paraphrase "take a screenshot":
`mcp__playwright__browser_tabs`, `mcp__playwright__browser_navigate`,
`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_take_screenshot`,
`mcp__playwright__browser_hover`, `mcp__playwright__browser_click`,
`mcp__playwright__browser_press_key`, `mcp__playwright__browser_type`.

```
For each key page:
  1. browser_tabs(select, real) → browser_navigate(real URL) → browser_take_screenshot(<page>-real.png)
  2. browser_tabs(select, clone) → browser_navigate(localhost URL) → browser_take_screenshot(<page>-clone.png)
  3. Judge from the two PNGs: is this at 100% fidelity?
     │
     ├── YES → approve page, move to next
     │
     └── NO → send rejection to the responsible agent:
              ┌─────────────────────────────────────────┐
              │ "These pages failed review:             │
              │  - Dashboard: status badge colors wrong  │
              │  - Ticket detail: bottom bar not full    │
              │    width, submit button is red not teal  │
              │                                         │
              │  Run the autonomous fidelity loop again  │
              │  on these pages until they match.        │
              │  You are autonomous."                    │
              └─────────────────────────────────────────┘
              │
              Agent iterates autonomously...
              Agent reports "done"
              │
              └── Orchestrator re-screenshots, re-judges
                  └── (repeat until 100%)
```

**The orchestrator is a judge, not a worker.** It screenshots, compares, scores, and writes rejection feedback. It never opens a code file. All fixes are done by agents following the autonomous workflow.

#### Why this separation matters

| Role | Does | Does NOT |
|------|------|----------|
| **Orchestrator** | Screenshots both apps, compares, scores fidelity, writes specific rejection feedback, approves only at 100% | Edit code, fix CSS, debug layout, touch any source file |
| **Agent** | Writes code, runs autonomous fidelity loop, self-verifies via browser, iterates on rejections until approved | Decide when it's "good enough" — only the orchestrator judges |

This separation prevents two failure modes:
- **Orchestrator doing agent work** — wastes the orchestrator's time on fixes when agents can self-correct
- **Agent marking itself as done prematurely** — without an external judge, agents stop at 80% and call it done. The external judge is the only reliable way to hold the 100% bar.

#### Rejection triggers

The orchestrator rejects when:

- **More than 5 visible differences** on any single page
- **Structural issues** — panels wrong width, elements in wrong container
- **Full-width bars nested inside a single panel** — if the real app has a bar (breadcrumbs, status bar, bottom action bar) that spans the entire page width, and the clone has it trapped inside the center panel only, that's a structural reject. These bars must be siblings of the panels wrapper at the root flex-col level, not children of any individual panel. This is the most common structural mistake.
- **Color mismatches** — especially status badges, buttons, navigation highlights
- **Missing elements** — icons, avatars, toolbar buttons that exist in real app but not in clone
- **Cross-page inconsistency** — status colors differ between pages, typography inconsistent

Rejections are **specific** — the orchestrator lists exactly what's wrong so the agent knows what to fix. Vague rejections ("make it better") waste cycles.

#### What the orchestrator checks

```
Static comparison:
  - Layout structure, panel widths, element positioning
  - Full-width bars (breadcrumbs, bottom action bars) span ALL panels, not just center
  - Colors, typography, spacing, borders
  - Icons, avatars, badges, status indicators
  - Missing or extra elements

Interactive verification:
  - Hover states on nav items, buttons, links, table rows
  - Active/selected states on navigation
  - Dropdown menus open correctly (no z-index clipping)
  - Form focus states
  - Scroll behavior (sticky headers, overflow)
```

### Phase 5: Validate (5 min)

**Run by:** Orchestrator

```bash
make down && make up && make seed   # Docker build + seed
make test                           # Unit + Playwright tests
make validate                       # Repo structure check
```

Fix any failures, re-run.

**Final browser check:** After Docker is up, navigate to the running app and verify 3 key pages render correctly. This catches Docker-specific issues (missing env vars, wrong ports, asset paths). If pages fail, trigger the responsible agent back with the same rejection loop from Phase 4.

### Phase 6: Ship

```bash
git add -A && git commit && git push
```

---

## Swarm Orchestration Model

### For 1 app at a time (current conversation):

```
Orchestrator (JUDGES ONLY — never edits code)
├── Research: browse live app, capture screenshots + design tokens
├── Plan: write build prompts + bundle AUTONOMOUS_WORKFLOW.md
├── Build + Self-Verify: agents x5 (parallel, background worktrees)
│   ├── Each agent builds their pages
│   ├── Each agent runs autonomous fidelity loop on their own pages
│   └── Each agent reports "done"
├── Judge: orchestrator screenshots real app vs clone
│   ├── 100% → approve
│   └── <100% → reject with specific feedback → agent iterates
│       └── Agent re-enters autonomous loop
│           └── Agent reports "done" → orchestrator re-judges
│               └── (repeat until 100%)
└── Validate: Docker + tests + final browser check
```

### For N apps in parallel:

```
Orchestrator
├── App 1: Research → Plan → Build+SelfVerify x5 → Review/Reject → Validate
├── App 2: Research → Plan → Build+SelfVerify x5 → Review/Reject → Validate
├── App 3: Research → Plan → Build+SelfVerify x5 → Review/Reject → Validate
└── ...
```

Each app runs in its own git worktree (isolation flag on agents). The orchestrator:

1. Creates repos for all apps upfront
2. Launches research agents in parallel (one per app, each browsing the live app)
3. As each research completes, writes the build plan **bundled with AUTONOMOUS_WORKFLOW.md**
4. Launches build agents (5 per app, all in background) — each agent self-verifies via browser
5. As agents report "done," orchestrator **judges via browser** — screenshots real app vs clone, scores fidelity
6. If <100%, orchestrator **rejects with specific feedback** — agent re-enters autonomous loop and iterates
7. Orchestrator re-judges after each agent iteration — **repeat until 100%**
8. Once all pages pass, validates and ships

**The orchestrator never writes code.** It researches, plans, judges, and rejects. All implementation and fixing is done by agents following the autonomous workflow protocol.

Practical limit: ~3 apps at once. The orchestrator's judging loop is the constraint — each app needs its own localhost port and real app session for browser verification.

---

## Target Apps

Priority candidates mentioned in the template:

- **Notion** — pages, databases, blocks, sidebar navigation, sharing, search
- **GitHub** — repositories, issues, pull requests, code viewer, profile, notifications
- **Salesforce** — accounts, contacts, opportunities, leads, dashboards, reports
- **HubSpot** — CRM, contacts, deals, email tracking, dashboards
- **Linear** — issues, projects, cycles, roadmaps, views, settings
- **Slack** — channels, messages, threads, DMs, search, profile

---

## Key Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| UI fidelity stays at 60% | **Live browser comparison loop** — no ship without side-by-side rendered verification. Static screenshot comparison is not sufficient. |
| CSS bugs invisible in code review | Browser control catches stacking contexts, overflow clipping, position bugs, font rendering — things that only manifest when rendered |
| Interactive states are wrong | Fidelity pass includes hover, click, dropdown, scroll verification — not just static page appearance |
| Agents write conflicting code | Each agent gets isolated files — no two agents write the same file |
| Build doesn't compile | Docker build is the final gate — catches all import/type errors |
| Tests fail | Tests are written against `data-testid` attributes which are specified in the plan |
| Wrong language leaks in | All UI text, seed data, and labels must be in English. Run `grep` for non-ASCII accented characters before commit. |
| Fidelity loop takes too long | Cap at 3 passes per page. Diminishing returns after that — ship at 90%+ and note remaining gaps |

---

## Verification Checklist

For each completed app:

- [ ] `make up && make seed` — Docker builds and seeds without errors
- [ ] `make test` — all unit + Playwright tests pass
- [ ] **Live browser comparison** — orchestrator navigates real app and clone side-by-side, confirms <5 visible differences per key page
- [ ] **Interactive verification** — dropdowns, hover states, menus, forms all behave correctly
- [ ] Every navigation link works — no 404s
- [ ] Every button/form does something — no dead UI
- [ ] All text is in English — no localized strings leaked in
- [ ] Seed data is realistic and in English
