# Autonomous UI Fidelity Workflow

A protocol for making an AI agent work autonomously for hours to achieve pixel-perfect UI fidelity between a clone app and a real production app. Works with any AI coding tool that has browser control (Cursor, Windsurf, Claude Code, etc.).

## Context

Static code review keeps UI fidelity stuck at ~60-70%. The breakthrough is **live browser control**: the AI navigates both the real app and the clone simultaneously, takes real-time screenshots, makes code changes, and verifies the rendered output directly — in a loop, for hours, without human intervention.

This workflow was developed while building a Zendesk clone. The AI ran autonomously for 8+ hours across multiple passes, driving toward the 100% fidelity bar.

---

## Prerequisites

Before starting the autonomous loop:

1. **Clone app running locally** — dev server at `localhost:3000` (or any port) with HMR enabled so code changes apply instantly
2. **Real production app accessible** — a logged-in session in the browser (trial account, staging env, or production)
3. **AI has browser control** — the tool can navigate URLs, take screenshots, click elements, and read the DOM in at least two tabs
4. **Codebase is functional** — pages render, data loads, navigation works. Don't start fidelity work on a broken app.

---

## Phase 1: The Setup (human, 5 min)

Open two browser tabs the AI can control:

```
Tab 1: http://localhost:3000          (the clone)
Tab 2: https://real-app.com/dashboard (the real app, logged in)
```

Establish the ground rules with one message:

> **Before claiming anything is fixed, you MUST take a screenshot in the browser to verify. No exceptions.**

This single rule prevents the #1 failure mode: the AI editing code, assuming it worked, and moving on — leaving broken CSS, invisible elements, or stacking context bugs that only manifest when rendered.

---

## Phase 2: The Autonomous Instruction (the unlock prompt)

This is the message that sets the AI free. Adapt the template to your app:

```
I will leave and come back in [N] hours.

Go page by page comparing everything — from the overview layout down to
the small padding and position of a button. For each page:

1. Screenshot the real app page
2. Screenshot the clone page  
3. List every visible difference
4. Fix each one in code
5. Re-screenshot the clone to verify
6. Only move to the next page when this one matches

Pages to cover: [list your pages — dashboard, list views, detail views,
create forms, settings, admin panels]

Once you finish all pages, restart the entire process as a second pass.
You are autonomous from here.
```

### Why this works

- **Page-by-page scope** prevents the AI from context-switching or skipping hard problems
- **"Only move on when it matches"** forces thorough completion before moving forward
- **"Restart as a second pass"** catches issues the first pass introduced or missed
- **"You are autonomous"** gives explicit permission to make decisions without asking

---

## Phase 3: The Comparison Loop (AI runs solo)

The AI executes this for every page:

```
┌─────────────────────────────────────────────────────┐
│  1. Navigate to REAL APP page → take screenshot     │
│  2. Navigate to CLONE page → take screenshot        │
│  3. Compare: list EVERY difference                  │
│     - Colors (exact hex, not "close enough")        │
│     - Spacing (margins, padding, gaps)              │
│     - Typography (size, weight, family)             │
│     - Layout (column widths, panel ratios)          │
│     - Components (missing elements, wrong shapes)   │
│     - Icons (missing, wrong size, wrong color)      │
│     - Borders, shadows, border-radius               │
│     - Interactive elements (buttons, dropdowns)      │
│  4. Fix each difference in code                     │
│  5. Wait for HMR (1-2 seconds)                      │
│  6. Re-screenshot the clone                         │
│  7. Compare again — are there remaining issues?     │
│     YES → go to step 4                              │
│     NO  → move to next page                         │
└─────────────────────────────────────────────────────┘
```

### What the AI should track per page

Use a todo list to maintain state across long sessions:

```
- [ ] Dashboard — layout, sidebar, ticket list, stats panel
- [ ] Views page — table columns, status badges, filter bar
- [ ] Ticket detail — left panel, center conversation, right panel, bottom bar
- [ ] Create form — field layout, dropdowns, submit button
- [ ] Customers — list view, search, detail view
- [ ] Organizations — list view, detail view
- [ ] Settings/Admin — tabs, forms, toggles
```

---

## Phase 4: The Multi-Pass Pattern

Each pass catches different classes of bugs:

