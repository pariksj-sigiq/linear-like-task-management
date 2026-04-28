# Linear Clone System Plan

## Current Scaffold Snapshot

The checked-out app is still the generic SaaS starter:

- Backend tools: `search_items`, `create_item`
- Frontend routes: `/items`, `/items/new`, `/items/:id`
- Database tables: `users`, `sessions`, `items`, `audit_log`
- Notable blocker: `app/server.py` imports `app.schema`, but no
  `app/schema.py` currently exists in the checkout

This file describes the target system contract for the Linear clone workers.
It does not modify app code.

## Architecture Contract

| Layer | Contract |
|---|---|
| Backend | FastAPI app exposing all user-visible mutations through `POST /step` |
| Database | PostgreSQL, text ids for verifier readability, JSONB only for structured filters/details |
| Frontend | React SPA with session auth, accessible controls, stable `data-testid` values |
| Seed | Deterministic seed through tool server where practical, direct SQL only for auth/bootstrap |
| Tasks | Golden scripts use `POST /step`; verifiers query Postgres directly |

## Core Tables

| Table | Required fields |
|---|---|
| `users` | `id`, `username`, `password`, `full_name`, `email`, `role`, `avatar_url`, `created_at` |
| `teams` | `id`, `key`, `name`, `description`, `created_at`, `updated_at` |
| `team_members` | `team_id`, `user_id`, `role`, `created_at` |
| `workflow_states` | `id`, `team_id`, `name`, `category`, `position`, `color`, `created_at`, `updated_at` |
| `labels` | `id`, `team_id`, `name`, `color`, `description`, `is_archived`, `created_at`, `updated_at` |
| `cycles` | `id`, `team_id`, `name`, `starts_on`, `ends_on`, `status`, `created_at`, `updated_at` |
| `projects` | `id`, `name`, `description`, `status`, `health`, `lead_id`, `target_date`, `created_at`, `updated_at` |
| `issues` | `id`, `team_id`, `identifier`, `title`, `description`, `status_id`, `priority`, `assignee_id`, `creator_id`, `project_id`, `cycle_id`, `parent_id`, `estimate`, `due_date`, `is_archived`, `created_at`, `updated_at` |
| `issue_labels` | `issue_id`, `label_id`, `created_at` |
| `issue_relations` | `id`, `source_issue_id`, `target_issue_id`, `relation_type`, `created_at` |
| `comments` | `id`, `issue_id`, `author_id`, `body`, `created_at`, `updated_at`, `deleted_at` |
| `activity_events` | `id`, `entity_type`, `entity_id`, `actor_id`, `action`, `details`, `created_at` |
| `project_updates` | `id`, `project_id`, `author_id`, `status`, `health`, `body`, `created_at`, `updated_at` |
| `saved_views` | `id`, `owner_id`, `name`, `scope`, `filters_json`, `display_json`, `created_at`, `updated_at` |
| `inbox_notifications` | `id`, `user_id`, `issue_id`, `type`, `status`, `read_at`, `archived_at`, `created_at` |
| `favorites` | `id`, `user_id`, `entity_type`, `entity_id`, `position`, `created_at` |

## Enum Values

| Field | Values |
|---|---|
| `workflow_states.category` | `backlog`, `unstarted`, `started`, `completed`, `canceled` |
| `issues.priority` | `urgent`, `high`, `medium`, `low`, `none` |
| `issue_relations.relation_type` | `blocks`, `blocked_by`, `duplicates`, `related` |
| `projects.status` | `planned`, `active`, `paused`, `completed`, `canceled` |
| `projects.health` and `project_updates.health` | `on_track`, `at_risk`, `blocked` |
| `inbox_notifications.status` | `unread`, `read`, `archived` |

## Tool Contracts

All tools return `structured_content` with ids and human-readable identifiers
for records they create or mutate. If a mutation fails, the `/step`
observation must set `is_error=true`.

