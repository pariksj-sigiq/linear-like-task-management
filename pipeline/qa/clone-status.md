# Clone Status Matrix

This is the single source of truth for "which clone is where in the
pipeline." Update it whenever a clone advances a stage — a merged PR,
a completed QA audit, a finished complex-task batch. If the matrix
disagrees with a repo, the repo is right — fix the matrix in the
same PR that moved the work.

> Last refresh: 2026-04-22 by orchestrator during the pipeline-status
> audit (port table correction + complex-tasks column correction +
> Google Docs S-1 / QA_REPORT references). Previous baseline was
> 2026-04-21 after NT-7 (Notion inline comment feed) landed, which
> itself followed the 2026-04-20 overnight QA-fix sweep: every QA audit
> run (Asana, Gmail, Zendesk, Notion, Classroom, Slack, Spotify,
> Sheets, Docs) is logged and every P0 fix PR landed on its canonical
> branch (`main` or `master`). All clone repos currently have **zero
> open PRs**.
>
> Follow-up refresh: 2026-04-20 (later the same day) — **live-bug
> sweep** driven by the owner's own browser walkthrough of the deployed
> clones closed out. 12 PR-backed bugs + 2 ops-only fixes were merged
> across Gmail, Notion, Asana, Slack, Zendesk, Classroom and Sheets,
> each **browser-verified by the orchestrator on the running clone
> before merge** (mandatory rule added that day to the protocol).
>
> Second follow-up refresh: 2026-04-21 — three additional live bugs
> reported by the owner after the first sweep were all fixed,
> orchestrator-browser-verified on the running clones, and merged:
> AS-3 (editable custom-field columns in Asana, `Asana-Clone#10`),
> NT-5 (inline title edit in Notion TableView, `notiondesktop-clone#7`),
> and NT-6 (inline page-comment composer in Notion,
> `notiondesktop-clone#8`). Archive of the tracker lives at
> `pipeline/qa/archive/live-bugs-2026-04-21.md`. All clone repos are
> back to **zero open PRs**.
>
> Third follow-up refresh: 2026-04-21 (later, same day) — one more
> Notion live-bug report driven by two reference screenshots from the
> owner: page comments should appear as an inline feed under the
> properties block in both full-page and peek views, and the right-side
> `All discussions` drawer should be a full-page-only affordance.
> Shipped as NT-7 (`notiondesktop-clone#9`), orchestrator-browser-verified
> on `localhost:3004` (peek + full page, posting + feed auto-refresh,
> drawer auto-close on peek). Archive entry appended to
> `pipeline/qa/archive/live-bugs-2026-04-21.md`. All clone repos remain
> at **zero open PRs**.
>
> Fourth follow-up refresh: 2026-04-22 — pipeline-status audit by the
> orchestrator surfaced two classes of drift in this document itself:
> (1) the **Canonical host ports** table was inaccurate in **8 of 10
> rows** (including a notational Asana↔Slack host-port collision — the
> running clones never actually conflicted), refreshed against each
> clone's `PORTS.md`, `docker-compose.dev.yml`, and `vite.config.ts`
> (all three sources agree on every row); and (2) the **Complex tasks**
> column universally read `not started` but every clone except Spotify
> had already merged a `PR #1` of hard CUA tasks under
> `pipeline/qa/complex-task-authoring.md` — refreshed to match
> reality. Also during this refresh: **Google Docs** row now references
> `collinear-ai/google-docs#2` (QA_REPORT) and `#3` (S-1 toast fix on
> template-tile create); the broken `live-bugs-2026-04-20.md` archive
> reference (from the 2026-04-20 refresh block) was removed, since
> that tracker was never archived as a standalone file; and the Slack
> `tasks/slack-status-and-handoff-prep/` empty-stub directory is noted
> on the Slack row (scheduled for deletion — duplicates
> `slack-pto-handoff-prep`). Spotify is next in the complex-tasks
> queue and authoring is starting the same day.

---

## Columns

- **Clone** — friendly name.
- **Collinear repo** — canonical repo under the `collinear-ai` org.
  `—` means not yet transferred; the clone still lives elsewhere.
- **Template contract** — `validate.sh` pass/fail status against the
  layout required by `collinear-ai/clone-template`.