### Pass 1: Structure & Layout
- Panel widths and heights
- Sidebar vs content vs right panel proportions
- Navigation structure and active states
- Page-level flex/grid layout
- Header/footer positioning
- **Full-width bars vs panel-scoped elements** — if a bar in the real app spans the entire page width (breadcrumbs, status bars, bottom action bars), it MUST be a sibling of the panels wrapper at the root layout level, NOT nested inside a single panel. This is the #1 structural mistake: a bar that should span all three panels gets placed inside the center panel only. Always verify by checking: does this bar's left edge align with the left panel's left edge, and its right edge with the right panel's right edge?

### Pass 2: Usability & Behavior
- Data displays correctly (names, dates, statuses)
- Public vs internal states render differently
- User avatars and icons show up
- Dropdowns open and close
- Form submissions work
- Empty states display properly

### Pass 3: Pixel-Perfect Polish
- Badge colors match exactly (red vs green vs teal)
- Button styles (background, border-radius, padding)
- Chip/pill component styling
- Icon sizes and stroke weights
- Font sizes, weights, line-heights
- Spacing between elements (gap, margin, padding)
- Border colors and widths

---

## Phase 5: Escalation Protocol

The AI will inevitably hit blockers. The protocol:

### Blockers the AI can solve alone
- TypeScript compilation errors → fix the type
- CSS not rendering → check class names, inspect the DOM
- Component not showing → check imports and routing
- Data not loading → check API calls and network tab

### Blockers that need human help
- **Wrong credentials** → AI says "I need the login credentials for [app]"
- **Docker needs restart** → AI says "Backend changes require `docker compose restart`. Can you run this?"
- **Permission denied** → AI says "I need elevated permissions for [command]"
- **Browser session expired** → AI says "The real app session expired. Can you re-login?"

The AI should:
1. Clearly explain what's blocked and why
2. Ask for the minimum intervention needed
3. Continue autonomously once unblocked
4. Never silently skip a blocked task

---

## Phase 6: Human Re-engagement

When you come back after hours:

### Quick status check
Ask: *"What did you fix and what's remaining?"*

The AI should have a todo list showing completed vs pending items.

### Spot-check with screenshots
The AI should be able to show you the current state of any page by navigating to it and taking a screenshot.

### Point out remaining issues
You can accelerate fixes by:

1. **Sharing screenshots** with circles/arrows pointing to issues
2. **Using DOM inspector** — click an element and share its DOM path, position, and styles. The AI immediately knows which element to fix.
3. **Giving the "Ralph loop" instruction** — *"Keep checking both screens back and forth until this page is perfect"*

### Trigger another autonomous pass
If there are still issues across multiple pages:

> *"Restart the process as a new pass across all pages. Focus on [specific issues: colors, icons, spacing, etc.]. You are autonomous."*

---

## Key Rules (embed these in your system prompt or initial message)

### Rule 1: Screenshot Before Claiming Fixed
Never trust code changes alone. CSS stacking contexts, overflow clipping, and font rendering issues only appear when rendered.

### Rule 2: Fix Then Verify, Don't Batch
Fix one issue → screenshot → confirm → next issue. Don't batch 10 fixes and hope they all work.

### Rule 3: Use the Real App as Ground Truth
Don't guess what the UI should look like. Navigate to the real app, screenshot it, and match it exactly.

### Rule 4: Track Progress with Todos
Long autonomous sessions lose context. A todo list per page prevents repeated work and skipped pages.

### Rule 5: Don't Skip Hard Problems
If an element is hard to match (complex dropdown, custom scrollbar, stacked panels), don't skip it. That's exactly where fidelity gaps live.

---

## What This Catches That Code Review Misses

