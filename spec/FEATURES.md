# Features - Linear Clone

## Summary

- Target app: Linear
- Current repo state: implemented Linear-style clone with self-referential seed data
- Tier 1 full-build features: 18
- Tier 2 read-only/stub features: 8
- Primary evaluation surfaces: Issues, issue detail, projects, cycles, saved
  views, My Issues, Inbox, command palette, bulk operations

## Tier 1 - Full Implementation

| # | Feature | Page types | Required tools | DB tables |
|---|---|---|---|---|
| 1 | Issues list | List, filters | `list_issues`, `search_issues` | `issues`, `workflow_states`, `labels`, `issue_labels` |
| 2 | Issues board | Board | `list_issues`, `update_issue` | `issues`, `workflow_states` |
| 3 | Issue detail | Detail | `get_issue`, `update_issue` | `issues` |
| 4 | Create issue | Modal, page | `create_issue` | `issues`, `activity_events` |
| 5 | Sub-issues | Detail section | `create_sub_issue`, `update_issue` | `issues` |
| 6 | Issue relations | Detail section | `create_issue_relation`, `delete_issue_relation` | `issue_relations` |
| 7 | Comments | Detail section | `add_comment`, `update_comment`, `delete_comment` | `comments` |
| 8 | Activity stream | Detail section | `list_activity` | `activity_events` |
| 9 | Projects | List, detail | `list_projects`, `get_project`, `create_project`, `update_project` | `projects`, `issues` |
| 10 | Project updates | Detail section | `create_project_update`, `list_project_updates` | `project_updates` |
| 11 | Cycles | List, issue filters | `list_cycles`, `update_cycle`, `move_issues_to_cycle` | `cycles`, `issues` |
| 12 | Labels | Pickers, settings subset | `list_labels`, `create_label`, `update_label`, `apply_issue_labels`, `remove_issue_labels` | `labels`, `issue_labels` |
| 13 | Workflow states | Board, settings subset | `list_workflow_states`, `create_workflow_state`, `update_workflow_state` | `workflow_states` |
| 14 | Saved views | List, editor | `list_saved_views`, `create_saved_view`, `update_saved_view` | `saved_views` |
| 15 | My Issues | Personal queue | `list_my_issues`, `update_issue` | `issues` |
| 16 | Inbox | Notification feed | `list_inbox`, `mark_inbox_read`, `archive_inbox_notification` | `inbox_notifications` |
| 17 | Command palette | Global modal | `command_palette_search`, `command_palette_action` | Multiple read/write tables |
| 18 | Bulk operations | List toolbar | `bulk_update_issues`, `bulk_apply_labels`, `bulk_move_issues` | `issues`, `issue_labels`, `activity_events` |

## Tier 2 - Stub Or Read-Only Implementation

| # | Feature | Page type | Required behavior |
|---|---|---|---|
| 19 | Roadmap | List/timeline stub | Seeded roadmap items, disabled create/edit controls |
| 20 | Initiatives | List/detail stub | Seeded initiative cards linked to projects |
| 21 | Triage | Queue stub | Seeded incoming issues, disabled accept/reject buttons |
| 22 | Settings | Shell with subsections | Read-only organization/team/settings panels |
| 23 | Templates | List/detail stub | Seeded templates visible, creation disabled |
| 24 | Shortcuts | Modal/page stub | Shortcut catalog visible from help or settings |
| 25 | Favorites | Sidebar group | User favorites persisted if Tier 1 surface uses them; management can be stubbed |
| 26 | Archive/trash | List stubs | Archived/deleted issues visible, restore/delete disabled |

## Locked Tool Names

The backend worker should expose these exact tool names through `POST /step`.
Task golden scripts and verifiers assume this naming.

| Area | Tool names |
|---|---|
| Issues | `list_issues`, `search_issues`, `get_issue`, `create_issue`, `update_issue`, `create_sub_issue` |
| Relations | `create_issue_relation`, `delete_issue_relation` |
| Comments/activity | `add_comment`, `update_comment`, `delete_comment`, `list_activity` |
| Projects | `list_projects`, `get_project`, `create_project`, `update_project`, `create_project_update`, `list_project_updates` |
| Cycles | `list_cycles`, `update_cycle`, `move_issues_to_cycle` |
| Labels/states | `list_labels`, `create_label`, `update_label`, `apply_issue_labels`, `remove_issue_labels`, `list_workflow_states`, `create_workflow_state`, `update_workflow_state` |
| Views/inbox | `list_saved_views`, `create_saved_view`, `update_saved_view`, `list_my_issues`, `list_inbox`, `mark_inbox_read`, `archive_inbox_notification` |
| Global actions | `command_palette_search`, `command_palette_action`, `bulk_update_issues`, `bulk_apply_labels`, `bulk_move_issues` |

## Seed Data Targets

The seed must be deterministic and task-shaped.

| Entity | Minimum target | Notes |
|---|---|---|
| Users | 8 | Include `alex.rivera`, `maya.patel`, `sam.chen`, `taylor.nguyen` |
| Teams | 3 | Clone Platform, Evaluation QA, Frontend Experience |
| Workflow states | 7 per team | Backlog, Todo, In Progress, In Review, Ready for QA, Done, Canceled |
| Labels | 16 | Include API, Security, Reviewer, Regression, Submission, Docs, Task QA |
| Cycles | 6 | Current and next clone-build cycles for Platform and Evaluation QA |
| Projects | 8 | Include Backend Tool Server Coverage, Submission Readiness, CUA Task Pack |
| Issues | 70 | Enough for filters, board columns, bulk ops, relations |
| Comments | 90 | Mix of user comments and system activity |
| Activity events | 160 | Create/update/relation/comment events |
| Project updates | 18 | Mixed on-track/at-risk/blocked updates |
| Saved views | 10 | Include personal and team views |
| Inbox notifications | 40 | Read/unread/archive mix per user |

## Failure-Mode Targets

| Failure mode | Linear surface |
|---|---|
| Mode confusion | Comments vs activity, relation direction, status vs project health |
| Data-dependent reasoning | Pick records by filters, counts, blocked state, unread state |
| Wrong visually-similar column | Priority vs status, project status vs issue status, cycle vs project |
| Multi-step stateful workflow | Create issue, then label, relate, assign, comment, and update project |
| Self-referential linking | Issue blocks issue, duplicates issue, parent/sub-issue hierarchy |
| Bulk selective action | Update exactly N selected issues without changing distractors |
| Deep menu navigation | Command palette, saved view editor, label/state settings |

## Design Tokens

Use the token values in `spec/RESEARCH.md`. They are public-reference
approximations and should be treated as the clone's implementation contract.

## Navigation Structure

See `spec/RESEARCH.md` for exact route order and data-testids. Tier 1 routes
must be fully interactive. Tier 2 routes must be reachable, visually coherent,
and honest read-only stubs.