- **QA audit** — status of the `QA_AUDIT_PROMPT.md` run.
  `green` / `yellow` / `red` follow the rubric in
  `pipeline/qa/QA_AUDIT.md`. `pending` = not yet run.
- **QA fix** — status of the P0 fix PR produced by that audit.
  `—` if the audit had no P0s.
- **Simple tasks** — status of the baseline CUA task batch (each
  clone's first PR of hand-authored tasks).
- **Complex tasks** — status of the feature-inventory-driven
  multi-feature task batch described in
  `pipeline/qa/complex-task-authoring.md`.
- **Notes** — one line of context. Keep it short; link to a PR or
  doc for anything longer.

Statuses are: `not started`, `in progress`, `open PR #N`,
`merged PR #N`, `green`, `yellow`, `red`, `n/a`, `blocked`.

---

## Matrix

| Clone | Collinear repo | Template contract | QA audit | QA fix | Simple tasks | Complex tasks | Notes |
|---|---|---|---|---|---|---|---|
| GitHub | `collinear-ai/github-clone` | pass | green (pilot #1) | merged #2 | merged (pre-pilot) | merged #1 (4 hard) | First clone through the full QA methodology; P0 fixes (labels, notifications, deploy keys, webhooks, ports) landed on main. Complex-task batch (`github-cross-repo-bugfix-flow`, `github-repo-protection-setup`, `github-triage-pr-review-queue`, `github-weekly-triage-and-notifications`) authored via PR #1. |
| Slack | `collinear-ai/slackdesktop-clone` | pass | yellow | merged #2 (2/2 P0) | merged #1 | merged #1 (4 hard) | Overnight: QA audit + P0 fix landed. Complex-task batch (4 hard) was co-landed with the port remap in PR #1. Live-bug sweep: SL-1..SL-4 (#3–#6). Known orphan: `tasks/slack-status-and-handoff-prep/` is an empty-stub directory (no `task.toml`, no `instruction.md`) — duplicates `slack-pto-handoff-prep`; scheduled for deletion. |
| Asana | `collinear-ai/Asana-Clone` | pass | red | merged #7 (6/6 P0) + earlier #3, #4 | merged #1 | merged #1 (4 hard) | Overnight: formal QA audit (red, 6 P0) + fix PR #7 merged. CI workflow added. Complex-task batch (`asana-cross-project-task-migration`, `asana-custom-fields-and-reporting-setup`, `asana-dependency-chain-setup-and-reschedule`, `asana-workload-rebalance-and-notifications`) via PR #1. Live-bug sweep: AS-1..AS-3 (#8–#10). |
| Google Sheets | `collinear-ai/googlesheetsweb_clone` | pass | yellow | n/a (0 P0) | merged | merged #1 (6 hard) | Overnight QA audit: yellow, no P0s. Engine additions (`SUMIF/COUNTIF/AVERAGEIF`, `#CIRC!`) and 6-task complex batch shipped together in PR #1. |
| Notion | `collinear-ai/notiondesktop-clone` | pass | red | merged #2 (6/6 P0) | merged | merged #1 (4 hard) | Overnight: red audit + P0 fix PR landed (add-view, new-database, move-page, templates, block comments, select options). Complex-task batch (4 hard) via PR #1. Follow-up live-bug fixes merged: NT-1..NT-4 (#3–#6), NT-5 inline title (#7), NT-6 inline page-comment composer (#8), NT-7 inline comment feed + drawer gating (#9). |
| Google Docs | `collinear-ai/google-docs` (branch: `master`) | pass | yellow | n/a (0 P0); QA report landed as #2; S-1 fix (template-tile toast on `createDocument` failure) landed as #3 | merged (9 simple tasks pre-pilot: 2 easy, 6 medium, 1 hard `docs-restore-q1-snapshot`) | merged #1 (1 hard: `docs-comment-inline-anchor`) | Overnight QA audit: yellow, no P0s. Branch uses `master`; PR base must be `master` not `main`. Complex-task batch started with PR #1's inline-anchor task; more hard CUA tasks can be added to round out coverage of the 10-task surface. |
| Google Classroom | `collinear-ai/google-classroom-clone` | pass | yellow | merged #2 + #3 (3/3 P0) | merged | merged #1 (13 hard) | Overnight: yellow audit + P0 fix PRs merged (list_classes, create-class modal, join-class flow, e2e rewrite, re-seed step). Largest complex-task batch to date (13 hard: 4 new + 9 promoted from earlier simple tasks) via PR #1. |
| Gmail | `collinear-ai/gmail` (branch: `master`) | pass | yellow | merged #2 (4/4 P0) | merged | merged #1 (3 hard + infra; 8 hard total locally) | Overnight: yellow audit + P0 fix PR landed. Complex-task batch in PR #1 shipped 3 hard tasks from the wait-and-triage family plus task-runner infrastructure; additional hard tasks (apply-weekly-filter, forward-invoice, promotions-starred-none, reply-q2-okr, triage-ack-customer) are present locally. Live-bug sweep: GM-1 (#3). |
| Zendesk | `collinear-ai/zendesk-clone` (branch: `master`) | pass | red | merged #2 + #3 (5/5 P0) | merged | merged #1 (13 hard + primitives) | Overnight: red audit + 2 P0 fix PRs merged (toast/error contract + admin writers/CSAT/delete-ticket). Complex-task batch via PR #1 shipped 13 hard tasks plus Triggers/Automations/SLA primitives. Live-bug sweep: ZD-1 (#4). Pre-existing admin-page e2e selectors marked `pytest.mark.skip` to unblock; track as cleanup. |
| Spotify | `collinear-ai/spotify-clone` | pass (Next.js variant, see `spotify-readiness.md`) | yellow | merged #1 (3/3 P0) | not started | in progress: authoring starts 2026-04-22 | Transferred from `bssngss2-design/spotify-clone` 2026-04-20. Overnight: QA audit + P0 fix PR landed (playlist reorder, like rollback, player persist logging). **Only clone without a complex-task batch**; authoring kicked off 2026-04-22 — simple-tasks batch is being skipped in favor of going straight to complex tasks (per `complex-task-authoring.md` § "When to run this" — QA yellow + trusted surface satisfies the preconditions). |

---

## Canonical host ports

Triple-verified against each clone's `PORTS.md`,
`docker-compose.dev.yml`, and `vite.config.ts` on 2026-04-22 (all three
sources agree on every row).

| Clone | Frontend | Backend | Postgres |
|---|---:|---:|---:|
| Google Sheets | 3008 | 8030 | 5432 |
| GitHub | 3001 | 8050 | 5440 |
| Asana | 3002 | 8031 | 5435 |
| Zendesk | 3003 | 8051 | 5441 |
| Notion | 3004 | 8040 | 5436 |
| Slack | 3005 | 8042 | 5442 |
| Google Docs | 3006 | 8060 | 5460 |
| Google Classroom | 3007 | 8061 | 5434 |
| Gmail | 3009 | 8035 | 5455 |
| Spotify | 3010 | 8070 | 5470 |

Port 3000 is intentionally left empty to avoid collision with the
OS default. Backend container ports are `8030` for every Vite-based
clone (only the **host** port varies); Spotify's Next.js backend runs
on container port `8000`. Postgres container port is always `5432`.
If two clones claim the same host port in this table, the table is
wrong — open a PR to fix it before starting a run.

---

## Legend of typical transitions

The common path for a clone is:

```
not started
  → simple tasks (first PR)
  → QA audit: pending → green/yellow/red
  → (if P0s) QA fix: open PR → merged PR
  → complex tasks: not started → open PR → merged PR
```

A clone that never enters `QA audit: green|yellow` should not
graduate to `complex tasks` — the complex-task workflow assumes the
shipped surface is trustworthy.

---

## Refresh protocol

1. Before claiming a status change, re-check the repo. `gh pr list`
   and `gh pr view` beat memory.
2. Put the matrix update in the **same PR** that moved the clone
   (e.g., the fix-PR or the tasks-PR). Do not let this doc lag.
3. If you discover the matrix was wrong, fix it with a one-line
   commit titled `docs(status): correct <clone> <column> to <value>`.
4. Always update the "Last refresh" line at the top with date +
   trigger.
