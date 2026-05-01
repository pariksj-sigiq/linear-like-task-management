# Task Plan - Linear Clone

## 1. Failure-Mode Selection

| # | Failure mode | Reference rate | Why it fits Linear |
|---|---|---|---|
| 1 | Mode confusion | ~80% | Agents confuse issue status, project status, project health, comment streams, and activity streams. |
| 2 | Data-dependent reasoning | ~60% | Several tasks require choosing exact issues from filters, unread state, label combinations, or relation counts. |
| 3 | Wrong visually-similar column | ~60% | Linear-style rows put priority, status, project, cycle, and assignee close together. |
| 4 | Multi-step stateful workflow | ~50% | Correct outcomes require create/update/link/comment actions that depend on prior records. |
| 5 | Self-referential linking | ~50% | Issues can block, duplicate, relate to, or parent other issues. Direction matters. |
| 6 | Bulk selective action | ~40% | Bulk operations must mutate selected issues only and preserve distractors. |

Forbidden difficulty patterns avoided:

- No task is plain single-record CRUD.
- No task relies only on date-range filtering.
- No task rewards a loose text summary instead of final DB state.
- No task uses partial credit.

## 2. Seed-Determinism Discipline

Every task below depends on named seed records. The seed must make each answer
unique. If a task asks for "the only" or "exactly", the verifier checks the
specified final records, not an inferred count from the UI.

## 3. Task Matrix

| ID | Directory | End state | Failure mode | Entities | Difficulty | Seed determinism |
|---|---|---|---|---|---|---|
| T01 | `tasks/linear-T01-submission-review-bulk` | `LIN-130`, `LIN-131`, and `LIN-132` are moved to Ready for QA, labeled Submission, and commented. | Bulk selective action | Issues, labels, comments | L3 | Exactly these three submission review issues start In Review with Reviewer label. |
| T02 | `tasks/linear-T02-tool-coverage-subissues` | `LIN-104` has three named tool-coverage sub-issues, all assigned to Maya, in Backend Tool Server Coverage and Clone Build W18. | Multi-step stateful | Issues, sub-issues | L3 | `LIN-104` has no existing children with these titles. |
| T03 | `tasks/linear-T03-relation-cleanup` | `LIN-121` is blocked by `LIN-087`, `LIN-122` duplicates `LIN-087`, and both have clarifying comments. | Self-referential linking | Issues, relations, comments | L2 | Relation distractors exist but not these directed relations. |
| T04 | `tasks/linear-T04-reviewer-handoff` | `LIN-099` is reassigned to Sam, moved In Progress, labeled Reviewer, and has a handoff comment. | Mode confusion | Issues, labels, comments, activity | L2 | `LIN-099` is the only open reviewer issue without owner handoff. |
| T05 | `tasks/linear-T05-project-risk-update` | Backend Tool Server Coverage is At Risk with a project update mentioning snapshot contract risk, rollback plan, and owner. | Wrong column | Projects, project updates | L2 | Only `prj-api-hardening` has the snapshot contract risk issue. |
| T06 | `tasks/linear-T06-cycle-scope-rebalance` | `LIN-140` and `LIN-141` move from W18 to W19 and receive a scope comment. | Data-dependent reasoning | Issues, cycles, comments | L3 | These two are the only low-priority W18 Platform issues marked deferrable. |
| T07 | `tasks/linear-T07-saved-view-tooling-risk` | Alex owns saved view `Mine: High Tooling Risk` with Clone Platform, high/urgent, API/Security, non-Done filters. | Deep menu navigation | Saved views | L2 | No saved view with this name exists initially. |
| T08 | `tasks/linear-T08-inbox-blocker-cleanup` | Non-blocker unread inbox items for Alex are read and archived; blocker notifications stay unread. | Data-dependent reasoning | Inbox, issues | L3 | Seed has blocker and non-blocker unread notifications for Alex. |
| T09 | `tasks/linear-T09-command-palette-reassign` | `LIN-077` is assigned to Maya, moved In Review, and commented via global action flow. | Deep menu navigation | Command palette, issues, comments | L2 | `LIN-077` starts Todo and assigned to Jordan. |
| T10 | `tasks/linear-T10-label-state-hygiene` | Regression label exists with red color, Ready for QA state exists, and target issues have Regression label. | Mode confusion | Labels, states, issues | L2 | Regression label/state are absent or incomplete before task. |
| T11 | `tasks/linear-T11-taskqa-bulk` | `LIN-150`, `LIN-151`, and `LIN-152` are high priority, assigned to Taylor, and in W18. | Bulk selective action | Issues, cycles | L3 | These are the only stale Task QA bug issues matching the view. |
| T12 | `tasks/linear-T12-project-update-from-comments` | CUA Task Pack update summarizes three task-verifier comments and marks health At Risk. | Data-dependent reasoning | Projects, comments, updates | L3 | Exactly three Task QA issues contain escalation comments. |
| T13 | `tasks/linear-T13-board-column-correction` | `LIN-160` moves to In Review, `LIN-161` stays In Progress, and a relation links `LIN-160` to `LIN-087`. | Wrong column | Board, issues, relations | L2 | Similar adjacent board cards make the target unique by identifier. |
| T14 | `tasks/linear-T14-create-linked-submission-issue` | New submission issue exists under `LIN-170`, assigned to Priya, labeled Submission and Docs, linked to `LIN-171`. | Multi-step stateful | Issues, labels, relations | L3 | No existing issue has the exact submission checklist title. |
| T15 | `tasks/linear-T15-my-issues-priority-pass` | Alex's three active My Issues are reprioritized, commented, and one inbox notification is marked read. | Multi-step stateful | My Issues, comments, inbox | L3 | The three active Alex issues are fixed seed identifiers. |

The stable submission package includes T01-T15.

## 4. Build Order Contract

Each task directory contains:

- `instruction.md`
- `task.toml`
- `tests/golden_apply.py`
- `tests/verify.py`

Instructions are GUI-only, conversational, unnumbered, and ASCII-only. Golden
scripts use `POST /step` through `TOOL_SERVER_URL`, defaulting to
`http://localhost:8030`. Verifiers use `DATABASE_URL`, defaulting to
`postgresql://postgres:postgres@localhost:5432/cloneapp`, and emit one JSON
object with `reward` set to `0.0` or `1.0`.

## 5. Smoke Expectations

`tasks/smoke_test.py` can run selected tasks. A fully implemented Linear clone
should satisfy this loop for each task:

- Fresh seeded database returns `reward: 0.0`.
- Running `tests/golden_apply.py` returns successful tool observations.
- Running `tests/verify.py` returns `reward: 1.0`.

The implemented clone should keep these smokes passing after any seed or tool
contract change. If visible task wording changes, update the matching
`golden_apply.py` and `verify.py` in the same patch.