| Tool | Mutates | Required parameters |
|---|---|---|
| `list_issues` | No | `team_key`, `filters`, `limit` |
| `search_issues` | No | `query`, `filters`, `limit` |
| `get_issue` | No | `identifier` |
| `create_issue` | Yes | `team_key`, `title`, `description`, `priority`, optional `assignee_username`, `status_name`, `project_id`, `cycle_id`, `parent_identifier`, `label_names` |
| `update_issue` | Yes | `identifier`, optional `title`, `description`, `priority`, `status_name`, `assignee_username`, `project_id`, `cycle_id`, `parent_identifier`, `due_date`, `estimate` |
| `create_sub_issue` | Yes | `parent_identifier`, `title`, `description`, `priority`, optional `assignee_username`, `status_name`, `project_id`, `cycle_id`, `label_names` |
| `create_issue_relation` | Yes | `source_identifier`, `target_identifier`, `relation_type` |
| `delete_issue_relation` | Yes | `source_identifier`, `target_identifier`, `relation_type` |
| `add_comment` | Yes | `issue_identifier`, `body`, optional `author_username` |
| `update_comment` | Yes | `comment_id`, `body` |
| `delete_comment` | Yes | `comment_id` |
| `list_activity` | No | `entity_type`, `entity_id` |
| `list_projects` | No | `filters`, `limit` |
| `get_project` | No | `project_id` |
| `create_project` | Yes | `name`, `description`, `lead_username`, `target_date`, `status`, `health` |
| `update_project` | Yes | `project_id`, optional `status`, `health`, `lead_username`, `target_date`, `description` |
| `create_project_update` | Yes | `project_id`, `status`, `health`, `body`, optional `author_username` |
| `list_project_updates` | No | `project_id` |
| `list_cycles` | No | `team_key`, `status` |
| `update_cycle` | Yes | `cycle_id`, optional `name`, `starts_on`, `ends_on`, `status` |
| `move_issues_to_cycle` | Yes | `identifiers`, `cycle_id` |
| `list_labels` | No | `team_key` |
| `create_label` | Yes | `team_key`, `name`, `color`, optional `description` |
| `update_label` | Yes | `team_key`, `name`, optional `new_name`, `color`, `description`, `is_archived` |
| `apply_issue_labels` | Yes | `identifier`, `label_names` |
| `remove_issue_labels` | Yes | `identifier`, `label_names` |
| `list_workflow_states` | No | `team_key` |
| `create_workflow_state` | Yes | `team_key`, `name`, `category`, `position`, `color` |
| `update_workflow_state` | Yes | `team_key`, `name`, optional `new_name`, `category`, `position`, `color` |
| `list_saved_views` | No | `owner_username`, optional `scope` |
| `create_saved_view` | Yes | `owner_username`, `name`, `scope`, `filters`, `display` |
| `update_saved_view` | Yes | `view_id`, optional `name`, `filters`, `display` |
| `list_my_issues` | No | `username`, `filters`, `limit` |
| `list_inbox` | No | `username`, `status` |
| `mark_inbox_read` | Yes | `notification_id` |
| `archive_inbox_notification` | Yes | `notification_id` |
| `command_palette_search` | No | `query`, `limit` |
| `command_palette_action` | Yes | `action`, `entity_type`, `entity_id`, `parameters` |
| `bulk_update_issues` | Yes | `identifiers`, optional `status_name`, `priority`, `assignee_username`, `project_id`, `cycle_id`, `comment` |
| `bulk_apply_labels` | Yes | `identifiers`, `label_names` |
| `bulk_move_issues` | Yes | `identifiers`, optional `status_name`, `cycle_id`, `project_id` |

## Seed Records Required By Tasks

The CUA task set assumes these records exist. Backend/seed workers should keep
these identifiers stable.

| Type | Required identifiers |
|---|---|
| Users | `alex.rivera`, `maya.patel`, `sam.chen`, `taylor.nguyen`, `jordan.lee`, `priya.shah`, `nora.kim`, `diego.morales` |
| Teams | `PLAT`, `GROW`, `DES` |
| Workflow states | `Backlog`, `Todo`, `In Progress`, `In Review`, `Ready for QA`, `Done`, `Canceled` |
| Labels | `API`, `Security`, `Customer`, `Regression`, `Launch`, `Docs`, `Billing`, `Incident`, `Frontend`, `Backend` |
| Projects | `prj-api-hardening`, `prj-launch-readiness`, `prj-billing-polish` |
| Cycles | `cyc-platform-w18`, `cyc-platform-w19`, `cyc-growth-w18` |
| Issues | `LIN-077`, `LIN-087`, `LIN-099`, `LIN-104`, `LIN-121`, `LIN-122`, `LIN-130`, `LIN-131`, `LIN-132`, `LIN-140`, `LIN-141`, `LIN-142`, `LIN-150`, `LIN-151`, `LIN-152`, `LIN-160`, `LIN-161`, `LIN-162`, `LIN-170`, `LIN-171`, `LIN-172`, `LIN-180`, `LIN-181`, `LIN-182` |

## Frontend Implementation Notes

- Use real buttons, anchors, inputs, comboboxes, and ARIA roles.
- Keep row/card dimensions stable during hover, selection, and loading.
- Never update optimistic UI state unless the `/step` observation is not an
  error.
- On create flows, use the server-returned id before subsequent label,
  relation, comment, or child-issue mutations.
- Make all Tier 2 mutation buttons disabled and visually marked read-only.