| Bug Type | How Browser Control Catches It | Would Code Review Find It? |
|----------|-------------------------------|---------------------------|
| CSS stacking context (dropdown behind panel) | Open dropdown, see it's clipped | No — code looks correct |
| Wrong element positioning | Side-by-side screenshot comparison | Maybe — but easy to miss |
| `position: fixed` drift on scroll | Scroll while element is open | No — requires interaction |
| Font rendering differences | Zoomed screenshot comparison | No — subtle rendering only visible when rendered |
| Color mismatch (#e35b66 vs #038153) | Screenshot pixel comparison | Only if you know the correct hex |
| Missing icon/avatar | Screenshot shows blank space | Only if you trace every render path |
| Border-radius mismatch | Visual comparison of corners | Unlikely without rendered comparison |
| Layout overflow/clipping | Resize or scroll to trigger | No — depends on content length |
| Full-width bar trapped inside one panel | Screenshot shows bar doesn't span full width | Requires understanding flex layout hierarchy — easy to miss in code |

---

## Adapting This Workflow

### For a different app (not Zendesk)
Replace the page list and comparison targets. The loop is the same — only the pages change.

### For a different AI tool
The workflow needs: (1) file editing, (2) browser control with screenshots, (3) persistent todo tracking. Any tool with these three capabilities works.

### For a team of agents (swarm)
Split pages across agents. Each agent runs the comparison loop on its subset. See `SWARM_PLAN.md` for the parallel orchestration model.

### For non-clone projects (general UI polish)
Replace "real app" with "design mockup" or "Figma file." The loop becomes: screenshot the design → screenshot the implementation → list differences → fix → verify.

---

## Example Session Timeline

```
00:00  Human opens clone + real app in browser, gives autonomous instruction
00:05  AI starts on Dashboard — screenshots both, lists 12 differences
00:20  Dashboard at 100% — moves to Views page
00:35  Views page at 100% — moves to Ticket Detail (most complex page)
01:30  Ticket Detail at 90% — stuck on dropdown z-index bug
01:45  AI fixes z-index with position:fixed + getBoundingClientRect()
02:00  Ticket Detail at 100% — moves to Create Form
02:20  Create Form at 100% — moves to Customers page
02:40  Customers at 100% — moves to Organizations
02:55  Organizations at 100% — moves to Admin/Settings
03:15  All pages Pass 1 complete — starts Pass 2 (usability)
03:30  Pass 2: finds public replies showing as internal — fixes backend field mapping
03:45  Pass 2: finds missing user avatars — enriches backend API response
04:00  Pass 2: fixes tag colors, button positioning, icon sizes
04:30  Pass 2 complete — starts Pass 3 (pixel-perfect polish)
05:00  Pass 3: fixes submit button color (red → dark teal)
05:15  Pass 3: fixes status badge colors (red → green for Open)
05:30  Pass 3: adds toolbar icons, app strip, breadcrumb chips
06:00  Pass 3 complete — all pages at 100% fidelity
06:05  AI reports status and waits for human
```

Total human involvement: ~5 minutes of setup + occasional unblocking.

---

## Integration with Swarm Orchestration

When this workflow is used inside a multi-agent swarm (see [`SWARM_PLAN.md`](./SWARM_PLAN.md)), it operates at two levels:

### Level 1: Agent Self-Verification (during build)

Each build agent receives this workflow as part of their build prompt. After writing code, the agent runs the comparison loop on their own pages before reporting "done." This catches ~80% of fidelity issues at the source.

**Include this in every agent's build prompt:**

```
After writing the code for your assigned pages, run the autonomous
fidelity loop (AUTONOMOUS_WORKFLOW.md):

1. Navigate to the real app in the browser
2. Navigate to your pages at localhost:3000
3. Screenshot both, list every difference, fix, re-verify
4. Only report "done" when your pages match the real app
```

### Level 2: Orchestrator Judges, Agent Iterates (after build)

The orchestrator **never writes code.** It only screenshots and judges. If a page is below 100% fidelity, the orchestrator sends the responsible agent back with a **specific rejection** — the agent re-enters the autonomous loop and keeps iterating until the orchestrator approves.

```
Orchestrator → Agent rejection template:

"These pages failed review (<100% fidelity):
 - [Page name]: [specific issue — e.g., submit button is red, should be dark teal]
 - [Page name]: [specific issue — e.g., breadcrumb items missing gray pill background]

Run the autonomous fidelity loop again on these pages. Compare with the
real app at [URL]. Fix each issue, verify with a screenshot, and report
back when done. You are autonomous."
```

### The feedback loop

```
Agent builds pages
  → Agent self-verifies (autonomous loop)
    → Agent reports "done"
      → Orchestrator screenshots real vs clone, JUDGES (100%?)
        ├── YES → approved
        └── NO → rejects with specific feedback
            → Agent re-enters autonomous loop, keeps iterating
              → Agent reports "done" again
                → Orchestrator re-judges
                  └── (repeat until 100%)
```

**Critical rule: the orchestrator is a judge, not a worker.**

| Orchestrator does | Orchestrator does NOT |
|---|---|
| Screenshot real app vs clone | Edit any source file |
| Compare and score fidelity | Fix CSS, layout, or colors |
| Write specific rejection feedback | Debug code or run tests |
| Approve only at 100% | Decide "close enough" at 80% |

This two-level pattern means:
- **Agents don't ship blind** — they verify their own work before handing off
- **The orchestrator doesn't do the work** — it only judges and rejects
- **Rejections are specific** — the agent knows exactly what to fix, not "make it better"
- **The loop converges** — typically 2-3 rejection rounds per agent to reach 100%
