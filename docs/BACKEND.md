# Backend — FastAPI Tool Server

File: `app/server.py` (2700+ LOC single module). Pydantic schemas: `app/schema.py`. SQLAlchemy engine + session: via `DBSession(engine)` context manager used per call.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/health` | Health probe. |
| GET  | `/tools`  | MCP-compatible tool list (name, description, input_schema, mutates_state). |
| POST | `/step`   | Execute a tool by name with parameters. |
| POST | `/reset`  | Wipe DB. Requires reseed after. |
| GET  | `/snapshot` | Full DB dump for verifier sanity. |
| POST | `/api/login`  | Session cookie login. |
| POST | `/api/logout` | Clear session. |
| GET  | `/api/me`     | Current user from session cookie. |

Routes are registered at: `server.py:2579–2686`.

## Tool registry

Tuple-of-4 list at `server.py:1852` (`TOOL_DEFS`):

```python
TOOL_DEFS: list[tuple[str, str, type[Any], bool]] = [
    ("create_workspace", "Create a workspace.", WorkspaceArgs, True),
    ...
]
```

Build loop at `server.py:1999` creates `TOOLS` with `input_schema = _schema_for(cls)`. `Any` type → `{"type":"object","additionalProperties":true}` (used for compatibility aliases).

Count: 137 tuples — run `grep -c '^    ("' app/server.py` or hit `GET /tools`. `scripts/validate.sh` also counts.

## Categories

- **Workspace/team**: create_workspace, search_workspaces, update_workspace, create_team, search_teams, list_teams, add_team_member, list_team_members.
- **Workflow states**: create/list/update/delete/reorder_workflow_states.
- **Labels**: create/search/update/delete_label, bulk_apply_label, apply_issue_labels, remove_issue_labels, bulk_apply_labels.
- **Issues**: create_issue, search_issues, list_issues, list_issues_by_state, get_issue, update_issue, delete_issue, archive_issue, move_issue_state, assign_issue, set_priority, set_estimate, set_due_date, set_project, set_cycle, set_parent, add_subissue, add_label, remove_label, create_sub_issue.
- **Bulk**: bulk_update_issues, bulk_delete_issues, bulk_move_issues.
- **Relations**: add_relation, remove_relation, search_relations, create_issue_relation, add_issue_relation, delete_issue_relation.
- **Comments/activity**: add_comment, edit_comment, delete_comment, get_issue_activity, list_activity, add_issue_comment.
- **Projects**: create/search/get/update/archive/delete_project, create/list/update project_status, set_project_lead, post_project_update, create_project_update, list_project_updates, get_project_progress.
- **Milestones**: create/list/update/delete_milestone.
- **Cycles**: create/search/get/update_cycle, close_cycle, add_to_cycle, remove_from_cycle, get_cycle_metrics, list_cycles, move_issues_to_cycle.
- **Views**: create/search/get/update/delete_view, share_view, list_views, list_saved_views, create_saved_view, update_saved_view.
- **Personal**: list_my_issues, list_created_issues, list_subscribed_issues, list_my_issue_activity, subscribe_issue, unsubscribe_issue.
- **Inbox**: create/list_notifications, mark_notification_read, mark_all_read, snooze_notification, archive_notification, list_inbox, mark_inbox_read, archive_inbox_notification.
- **Favorites/templates/initiatives**: add/list/remove_favorite, create/list_template, create/search_initiative.
- **Customers**: create/search_customer, create/link_customer_request, mark_customer_request_important.
- **Search**: global_search, search_users, command_palette_search, command_palette_action.
- **User admin**: create/update/get_user, get/update_user_preferences.
- **API keys**: create/list/revoke_api_key.
- **Settings fallback**: record_setting_action, list_setting_actions.

Full locked-name list: `spec/FEATURES.md` "Locked Tool Names".

## Pydantic arg models

All in `app/schema.py` (440 LOC). Shared base classes:

- `SearchArgs(query, limit=50)`
- `IdArgs(id)`
- `TeamSearchArgs(query, limit, team_key)`
- Domain: `IssueArgs`, `UpdateIssueArgs`, `BulkIssueArgs`, `CommentArgs`, `RelationArgs`, `ProjectArgs`, `CycleArgs`, `LabelArgs`, `ViewArgs`, etc.

Fields resolve flexible inputs: `team_key` OR `team_id`, `identifier` OR `id` OR `key`, `assignee_username` OR `assignee_id`. Resolvers live in `server.py`: `_resolve_user_id`, `_resolve_team_id`, `_resolve_state_id`, `_resolve_issue_id`, `_resolve_label_ids`.

## Legacy aliases

Many tasks and UI code paths use input shapes that predate the canonical schemas. `_legacy_issue_args`, `_legacy_search_issue_args`, `_legacy_update_issue`, `_legacy_create_issue`, `_legacy_add_comment`, `_legacy_relation`, `_legacy_apply_labels`, `_legacy_identifiers_to_ids` (see `server.py:513+`). The compatibility aliases in `TOOL_DEFS` (bottom of list, tagged `Compatibility alias for ...`) route through these so that tasks written against older names keep working.

When adding a new primary tool, decide whether legacy aliases need to route to it too.

## Audit + activity

- `_audit(db, entity_type, entity_id, action, details)` → `audit_log` row.
- `_activity(db, entity_type, entity_id, actor_id, kind, details)` → `issue_activity` row, which the `activity_events` view exposes.
- Bulk tools must log per identifier so verifiers can match on `details::text ILIKE '%LIN-NNN%'` (see `tasks/linear-T01-submission-review-bulk/tests/verify.py`).

## Error contract

- Tool raises → caught by `/step` handler, returns `observation.is_error=true`, `text=str(exc)`. Frontend branches on this.
- Missing required arg → Pydantic `ValidationError` surfaced as error text.
- Unknown tool name → `is_error` with `Unknown tool: ...`.

## Adding a tool — checklist

1. Args model in `schema.py`.
2. Handler fn in `server.py` matching `def fn(args: ArgsCls) -> dict`.
3. Tuple in `TOOL_DEFS`.
4. Dispatch entry (if not auto-routed — inspect existing dispatch block and match pattern).
5. Audit + activity where appropriate.
6. Unit test in `app/tests/test_tools.py` hitting `/step`.
7. `make validate` to re-count.

Never duplicate a tool name. Prefer compatibility aliases with `Any` schema if an existing tool already covers the behavior.
