# Data Model

Schema file: `app/postgres/init.sql` (424 lines). PKs are text with per-table prefix. Timestamps default `now()`.

## Tables

| Table | Keys | Notes |
|---|---|---|
| `users` | `id user_*`, `username UNIQUE` | `password` plaintext, `role`, `avatar_url`. |
| `sessions` | `id`, `user_id` | Cookie-hash → user mapping. |
| `user_preferences` | `user_id PK` | JSON-shaped per-user settings (theme, compact rows, etc.). See `app/frontend/src/preferences.ts` for keys. |
| `workspaces` | `id ws_*` | Top-level scope. |
| `api_keys` | `id key_*`, `user_id`, `scope` | Plus `settings_actions` fallback for OAuth/webhook rows. |
| `settings_actions` | `id`, `user_id`, `page`, `action`, `details jsonb` | Tier 2 fallback: any click-to-persist action on Tier 2 settings pages. Used by `record_setting_action`. |
| `teams` | `id team_*`, `key UNIQUE` | `key` like `PLAT`. |
| `team_members` | `(team_id, user_id)` | `role`. |
| `workflow_states` | `id st_*`, `team_id`, `name`, `category`, `position`, `color` | `category` ∈ `backlog,unstarted,started,completed,canceled,triage`. |
| `projects` | `id prj_*` | `status` ∈ `planned,active,paused,completed,canceled`. `health` ∈ `on_track,at_risk,blocked`. Stable fixture ids like `prj-api-hardening`. |
| `project_milestones` | `id`, `project_id` | Ordered milestones. |
| `project_statuses` | custom project status lookup | Supports `list_project_statuses`. |
| `project_members` | `(project_id, user_id)` | |
| `cycles` | `id cyc_*`, `team_id` | Fixture ids like `cyc-platform-w18`. |
| `issues` | `id iss_*`, `identifier` like `LIN-130` | FKs: `team_id`, `status_id→workflow_states`, `assignee_id→users`, `creator_id`, `project_id`, `cycle_id`, `parent_id→issues`. |
| `labels` | `id lbl_*`, `team_id`, `name`, `color` | Per-team. Names duplicated across teams (e.g. `P0`) — always scope by team when mutating. |
| `issue_labels` | `(issue_id, label_id)` | |
| `issue_relations` | `id`, `source_issue_id`, `target_issue_id`, `type` | `type` ∈ `blocks,blocked_by,duplicates,related`. Directional. |
| `issue_subscriptions` | `(issue_id, user_id)` | |
| `issue_comments` | `id`, `issue_id`, `author_id`, `body` | Actual user comments. Exposed via `comments` VIEW. |
| `issue_activity` | `id`, `issue_id`, `actor_id`, `kind`, `details jsonb` | System events. Exposed via `activity_events` VIEW. |
| `project_updates` | `id`, `project_id`, `author_id`, `status`, `health`, `body` | Periodic project health updates. |
| `views` | `id view_*`, `owner_id`, `scope`, `filters_json jsonb`, `display_json jsonb` | Exposed via `saved_views` VIEW. |
| `initiatives` | Tier 2 | |
| `initiative_projects` | join | |
| `notifications` | `id`, `user_id`, `issue_id`, `type`, `status`, `read_at`, `archived_at` | Exposed via `inbox_notifications` VIEW. `status` ∈ `unread,read,archived`. |
| `favorites` | `(user_id, entity_type, entity_id)` | |
| `issue_templates` | project/issue templates | |
| `customers` | CRM surface | |
| `customer_requests` | linkable to issues | |
| `audit_log` | `id`, `entity_type`, `entity_id`, `action`, `details jsonb`, `actor_id` | Written by `_audit()`. Verifiers scan this. |

Indexes: `idx_issues_team_state`, `idx_issues_assignee`, `idx_issues_project`, `idx_issues_cycle`, `idx_comments_issue`, `idx_activity_issue`, `idx_project_milestones_project` (see `init.sql:377-382`).

## Views (read-only aliases)

```sql
CREATE VIEW comments          AS SELECT ... FROM issue_comments ...;
CREATE VIEW activity_events   AS SELECT id, issue_id AS entity_id, 'issue' AS entity_type, actor_id, kind AS action, details, created_at FROM issue_activity;
CREATE VIEW saved_views       AS SELECT ... FROM views ...;
CREATE VIEW inbox_notifications AS SELECT ... FROM notifications ...;
```

Task verifiers sometimes SELECT from the view names. When renaming, update both.

## Enums (canonical values)

| Column | Values |
|---|---|
| `workflow_states.category` | `backlog`, `unstarted`, `started`, `completed`, `canceled` (plus `triage`) |
| `issues.priority` | `urgent`, `high`, `medium`, `low`, `none` |
| `issue_relations.type` | `blocks`, `blocked_by`, `duplicates`, `related` |
| `projects.status` | `planned`, `active`, `paused`, `completed`, `canceled` |
| `projects.health` / `project_updates.health` | `on_track`, `at_risk`, `blocked` |
| `notifications.status` | `unread`, `read`, `archived` |

## Stable seed identifiers

From `spec/SYSTEM_PLAN.md` "Seed Records Required By Tasks". **Do not rename. Do not reassign. Verifiers depend on them.**

- Users (usernames): `alex.rivera`, `maya.patel`, `sam.chen`, `taylor.nguyen`, `jordan.lee`, `priya.shah`, `nora.kim`, `diego.morales`.
- Teams (keys): `PLAT`, `GROW`, `DES`.
- Workflow states (per team): `Backlog`, `Todo`, `In Progress`, `In Review`, `Ready for QA`, `Done`, `Canceled`.
- Labels: `API`, `Security`, `Reviewer`, `Regression`, `Submission`, `Docs`, `Task QA`, `Incident`, `Frontend`, `Backend`.
- Projects: `prj-api-hardening`, `prj-launch-readiness`, `prj-billing-polish`.
- Cycles: `cyc-platform-w18`, `cyc-platform-w19`, `cyc-growth-w18`.
- Issues: `LIN-077`, `LIN-087`, `LIN-099`, `LIN-104`, `LIN-121`, `LIN-122`, `LIN-130..132`, `LIN-140..142`, `LIN-150..152`, `LIN-160..162`, `LIN-170..172`, `LIN-180..182`.

## Adding a table — checklist

1. Append `CREATE TABLE` to `init.sql` with text PK and timestamps.
2. Add indexes for FK columns used in filters.
3. (Optional) Add SQLAlchemy model in `models.py` only if you'll query through ORM; most code uses raw SQL helpers.
4. Seed rows in `seed_app.py` via the new tool you'll add.
5. Add snapshot coverage to `/snapshot` if verifiers will scan it.
6. Add Postgres view if a stable public read name differs from the raw table.
