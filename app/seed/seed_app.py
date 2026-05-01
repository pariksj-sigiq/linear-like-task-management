"""Seed deterministic Linear clone data through the tool server."""

from __future__ import annotations

import os
import sys
from datetime import date
from datetime import timedelta
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.seed_runner import load_json
from shared.seed_runner import verify_seed
from shared.seed_runner import wait_for_health
import requests

TOOL_SERVER_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/cloneapp")
SEED_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "seed_data")


def tool(name: str, parameters: dict[str, Any] | None = None) -> dict[str, Any]:
    resp = requests.post(
        f"{TOOL_SERVER_URL}/step",
        json={"action": {"tool_name": name, "parameters": parameters or {}}},
        timeout=30,
    )
    resp.raise_for_status()
    obs = resp.json()["observation"]
    if obs["is_error"]:
        raise RuntimeError(f"{name} failed: {obs['text']}")
    return obs["structured_content"]


def seed_users() -> None:
    try:
        import psycopg2
    except ImportError:
        print("[seed] psycopg2 unavailable; users were not seeded.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    users = load_json(os.path.join(SEED_DATA_DIR, "users.json"))
    for user in users:
        cur.execute(
            """
            INSERT INTO users (id, username, password, full_name, email, role, avatar_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                avatar_url = EXCLUDED.avatar_url
            """,
            (
                user["id"],
                user["username"],
                user["password"],
                user["full_name"],
                user["email"],
                user["role"],
                user.get("avatar_url"),
            ),
        )
    cur.close()
    conn.close()
    print(f"[seed] Seeded {len(users)} users.")


def find_by(items: list[dict[str, Any]], key: str, value: Any) -> dict[str, Any]:
    for item in items:
        if item.get(key) == value:
            return item
    raise KeyError(f"Unable to find {key}={value}")


def seed_task_fixtures() -> None:
    """Insert fixed assessment rows used by the CUA golden/verify scripts."""

    try:
        import psycopg2
    except ImportError:
        print("[seed] psycopg2 unavailable; task fixtures were not seeded.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO workspaces (id, name, url_key)
        VALUES ('wks_tasks', 'Product Operations', 'product-operations')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url_key = EXCLUDED.url_key
        """
    )

    users = [
        ("usr_alex", "alex.rivera", "password", "Alex Rivera", "alex.rivera@example.com", "admin"),
        ("usr_maya", "maya.patel", "password", "Maya Patel", "maya.patel@example.com", "standard"),
        ("usr_sam", "sam.chen", "password", "Sam Chen", "sam.chen@example.com", "standard"),
        ("usr_taylor", "taylor.nguyen", "password", "Taylor Nguyen", "taylor.nguyen@example.com", "standard"),
        ("usr_jordan", "jordan.lee", "password", "Jordan Lee", "jordan.lee@example.com", "standard"),
        ("usr_priya", "priya.shah", "password", "Priya Shah", "priya.shah@example.com", "standard"),
        ("usr_nora", "nora.kim", "password", "Nora Kim", "nora.kim@example.com", "standard"),
        ("usr_diego", "diego.morales", "password", "Diego Morales", "diego.morales@example.com", "standard"),
    ]
    for user in users:
        cur.execute(
            """
            INSERT INTO users (id, username, password, full_name, email, role)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role
            """,
            user,
        )

    teams = [
        ("tm_plat", "PLAT", "Clone Platform", "terminal", "#5e6ad2"),
        ("tm_grow", "GROW", "Evaluation QA", "clipboard-check", "#4cb782"),
    ]
    for team_id, key, name, icon, color in teams:
        cur.execute(
            """
            INSERT INTO teams (id, workspace_id, key, name, icon, color)
            VALUES (%s, 'wks_tasks', %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color
            """,
            (team_id, key, name, icon, color),
        )
        for user_id, *_ in users:
            cur.execute(
                """
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (%s, %s, %s)
                ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
                """,
                (team_id, user_id, "admin" if user_id == "usr_alex" else "member"),
            )

    states = [
        ("backlog", "Backlog", "backlog", "#5e6066", 10),
        ("todo", "Todo", "unstarted", "#8a8f98", 20),
        ("progress", "In Progress", "started", "#5e6ad2", 30),
        ("review", "In Review", "started", "#d26ac2", 40),
        ("done", "Done", "completed", "#4cb782", 90),
        ("canceled", "Canceled", "cancelled", "#eb5757", 100),
    ]
    for team_id, key, *_ in teams:
        for slug, name, category, color, position in states:
            cur.execute(
                """
                INSERT INTO workflow_states (id, team_id, name, category, color, position)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, color = EXCLUDED.color, position = EXCLUDED.position
                """,
                (f"ws_{key.lower()}_{slug}", team_id, name, category, color, position),
            )

    labels = [
        ("api", "API", "#5E6AD2"),
        ("security", "Security", "#F59E0B"),
        ("reviewer", "Reviewer", "#10B981"),
        ("submission", "Release", "#8B5CF6"),
        ("docs", "Docs", "#64748B"),
        ("taskqa", "Task QA", "#06B6D4"),
        ("incident", "Incident", "#EF4444"),
        ("frontend", "Frontend", "#EC4899"),
        ("backend", "Backend", "#3B82F6"),
        ("bug", "Bug", "#EF4444"),
    ]
    for team_id, key, *_ in teams:
        for slug, name, color in labels:
            cur.execute(
                """
                INSERT INTO labels (id, team_id, name, color, is_archived)
                VALUES (%s, %s, %s, %s, false)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, is_archived = false
                """,
                (f"lbl_{key.lower()}_{slug}", team_id, name, color),
            )

    projects = [
        ("prj-api-hardening", "Platform Reliability", "Harden API reliability, audit trails, and background job recovery.", "started", "on_track", "usr_maya", "2026-04-01", "2026-05-30"),
        ("prj-launch-readiness", "Release Readiness", "Prepare customer-facing release notes, QA checks, and rollout owners.", "started", "on_track", "usr_priya", "2026-04-08", "2026-06-10"),
        ("prj-billing-polish", "Billing Settings Refresh", "Polish invoices, plan controls, and account administration flows.", "planned", "on_track", "usr_taylor", "2026-04-15", "2026-06-20"),
    ]
    for project in projects:
        cur.execute(
            """
            INSERT INTO projects (id, workspace_id, name, description, state, status, health, lead_id, start_date, target_date)
            VALUES (%s, 'wks_tasks', %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                state = EXCLUDED.state,
                status = EXCLUDED.status,
                health = EXCLUDED.health,
                lead_id = EXCLUDED.lead_id,
                start_date = EXCLUDED.start_date,
                target_date = EXCLUDED.target_date
            """,
            (project[0], project[1], project[2], project[3], project[3], project[4], project[5], project[6], project[7]),
        )

    cycles = [
        ("cyc-platform-w18", "tm_plat", 18, "Platform W18", "2026-04-20", "2026-05-03", "active"),
        ("cyc-platform-w19", "tm_plat", 19, "Platform W19", "2026-05-04", "2026-05-17", "upcoming"),
        ("cyc-growth-w18", "tm_grow", 18, "Growth W18", "2026-04-20", "2026-05-03", "active"),
    ]
    for cycle in cycles:
        cur.execute(
            """
            INSERT INTO cycles (id, team_id, number, name, start_date, end_date, state)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, state = EXCLUDED.state
            """,
            cycle,
        )

    issue_specs = [
        ("LIN-077", "Command palette reassignment flow", "Todo", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Validate the global command palette reassignment path."),
        ("LIN-087", "Rollback guard for failed imports", "In Progress", "high", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Rollback path must be ready before import changes ship."),
        ("LIN-099", "Reviewer handoff owner missing", "Todo", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Reviewer-facing issue needs a clear owner handoff."),
        ("LIN-104", "API reliability parent task", "In Progress", "high", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Parent issue for registry, reporting, and error-contract coverage."),
        ("LIN-121", "Import retry copy follow-up", "Todo", "medium", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Needs relation cleanup around the import rollback guard."),
        ("LIN-122", "Duplicate rollback task", "Todo", "low", "usr_diego", "prj-api-hardening", "cyc-platform-w18", "Potential duplicate of the rollback work."),
        ("LIN-130", "Release notes command checklist", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Release review item for setup and run commands."),
        ("LIN-131", "QA report for release readiness", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Release review item for QA evidence."),
        ("LIN-132", "Feature inventory review", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Release review item for feature coverage mapping."),
        ("LIN-133", "Customer FAQ wording pass", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Support-facing FAQ copy needs a quick pass."),
        ("LIN-140", "Deferrable help center cleanup", "Todo", "low", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Deferrable scope candidate."),
        ("LIN-141", "Deferrable onboarding copy polish", "Todo", "low", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Deferrable scope candidate."),
        ("LIN-142", "Fetch failure recovery fix", "Todo", "urgent", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Must remain in W18."),
        ("LIN-150", "Billing empty-state scoring gap", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Billing settings empty state needs review."),
        ("LIN-151", "Invoice fixture drift", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Invoice preview fixture drift needs review."),
        ("LIN-152", "Plan-change wording mismatch", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Plan-change instructions need a content pass."),
        ("LIN-153", "Billing account ownership cleanup", "Backlog", "low", "usr_diego", "prj-billing-polish", "cyc-growth-w18", "Low-priority account ownership cleanup."),
        ("LIN-160", "Issue detail card belongs in review", "In Progress", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Board correction target."),
        ("LIN-161", "Frontend shell card correctly in progress", "In Progress", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Should stay in progress."),
        ("LIN-162", "Adjacent board cleanup", "Todo", "low", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Board cleanup item."),
        ("LIN-170", "Release checklist parent", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Parent for final release checklist."),
        ("LIN-171", "Packaging relation target", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Relation target for release checklist."),
        ("LIN-172", "Support article cleanup", "Todo", "low", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Support article cleanup item."),
        ("LIN-180", "Row-density regression candidate", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target."),
        ("LIN-181", "Sidebar footer regression candidate", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target."),
        ("LIN-182", "Loading-state polish candidate", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target but not regression."),
    ]
    for identifier, title, state_name, priority, assignee, project_id, cycle_id, description in issue_specs:
        number = int(identifier.split("-")[1])
        state_id = f"ws_plat_{state_name.lower().replace(' ', '_').replace('in_', '')}"
        if state_name == "In Progress":
            state_id = "ws_plat_progress"
        elif state_name == "In Review":
            state_id = "ws_plat_review"
        elif state_name == "Todo":
            state_id = "ws_plat_todo"
        elif state_name == "Backlog":
            state_id = "ws_plat_backlog"
        cur.execute(
            """
            INSERT INTO issues
              (id, team_id, number, identifier, title, description, state_id, status_id, priority, assignee_id, creator_id, project_id, cycle_id, estimate, due_date, is_archived)
            VALUES
              (%s, 'tm_plat', %s, %s, %s, %s, %s, %s, %s, %s, 'usr_alex', %s, %s, 3, '2026-05-08', false)
            ON CONFLICT (id) DO UPDATE SET
              identifier = EXCLUDED.identifier,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              state_id = EXCLUDED.state_id,
              status_id = EXCLUDED.status_id,
              priority = EXCLUDED.priority,
              assignee_id = EXCLUDED.assignee_id,
              project_id = EXCLUDED.project_id,
              cycle_id = EXCLUDED.cycle_id,
              is_archived = false
            """,
            (f"iss_{identifier.lower().replace('-', '_')}", number, identifier, title, description, state_id, state_id, priority, assignee, project_id, cycle_id),
        )

    for identifier, label_ids in {
        "LIN-077": ["lbl_plat_api"],
        "LIN-087": ["lbl_plat_api", "lbl_plat_security"],
        "LIN-099": ["lbl_plat_api"],
        "LIN-104": ["lbl_plat_api"],
        "LIN-121": ["lbl_plat_api"],
        "LIN-122": ["lbl_plat_api"],
        "LIN-130": ["lbl_plat_reviewer"],
        "LIN-131": ["lbl_plat_reviewer"],
        "LIN-132": ["lbl_plat_reviewer"],
        "LIN-150": ["lbl_plat_taskqa"],
        "LIN-151": ["lbl_plat_taskqa"],
        "LIN-152": ["lbl_plat_taskqa"],
        "LIN-170": ["lbl_plat_submission"],
        "LIN-171": ["lbl_plat_submission"],
        "LIN-180": ["lbl_plat_bug"],
        "LIN-181": ["lbl_plat_bug"],
        "LIN-182": ["lbl_plat_bug"],
    }.items():
        issue_id = f"iss_{identifier.lower().replace('-', '_')}"
        for label_id in label_ids:
            cur.execute(
                "INSERT INTO issue_labels (issue_id, label_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (issue_id, label_id),
            )

    comments = [
        ("cmt_taskqa_150", "LIN-150", "Billing empty-state review remains open for the settings refresh."),
        ("cmt_taskqa_151", "LIN-151", "Invoice fixture drift is blocking the billing QA pass."),
        ("cmt_taskqa_152", "LIN-152", "Plan-change wording mismatch is still unresolved."),
    ]
    for comment_id, identifier, body in comments:
        cur.execute(
            """
            INSERT INTO issue_comments (id, issue_id, author_id, body)
            VALUES (%s, %s, 'usr_alex', %s)
            ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body
            """,
            (comment_id, f"iss_{identifier.lower().replace('-', '_')}", body),
        )

    notifications = [
        ("notif-alex-001", "comment", "iss_lin_130"),
        ("notif-alex-002", "assigned", "iss_lin_142"),
        ("notif-alex-blocker-001", "status_change", "iss_lin_087"),
        ("notif-alex-blocker-002", "comment", "iss_lin_104"),
        ("notif-alex-myissues-001", "assigned", "iss_lin_180"),
    ]
    for notification_id, kind, issue_id in notifications:
        cur.execute(
            """
            INSERT INTO notifications (id, recipient_id, kind, actor_id, issue_id, read_at, archived_at)
            VALUES (%s, 'usr_alex', %s, 'usr_maya', %s, NULL, NULL)
            ON CONFLICT (id) DO UPDATE SET read_at = NULL, archived_at = NULL, issue_id = EXCLUDED.issue_id, kind = EXCLUDED.kind
            """,
            (notification_id, kind, issue_id),
        )

    cur.close()
    conn.close()
    print("[seed] Seeded deterministic task fixtures.")


def backdate_seed_timestamps() -> None:
    """Give demo data a realistic history instead of one reset-day timestamp."""

    try:
        import psycopg2
    except ImportError:
        print("[seed] psycopg2 unavailable; timestamp backdating was skipped.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # table, created column, updated column, order, first timestamp, row spacing, update lag
    timestamp_specs = [
        ("workspaces", "created_at", "updated_at", "id", "2026-03-03 09:00:00+00", "7 hours", "2 hours"),
        ("users", "created_at", None, "id", "2026-03-03 10:00:00+00", "6 hours", "0 hours"),
        ("user_preferences", "created_at", "updated_at", "user_id", "2026-03-04 09:00:00+00", "5 hours", "3 hours"),
        ("teams", "created_at", "updated_at", "key", "2026-03-05 09:30:00+00", "8 hours", "2 hours"),
        ("team_members", "created_at", "updated_at", "team_id, user_id", "2026-03-05 11:00:00+00", "90 minutes", "1 hour"),
        ("workflow_states", "created_at", "updated_at", "team_id, position", "2026-03-06 09:00:00+00", "75 minutes", "45 minutes"),
        ("labels", "created_at", "updated_at", "team_id, name", "2026-03-07 10:00:00+00", "2 hours", "1 hour"),
        ("projects", "created_at", "updated_at", "start_date NULLS LAST, name", "2026-03-10 09:00:00+00", "1 day", "6 days"),
        ("project_members", "created_at", "updated_at", "project_id, user_id", "2026-03-11 09:00:00+00", "4 hours", "3 hours"),
        ("project_statuses", "created_at", "updated_at", "position, name", "2026-03-12 09:00:00+00", "3 hours", "1 hour"),
        ("project_milestones", "created_at", "updated_at", "project_id, sort_order", "2026-03-14 10:00:00+00", "9 hours", "4 days"),
        ("cycles", "created_at", "updated_at", "start_date, team_id", "2026-03-18 09:00:00+00", "12 hours", "2 days"),
        ("issues", "created_at", "updated_at", "team_id, number", "2026-03-20 08:30:00+00", "7 hours", "3 days"),
        ("issue_labels", "created_at", "updated_at", "issue_id, label_id", "2026-03-21 09:00:00+00", "5 hours", "2 hours"),
        ("issue_comments", "created_at", "updated_at", "issue_id, id", "2026-03-22 10:00:00+00", "11 hours", "4 hours"),
        ("issue_activity", "created_at", "updated_at", "issue_id, id", "2026-03-22 11:00:00+00", "4 hours", "90 minutes"),
        ("issue_relations", "created_at", "updated_at", "issue_id, related_issue_id", "2026-03-24 09:00:00+00", "15 hours", "2 hours"),
        ("issue_subscriptions", "created_at", "updated_at", "issue_id, user_id", "2026-03-25 09:00:00+00", "10 hours", "1 hour"),
        ("project_updates", "created_at", "updated_at", "project_id, id", "2026-03-26 10:00:00+00", "2 days", "6 hours"),
        ("views", "created_at", "updated_at", "name", "2026-03-27 09:00:00+00", "16 hours", "3 hours"),
        ("customers", "created_at", "updated_at", "name", "2026-03-28 10:00:00+00", "18 hours", "2 hours"),
        ("customer_requests", "created_at", "updated_at", "customer_id, id", "2026-03-29 09:00:00+00", "22 hours", "3 hours"),
        ("initiatives", "created_at", "updated_at", "target_date NULLS LAST, name", "2026-03-30 09:00:00+00", "1 day", "5 hours"),
        ("initiative_projects", "created_at", "updated_at", "initiative_id, project_id", "2026-03-30 13:00:00+00", "8 hours", "2 hours"),
        ("notifications", "created_at", "updated_at", "recipient_id, id", "2026-04-05 09:00:00+00", "14 hours", "2 hours"),
        ("favorites", "created_at", "updated_at", "user_id, sort_order, entity_id", "2026-04-06 11:00:00+00", "9 hours", "1 hour"),
        ("issue_templates", "created_at", "updated_at", "team_id, name", "2026-04-07 09:00:00+00", "7 hours", "2 hours"),
        ("settings_actions", "created_at", "updated_at", "id", "2026-04-08 09:00:00+00", "5 hours", "1 hour"),
    ]

    for table, created_col, updated_col, order_by, start_at, spacing, lag in timestamp_specs:
        created_expr = f"LEAST(%s::timestamptz + ordered.rn * %s::interval, '2026-04-30 11:00:00+00'::timestamptz)"
        assignments = [f"{created_col} = {created_expr}"]
        params: list[str] = [start_at, spacing]
        if updated_col:
            assignments.append(f"{updated_col} = LEAST(%s::timestamptz + ordered.rn * %s::interval + %s::interval, '2026-04-30 18:00:00+00'::timestamptz)")
            params.extend([start_at, spacing, lag])
        cur.execute(
            f"""
            WITH ordered AS (
                SELECT ctid, row_number() OVER (ORDER BY {order_by}) - 1 AS rn
                FROM {table}
            )
            UPDATE {table} AS target
            SET {", ".join(assignments)}
            FROM ordered
            WHERE target.ctid = ordered.ctid
            """,
            params,
        )

    cur.execute(
        """
        UPDATE issues AS issue
        SET
            started_at = CASE
                WHEN state.category = 'started' THEN LEAST(issue.created_at + interval '1 day', '2026-04-30 18:00:00+00'::timestamptz)
                ELSE issue.started_at
            END,
            completed_at = CASE
                WHEN state.category = 'completed' THEN LEAST(issue.created_at + interval '4 days', '2026-04-30 18:00:00+00'::timestamptz)
                ELSE issue.completed_at
            END,
            canceled_at = CASE
                WHEN state.category = 'canceled' THEN LEAST(issue.created_at + interval '2 days', '2026-04-30 18:00:00+00'::timestamptz)
                ELSE issue.canceled_at
            END
        FROM workflow_states AS state
        WHERE state.id = issue.state_id
        """
    )
    cur.execute(
        """
        UPDATE audit_log
        SET performed_at = LEAST(
            '2026-03-20 09:00:00+00'::timestamptz + (ordered.rn * interval '3 hours'),
            '2026-04-30 18:00:00+00'::timestamptz
        )
        FROM (
            SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn
            FROM audit_log
        ) AS ordered
        WHERE audit_log.id = ordered.id
        """
    )

    cur.close()
    conn.close()
    print("[seed] Backdated seed timestamps across March and April.")


def assign_demo_priorities() -> None:
    """Spread issue and project priorities so filter demos always have useful results."""

    try:
        import psycopg2
    except ImportError:
        print("[seed] psycopg2 unavailable; priority distribution was skipped.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        """
        WITH ranked AS (
            SELECT id, row_number() OVER (ORDER BY COALESCE(identifier, id)) - 1 AS rn
            FROM issues
            WHERE is_archived = false
        )
        UPDATE issues AS issue
        SET
            priority = CASE ranked.rn % 5
                WHEN 0 THEN 'urgent'
                WHEN 1 THEN 'high'
                WHEN 2 THEN 'medium'
                WHEN 3 THEN 'low'
                ELSE 'none'
            END,
            updated_at = LEAST(issue.updated_at + interval '30 minutes', '2026-04-30 18:00:00+00'::timestamptz)
        FROM ranked
        WHERE issue.id = ranked.id
        """
    )
    cur.execute(
        """
        WITH ranked AS (
            SELECT id, row_number() OVER (ORDER BY COALESCE(start_date, date '2099-01-01'), name) - 1 AS rn
            FROM projects
            WHERE archived_at IS NULL
        )
        UPDATE projects AS project
        SET
            priority = CASE ranked.rn % 5
                WHEN 0 THEN 'urgent'
                WHEN 1 THEN 'high'
                WHEN 2 THEN 'medium'
                WHEN 3 THEN 'low'
                ELSE 'none'
            END,
            updated_at = LEAST(project.updated_at + interval '30 minutes', '2026-04-30 18:00:00+00'::timestamptz)
        FROM ranked
        WHERE project.id = ranked.id
        """
    )
    cur.close()
    conn.close()
    print("[seed] Distributed issue and project priorities for filter demos.")


def seed_reference_issue_fixtures(workspace_id: str) -> None:
    """Seed exact issue keys used by the Linear reference-style UI surfaces."""

    try:
        import psycopg2
    except ImportError:
        print("[seed] psycopg2 unavailable; reference issue fixtures were not seeded.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    reference_users = [
        ("user_ref_parikshit", "avery.stone", "Avery Stone", "avery.stone@example.com"),
        ("user_ref_minal", "mia.chen", "Mia Chen", "mia.chen@example.com"),
        ("user_ref_vishal", "vikram.rao", "Vikram Rao", "vikram.rao@example.com"),
        ("user_ref_rohan", "rowan.brooks", "Rowan Brooks", "rowan.brooks@example.com"),
        ("user_ref_jaikumar", "jai.kumar", "Jai Kumar", "jai.kumar@example.com"),
        ("user_ref_keita", "keita.mori", "Keita Mori", "keita.mori@example.com"),
        ("user_ref_jasper", "jasper.hale", "Jasper Hale", "jasper.hale@example.com"),
    ]
    for user_id, username, full_name, email in reference_users:
        cur.execute(
            """
            INSERT INTO users (id, username, password, full_name, email, role)
            VALUES (%s, %s, 'password', %s, %s, 'standard')
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email
            """,
            (user_id, username, full_name, email),
        )

    teams = [
        ("tm_ref_elt", "ELT", "Enterprise Lifecycle", "sparkles", "#5e6ad2"),
        ("tm_ref_engg", "ENGG", "Engineering Growth", "code", "#4d7bd6"),
    ]
    for team_id, key, name, icon, color in teams:
        cur.execute(
            """
            INSERT INTO teams (id, workspace_id, key, name, icon, color)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                key = EXCLUDED.key,
                name = EXCLUDED.name,
                icon = EXCLUDED.icon,
                color = EXCLUDED.color
            """,
            (team_id, workspace_id, key, name, icon, color),
        )
        for user_id, *_ in reference_users:
            cur.execute(
                """
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (%s, %s, 'member')
                ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
                """,
                (team_id, user_id),
            )

    state_specs = [
        ("backlog", "Backlog", "backlog", "#5e6066", 10),
        ("todo", "Todo", "unstarted", "#8a8f98", 20),
        ("progress", "In Progress", "started", "#5e6ad2", 30),
        ("pr_review", "In PR Review", "started", "#d26ac2", 35),
        ("review", "In Review", "started", "#d26ac2", 40),
        ("qa_requested", "QA Requested", "started", "#f2a900", 45),
        ("in_qa", "In QA", "started", "#f2a900", 50),
        ("changes_requested", "Changes Requested", "started", "#eb5757", 55),
        ("qa_passed", "QA Passed", "completed", "#4cb782", 60),
        ("done", "Done", "completed", "#4cb782", 90),
        ("canceled", "Canceled", "cancelled", "#95918c", 100),
    ]
    for team_id, key, *_ in teams:
        for slug, name, category, color, position in state_specs:
            cur.execute(
                """
                INSERT INTO workflow_states (id, team_id, name, category, color, position)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    color = EXCLUDED.color,
                    position = EXCLUDED.position
                """,
                (f"ws_ref_{key.lower()}_{slug}", team_id, name, category, color, position),
            )

    projects = [
        ("prj_ref_constructing_linear_clone", "Enterprise onboarding refresh", "Enterprise onboarding and workspace setup improvements.", "started", "on_track", "user_ref_parikshit", "2026-04-01", "2026-06-15"),
        ("prj_ref_et_bug_board", "Customer issue triage", "High-priority customer issue intake and QA board.", "started", "at_risk", "user_ref_parikshit", "2026-04-01", "2026-05-30"),
        ("prj_ref_internal_dashboard_audit", "Admin dashboard audit", "Admin dashboard QA and permissions audit.", "started", "on_track", "user_ref_jaikumar", "2026-04-01", "2026-05-30"),
        ("prj_ref_clever_lms", "Workspace imports", "CSV and third-party workspace import delivery.", "completed", "on_track", "user_ref_parikshit", "2026-03-01", "2026-04-30"),
        ("prj_ref_session_invalidation", "Session management hardening", "Shared-device session revocation and account safety.", "completed", "on_track", "user_ref_parikshit", "2026-03-01", "2026-04-30"),
        ("prj_ref_api_security", "API access control audit", "API access-control and audit logging project.", "completed", "on_track", "user_ref_parikshit", "2026-03-01", "2026-04-30"),
        ("prj_ref_internal_dashboard", "Admin dashboard", "Admin dashboard operations and settings.", "completed", "on_track", "user_ref_rohan", "2026-03-01", "2026-04-30"),
        ("prj_ref_prompt_assignment", "Assignment flow improvements", "Assignment flow design and ownership improvements.", "completed", "on_track", "user_ref_parikshit", "2026-03-01", "2026-04-30"),
        ("prj_ref_live_tutor", "Realtime collaboration refresh", "Realtime collaboration architecture spike.", "canceled", "off_track", "user_ref_parikshit", "2026-02-01", "2026-03-15"),
    ]
    for project in projects:
        cur.execute(
            """
            INSERT INTO projects (id, workspace_id, name, description, state, status, health, lead_id, start_date, target_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                state = EXCLUDED.state,
                status = EXCLUDED.status,
                health = EXCLUDED.health,
                lead_id = EXCLUDED.lead_id,
                start_date = EXCLUDED.start_date,
                target_date = EXCLUDED.target_date
            """,
            (project[0], workspace_id, project[1], project[2], project[3], project[3], project[4], project[5], project[6], project[7]),
        )

    cycles = [
        ("cyc_ref_elt_30", "tm_ref_elt", 30, "Cycle 30", "2026-04-20", "2026-05-03", "active"),
        ("cyc_ref_engg_30", "tm_ref_engg", 30, "Cycle 30", "2026-04-20", "2026-05-03", "active"),
    ]
    for cycle in cycles:
        cur.execute(
            """
            INSERT INTO cycles (id, team_id, number, name, start_date, end_date, state)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                state = EXCLUDED.state
            """,
            cycle,
        )

    assignee_by_text = {
        "Avery Stone": "user_ref_parikshit",
        "Mia Chen": "user_ref_minal",
        "Vikram Rao": "user_ref_vishal",
        "Rowan Brooks": "user_ref_rohan",
        "Jai Kumar": "user_ref_jaikumar",
        "Keita Mori": "user_ref_keita",
        "Jasper Hale": "user_ref_jasper",
    }
    state_slug_by_name = {
        "Backlog": "backlog",
        "Todo": "todo",
        "In Progress": "progress",
        "In PR Review": "pr_review",
        "In Review": "review",
        "QA Requested": "qa_requested",
        "In QA": "in_qa",
        "Changes Requested": "changes_requested",
        "QA Passed": "qa_passed",
        "Done": "done",
        "Canceled": "canceled",
    }
    priority_by_rank = {1: "urgent", 2: "high", 3: "medium", 4: "low"}
    project_by_name = {name: project_id for project_id, name, *_ in projects}

    issue_specs = [
        ("ELT-5", "Handle transient import failures", "In Progress", 2, 30, "Avery Stone", "Enterprise onboarding refresh", "Transient import failures need a retry-safe workflow."),
        ("ELT-6", "Account CTAs trigger the wrong bulk action", "In Review", 3, 30, "Vikram Rao", "Enterprise onboarding refresh", "CTA behavior needs review before assignment changes ship."),
        ("ELT-7", "Workspace identifiers are unclear in detail drawers", "In Review", 3, 30, "Mia Chen", "Enterprise onboarding refresh", "Detail drawers need clearer workspace and owner identifiers."),
        ("ELT-8", "CSV import read/write capability", "Done", 2, 29, "Avery Stone", "Enterprise onboarding refresh", "CSV import read/write capabilities are complete."),
        ("ELT-10", "Unauthorized errors when opening realtime updates", "Done", 2, 28, "Avery Stone", "Enterprise onboarding refresh", "Resolved realtime authorization failures."),
        ("ELT-16", "Repair notification read state", "Todo", 2, 5, "Rowan Brooks", "Enterprise onboarding refresh", "Notification read state should persist across refresh."),
        ("ELT-17", "Design reviewer request empty state", "Todo", 2, 8, "Avery Stone", "Enterprise onboarding refresh", "Reviewer requests need a better empty state."),
        ("ELT-18", "Polish project update composer", "In Progress", 2, 8, "Vikram Rao", "Enterprise onboarding refresh", "Project update composer should match the compact editing flow."),
        ("ELT-19", "Audit picker keyboard states", "In Progress", 2, 13, "Mia Chen", "Enterprise onboarding refresh", "Picker keyboard and focus states need audit coverage."),
        ("ELT-21", "Empty-state scoring gap", "In Review", 1, 21, "Avery Stone", "Enterprise onboarding refresh", "Empty-state scoring gap should be visible in the issue detail."),
        ("ELT-22", "Loading-state polish candidate", "In Progress", 3, 5, "Vikram Rao", "Enterprise onboarding refresh", "Loading-state polish candidate for my-issues activity."),
        ("ELT-23", "Issue flow follow-up", "Todo", 2, 8, "Mia Chen", "Enterprise onboarding refresh", "Follow-up work for issue flow implementation."),
        ("ELT-24", "Spacing regression in project sidebar", "Backlog", 1, 13, "Rowan Brooks", "Enterprise onboarding refresh", "Spacing regression in the project sidebar."),
        ("ELT-25", "Smoke checks need browser coverage", "Todo", 2, 8, "Avery Stone", "Enterprise onboarding refresh", "Smoke checks should cover browser workflows."),
        ("ELT-27", "Inbox split-pane parity", "In Review", 2, 13, "Mia Chen", "Enterprise onboarding refresh", "Inbox split-pane behavior should match the target workflow."),
        ("ELT-28", "Activity board density pass", "Backlog", 2, 21, "Rowan Brooks", "Enterprise onboarding refresh", "Activity board density pass for list readability."),
        ("ENGG-1062", "Runtime session reconstruction spike", "Canceled", 4, 5, "Avery Stone", "Realtime collaboration refresh", "Canceled runtime reconstruction spike."),
        ("ENGG-1626", "Assignment flow design document", "Done", 2, 26, "Avery Stone", "Assignment flow improvements", "Design document is complete."),
        ("ENGG-1631", "Unable to toggle admin services", "Done", 2, 27, "Rowan Brooks", "Admin dashboard", "Admin service toggle issue is complete."),
        ("ENGG-1671", "Workspace import read/write capability", "Done", 2, 29, "Avery Stone", "Workspace imports", "Workspace import capability task."),
        ("ENGG-1757", "Validate shared-device session revocation", "Done", 2, 29, "Avery Stone", "Session management hardening", "Shared-device revocation QA validation."),
        ("ENGG-1772", "Unauthorized errors in realtime updates", "Done", 2, 28, "Avery Stone", "API access control audit", "Realtime unauthorized error fix."),
        ("ENGG-1792", "Account CTAs trigger bulk assignment actions", "In QA", 3, 30, "Jai Kumar", "Customer issue triage", "Account CTAs need corrected assignment behavior."),
        ("ENGG-1795", "Workspace identifiers unclear in admin drawers", "QA Passed", 3, 30, "Jai Kumar", "Admin dashboard audit", "Workspace identifiers need visibility."),
        ("ENGG-1802", "Network request audit", "Backlog", 2, 13, "Keita Mori", "Customer issue triage", "Network request audit task."),
        ("ENGG-1840", "Assignment name mismatch", "Backlog", 2, 8, "Jai Kumar", "Customer issue triage", "Assignment name mismatch."),
        ("ENGG-1847", "Handle transient import failures", "In QA", 2, 30, "Avery Stone", "Customer issue triage", "A transient upstream 500 needs graceful retry handling."),
    ]
    for key, title, state_name, priority_rank, estimate, assignee, project_name, description in issue_specs:
        team_key, number_text = key.split("-", 1)
        number = int(number_text)
        team_id = "tm_ref_elt" if team_key == "ELT" else "tm_ref_engg"
        state_id = f"ws_ref_{team_key.lower()}_{state_slug_by_name[state_name]}"
        project_id = project_by_name[project_name]
        issue_id = f"iss_ref_{team_key.lower()}_{number}"
        cycle_id = "cyc_ref_elt_30" if team_key == "ELT" else "cyc_ref_engg_30"
        priority = priority_by_rank.get(priority_rank, "none")
        assignee_id = assignee_by_text.get(assignee)
        cur.execute(
            """
            INSERT INTO issues
              (id, team_id, number, identifier, title, description, state_id, status_id, priority, estimate,
               assignee_id, creator_id, project_id, cycle_id, due_date, is_archived)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'user_001', %s, %s, '2026-05-08', false)
            ON CONFLICT (id) DO UPDATE SET
              team_id = EXCLUDED.team_id,
              number = EXCLUDED.number,
              identifier = EXCLUDED.identifier,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              state_id = EXCLUDED.state_id,
              status_id = EXCLUDED.status_id,
              priority = EXCLUDED.priority,
              estimate = EXCLUDED.estimate,
              assignee_id = EXCLUDED.assignee_id,
              project_id = EXCLUDED.project_id,
              cycle_id = EXCLUDED.cycle_id,
              due_date = EXCLUDED.due_date,
              is_archived = false
            """,
            (issue_id, team_id, number, key, title, description, state_id, state_id, priority, estimate, assignee_id, project_id, cycle_id),
        )
        cur.execute(
            """
            INSERT INTO issue_activity (id, issue_id, actor_id, kind, to_value)
            VALUES (%s, %s, 'user_001', 'created', %s)
            ON CONFLICT (id) DO UPDATE SET to_value = EXCLUDED.to_value
            """,
            (f"act_ref_{team_key.lower()}_{number}_created", issue_id, title),
        )

    for comment_id, issue_id, author_id, body in [
        ("cmt_ref_engg_1847", "iss_ref_engg_1847", "user_ref_jasper", "Assigned for QA because the upstream import service returned a transient 500."),
        ("cmt_ref_elt_18", "iss_ref_elt_18", "user_ref_vishal", "Composer polish is in progress and needs final picker checks."),
        ("cmt_ref_elt_21", "iss_ref_elt_21", "user_ref_parikshit", "Empty-state scoring gap is still under review."),
    ]:
        cur.execute(
            """
            INSERT INTO issue_comments (id, issue_id, author_id, body)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body
            """,
            (comment_id, issue_id, author_id, body),
        )

    cur.close()
    conn.close()
    print("[seed] Seeded reference issue fixtures for ELT and ENGG keys.")


def main() -> None:
    print(f"[seed] Waiting for tool server at {TOOL_SERVER_URL}...")
    wait_for_health(f"{TOOL_SERVER_URL}/health")
    seed_users()

    workspace = tool("create_workspace", {"name": "Product Operations", "url_key": "product-ops"})
    for position, status in enumerate(
        [
            ("Planned", "planned", "#8a8f98", True),
            ("In Progress", "active", "#5e6ad2", False),
            ("Paused", "paused", "#f2994a", False),
            ("Completed", "completed", "#4cb782", False),
            ("Canceled", "canceled", "#eb5757", False),
        ]
    ):
        tool(
            "create_project_status",
            {
                "workspace_id": workspace["id"],
                "name": status[0],
                "category": status[1],
                "color": status[2],
                "position": position,
                "is_default": status[3],
            },
        )

    teams = {}
    for team in [
        ("ENG", "Backend Tooling", "code", "#5e6ad2"),
        ("DES", "Frontend Experience", "palette", "#d26ac2"),
        ("OPS", "QA & Delivery", "workflow", "#4cb782"),
    ]:
        teams[team[0]] = tool(
            "create_team",
            {"workspace_id": workspace["id"], "key": team[0], "name": team[1], "icon": team[2], "color": team[3]},
        )

    user_ids = ["user_001", "user_002", "user_003", "user_004", "user_005", "user_006", "user_007", "user_008"]
    tool(
        "update_user_preferences",
        {
            "user_id": "user_001",
            "default_home_view": "Active issues",
            "display_names": "Full name",
            "first_day_of_week": "Sunday",
            "convert_emoticons": True,
            "send_comment_shortcut": "⌘+Enter",
            "font_size": "Default",
            "theme": "System",
            "use_pointer_cursors": False,
            "compact_issue_rows": False,
            "sidebar_counts": True,
            "open_at_login": True,
            "default_workspace_id": workspace["id"],
        },
    )
    tool(
        "create_api_key",
        {
            "name": "Local agent access",
            "workspace_id": workspace["id"],
            "created_by": "user_001",
            "agent_name": "POST /step automation",
            "scopes": ["read", "write", "admin"],
        },
    )
    for team in teams.values():
        for user_id in user_ids:
            role = "admin" if user_id == "user_001" else "member"
            tool("add_team_member", {"team_id": team["id"], "user_id": user_id, "role": role})

    states_by_team: dict[str, dict[str, str]] = {}
    for key, team in teams.items():
        states_by_team[key] = {}
        for pos, state in enumerate(
            [
                ("Triage", "triage", "#f2994a"),
                ("Backlog", "backlog", "#5e6066"),
                ("Todo", "unstarted", "#8a8f98"),
                ("In Progress", "started", "#5e6ad2"),
                ("In Review", "started", "#d26ac2"),
                ("Done", "completed", "#4cb782"),
                ("Canceled", "cancelled", "#eb5757"),
            ]
        ):
            created = tool(
                "create_workflow_state",
                {"team_id": team["id"], "name": state[0], "category": state[1], "color": state[2], "position": pos},
            )
            states_by_team[key][state[0]] = created["id"]

    labels_by_team: dict[str, dict[str, str]] = {}
    for key, team in teams.items():
        labels_by_team[key] = {}
        for label_name, color in [
            ("Bug", "#eb5757"),
            ("Feature", "#5e6ad2"),
            ("Reviewer", "#4cb782"),
            ("P0", "#ffcf5c"),
            ("Area: Frontend", "#d26ac2"),
            ("Area: Backend", "#5e6ad2"),
            ("Research", "#8a8f98"),
        ]:
            label = tool("create_label", {"team_id": team["id"], "name": label_name, "color": color})
            labels_by_team[key][label_name] = label["id"]

    projects: dict[str, dict[str, Any]] = {}
    project_specs = [
        ("prj-api", "API Reliability", "Complete the tool surface, reset contract, and audit logging for automation.", "started", "at_risk", "user_002", "2026-04-01", "2026-06-15"),
        ("prj-mobile", "Issue Workflow Experience", "Build issue list, board, detail, quick-create, and picker flows.", "started", "on_track", "user_003", "2026-04-08", "2026-05-30"),
        ("prj-design-system", "Design System Refresh", "Polish dense UI primitives, spacing, contrast, and responsive behavior.", "planned", "unknown", "user_005", "2026-05-01", "2026-07-10"),
        ("prj-onboarding", "Workspace Onboarding", "Improve first-run setup, templates, and guided workspace configuration.", "started", "off_track", "user_006", "2026-03-20", "2026-06-01"),
        ("prj-ops-automation", "QA Automation", "Automate smoke checks, seed validation, and browser regression coverage.", "planned", "on_track", "user_007", "2026-04-15", "2026-07-01"),
        ("prj-roadmap", "Roadmap Planning", "Prepare customer-facing roadmap views, release notes, and rollout owners.", "started", "on_track", "user_001", "2026-04-01", "2026-08-01"),
    ]
    for slug, name, desc, state, health, lead, start, target in project_specs:
        projects[slug] = tool(
            "create_project",
            {
                "workspace_id": workspace["id"],
                "name": name,
                "description": desc,
                "state": state,
                "health": health,
                "lead_id": lead,
                "start_date": start,
                "target_date": target,
                "color": "#5e6ad2",
            },
        )
        tool("post_project_update", {"project_id": projects[slug]["id"], "author_id": lead, "health": health, "body": f"{name} is currently {health.replace('_', ' ')}."})

    base = date(2026, 4, 6)
    cycles: dict[str, list[dict[str, Any]]] = {}
    for key, team in teams.items():
        cycles[key] = []
        for idx, state in enumerate(["completed", "active", "upcoming"], start=1):
            start = base + timedelta(days=(idx - 2) * 14)
            cycle = tool(
                "create_cycle",
                {
                    "team_id": team["id"],
                    "number": idx,
                    "name": f"{key} Build Sprint {idx}",
                    "start_date": start.isoformat(),
                    "end_date": (start + timedelta(days=13)).isoformat(),
                    "state": state,
                },
            )
            cycles[key].append(cycle)

    issue_titles = {
        "ENG": [
            "Expose automation registry",
            "Fix import summary completeness",
            "Add audit trail for workflow edits",
            "Backfill customer request links",
            "Stabilize command palette indexing",
            "Harden bulk issue updates",
            "Expose project health in reports",
            "Repair notification read state",
            "Improve cycle rollover metrics",
            "Handle archived relation edge cases",
        ],
        "DES": [
            "Refresh issue row density",
            "Align dark mode contrast tokens",
            "Design reviewer request empty state",
            "Polish project update composer",
            "Audit picker keyboard states",
            "Rework inbox notification hierarchy",
            "Create roadmap timeline stub",
            "Improve command palette grouping",
            "Document settings page spacing",
            "Prototype cycle progress chart",
        ],
        "OPS": [
            "Create weekly task triage view",
            "Define evaluation escalation labels",
            "Automate stale issue reminders",
            "Review assignment feedback asks",
            "Prepare QA retro template",
            "Archive duplicate roadmap issues",
            "Update onboarding health",
            "Map team capacity by cycle",
            "Clean up no-assignee backlog",
            "Draft cross-team release checklist",
        ],
    }
    created_issues: list[dict[str, Any]] = []
    priorities = ["urgent", "high", "medium", "low", "none"]
    assignees = ["user_001", "user_002", "user_003", "user_005", "user_006", "user_007", "user_008", None]
    state_names = ["Triage", "Backlog", "Todo", "In Progress", "In Review", "Done"]
    project_cycle = list(projects.values())
    for key, titles in issue_titles.items():
        for i in range(30):
            title = titles[i % len(titles)] if i < len(titles) else f"{titles[i % len(titles)]} follow-up {i // len(titles) + 1}"
            project = project_cycle[(i + len(key)) % len(project_cycle)]
            cycle = cycles[key][i % len(cycles[key])]
            issue = tool(
                "create_issue",
                {
                    "team_id": teams[key]["id"],
                    "title": title,
                    "description": f"Seeded {key} issue {i + 1} for product planning and delivery workflows.",
                    "state_id": states_by_team[key][state_names[i % len(state_names)]],
                    "priority": priorities[i % len(priorities)],
                    "estimate": [1, 2, 3, 5, 8][i % 5],
                    "assignee_id": assignees[i % len(assignees)],
                    "creator_id": "user_002" if i % 2 else "user_001",
                    "project_id": project["id"],
                    "cycle_id": cycle["id"],
                    "due_date": (base + timedelta(days=i + 3)).isoformat(),
                    "label_ids": [labels_by_team[key]["Bug" if i % 3 == 0 else "Feature"], labels_by_team[key]["P0" if i % 11 == 0 else "Reviewer"]],
                },
            )
            created_issues.append(issue)
            if i % 4 == 0:
                tool("add_comment", {"issue_id": issue["id"], "author_id": "user_003", "body": f"Follow-up note for {issue['key']} with current investigation details."})
            if i % 9 == 0 and created_issues:
                parent = created_issues[max(0, len(created_issues) - 2)]["id"]
                tool("set_parent", {"issue_id": issue["id"], "parent_id": parent})
            if i % 10 == 0 and len(created_issues) > 1:
                tool("add_relation", {"issue_id": issue["id"], "related_issue_id": created_issues[-2]["id"], "type": "blocks"})

    for name, filters, layout in [
        ("My active work", {"assignee_id": "user_002", "state_category": "started"}, "list"),
        ("High priority regressions", {"priority": "urgent"}, "list"),
        ("Reviewer asks", {"label_id": labels_by_team["OPS"]["Reviewer"]}, "list"),
        ("No assignee", {"assignee_id": None}, "list"),
        ("In review", {"state_category": "started"}, "board"),
        ("Done this sprint", {"state_category": "completed"}, "list"),
    ]:
        tool("create_view", {"name": name, "owner_id": "user_002", "filter_json": filters, "layout": layout, "group_by": "status"})

    customers = []
    for customer in [
        ("Northstar Health", "northstar.example", "Enterprise", 240000, "Healthcare", "active"),
        ("Atlas Support", "atlas-support.example", "Business", 82000, "Support", "active"),
        ("Brightlane Labs", "brightlane.example", "Startup", 18000, "Technology", "trial"),
        ("Summit Retail", "summit-retail.example", "Enterprise", 310000, "Retail", "at_risk"),
    ]:
        customers.append(tool("create_customer", {"name": customer[0], "domain": customer[1], "tier": customer[2], "revenue": customer[3], "size": customer[4], "status": customer[5], "owner_id": "user_006"}))
    for idx, customer in enumerate(customers):
        target_issue = created_issues[(idx * 7) % len(created_issues)]
        tool(
            "create_customer_request",
            {
                "customer_id": customer["id"],
                "issue_id": target_issue["id"],
                "requester_name": f"{customer['name']} reviewer",
                "body": f"{customer['name']} needs this resolved before the next account review.",
                "source": "manual",
                "important": idx % 2 == 0,
            },
        )

    tool("create_initiative", {"name": "Improve workflow reliability", "description": "Rolls up API reliability, workspace onboarding, and QA automation.", "owner_id": "user_001", "state": "active", "target_date": "2026-08-15", "project_ids": [projects["prj-api"]["id"], projects["prj-onboarding"]["id"], projects["prj-ops-automation"]["id"]]})
    tool("create_initiative", {"name": "Polish planning experience", "description": "Design system, roadmap surfaces, and release communication improvements.", "owner_id": "user_005", "state": "planned", "target_date": "2026-09-01", "project_ids": [projects["prj-design-system"]["id"], projects["prj-roadmap"]["id"]]})

    milestone_specs = [
        ("Scope & design", "Finalize scope and discovery docs.", 5, "completed"),
        ("Beta milestone", "Ship internal beta and gather feedback.", 25, "in_progress"),
        ("General availability", "Public release ready.", 55, "planned"),
    ]
    for slug, project in projects.items():
        existing = tool("list_milestones", {"id": project["id"]}).get("milestones", [])
        if existing:
            continue
        start_date = date(2026, 4, 15)
        for idx, (name, description, offset_days, status) in enumerate(milestone_specs):
            tool(
                "create_milestone",
                {
                    "project_id": project["id"],
                    "name": name,
                    "description": description,
                    "target_date": (start_date + timedelta(days=offset_days)).isoformat(),
                    "status": status,
                    "sort_order": idx,
                },
            )

    for user_id, issue in [("user_002", created_issues[0]), ("user_002", created_issues[11]), ("user_003", created_issues[22]), ("user_006", created_issues[33])]:
        tool("create_notification", {"recipient_id": user_id, "kind": "assigned", "actor_id": "user_001", "issue_id": issue["id"]})
    for user_id, project in [("user_002", projects["prj-api"]), ("user_005", projects["prj-design-system"]), ("user_001", projects["prj-roadmap"])]:
        tool("add_favorite", {"user_id": user_id, "kind": "project", "entity_id": project["id"], "sort_order": 1})

    for key, team in teams.items():
        for name, payload in [
            ("Bug report", {"priority": "high", "labels": ["Bug"]}),
            ("Feature request", {"priority": "medium", "labels": ["Feature"]}),
            ("Incident retro", {"priority": "urgent", "labels": ["P0"]}),
        ]:
            tool("create_template", {"team_id": team["id"], "name": f"{key} {name}", "payload_json": payload, "created_by": "user_001"})

    seed_reference_issue_fixtures(workspace["id"])
    seed_task_fixtures()
    backdate_seed_timestamps()
    assign_demo_priorities()

    print("[seed] Verifying seed...")
    verify_seed(
        TOOL_SERVER_URL,
        expected_tools=[
            "search_issues",
            "create_issue",
            "update_issue",
            "search_projects",
            "create_project",
            "global_search",
            "list_notifications",
        ],
    )
    print("[seed] Done.")


if __name__ == "__main__":
    main()
