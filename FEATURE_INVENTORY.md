# Feature Inventory - Linear Clone

## Summary

This repo implements a Linear-style issue/project workspace with a React UI, FastAPI tool server, Postgres schema, deterministic seed data, tests, and 15 CUA tasks. The seeded workspace is self-referential: its issues/projects describe the actual work of building and validating this clone.

Seed snapshot after `make seed`:

- Users: 16
- Teams: 5
- Issues: 116
- Projects: 9
- Cycles: 12
- Tools: 118

## Feature Map

| Feature area | Tools | UI surface | Seed/source | Task coverage |
|---|---|---|---|---|
| Issues list/search | `search_issues`, `list_issues`, `list_issues_by_state` | `/my-issues`, `/team/:teamKey/all` | `issues`, `workflow_states`, `labels` | T01, T06, T11, T13 |
| Board view | `search_issues`, `update_issue`, `bulk_update_issues` | Board toggle in issue explorer | `workflow_states`, `issues` | T09, T13 |
| Issue detail | `get_issue`, `update_issue`, `archive_issue` | `/issue/:issueKey` | `issues` | T03, T04, T09, T15 |
| Create issue | `create_issue`, `create_sub_issue` | Quick create modal | `teams`, `users`, `projects` | T02, T14 |
| Sub-issues | `create_sub_issue`, `set_parent` | Issue detail subissues | `issues.parent_id` | T02, T14 |
| Relations | `add_relation`, `create_issue_relation`, `remove_relation` | Issue detail relation form | `issue_relations` | T03, T13, T14 |
| Comments/activity | `add_comment`, `add_issue_comment`, `get_issue_activity`, `list_activity` | Issue detail activity | `issue_comments`, `issue_activity` | T01, T03, T04, T06, T09, T15 |
| Projects | `search_projects`, `get_project`, `create_project`, `update_project` | `/projects`, `/projects/:projectId` | `projects`, `project_updates` | T05, T12 |
| Project updates | `post_project_update`, `create_project_update`, `list_project_updates` | Project detail updates | `project_updates` | T05, T12 |
| Cycles | `search_cycles`, `get_cycle`, `move_issues_to_cycle`, `get_cycle_metrics` | `/team/:teamKey/cycles` | `cycles`, `issues` | T02, T06, T11 |
| Labels | `create_label`, `search_labels`, `apply_issue_labels`, `bulk_apply_labels` | Issue picker/settings subset | `labels`, `issue_labels` | T01, T04, T10, T14 |
| Workflow states | `create_workflow_state`, `list_workflow_states`, `update_workflow_state` | Board/settings | `workflow_states` | T01, T09, T10, T13 |
| Saved views | `search_views`, `list_views`, `create_saved_view`, `update_saved_view` | `/views`, `/views/:viewId` | `views` / `saved_views` view | T07 |
| My Issues | `list_my_issues`, `list_created_issues`, `list_subscribed_issues` | `/my-issues` | `issues`, `issue_subscriptions` | T15 |
| Inbox | `list_notifications`, `list_inbox`, `mark_inbox_read`, `archive_inbox_notification` | `/inbox` | `notifications` / `inbox_notifications` view | T08, T15 |
| Command palette | `global_search`, `command_palette_search`, `command_palette_action` | Cmd-K modal | all primary entities | T09 |
| Bulk operations | `bulk_update_issues`, `bulk_apply_labels`, `bulk_move_issues` | Issue list toolbar | issues and labels | T01, T11 |
| Favorites/templates | `list_favorites`, `add_favorite`, `create_template`, `list_templates` | Sidebar/templates data | `favorites`, `issue_templates` | Seeded/stub |
| Initiatives/roadmap/archive | `search_initiatives`, `create_initiative`, `archive_issue`, `archive_project` | Tier 2 routes | `initiatives`, `favorites`, archived issue fields | Stub coverage |
| Customers/requests | `search_customers`, `create_customer_request`, `link_customer_request` | Tool/API support | `customers`, `customer_requests` | Unit tests |

## CUA Tasks

All tasks live under `tasks/linear-T*/` and include:

- `instruction.md`
- `task.toml`
- `tests/golden_apply.py`
- `tests/verify.py`

Final smoke result: all 15 tasks pass fresh-state negative verification (`0.0`) and golden-state positive verification (`1.0`).
