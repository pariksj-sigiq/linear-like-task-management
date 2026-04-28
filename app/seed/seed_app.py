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
        VALUES ('wks_tasks', 'Linear Assessment', 'linear-assessment')
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
        ("tm_plat", "PLAT", "Platform", "terminal", "#5e6ad2"),
        ("tm_grow", "GROW", "Growth", "trending-up", "#4cb782"),
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
        ("customer", "Customer", "#10B981"),
        ("launch", "Launch", "#8B5CF6"),
        ("docs", "Docs", "#64748B"),
        ("billing", "Billing", "#06B6D4"),
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
        ("prj-api-hardening", "API Hardening", "OAuth callback and API reliability work.", "planned", "on_track", "usr_maya", "2026-04-01", "2026-05-30"),
        ("prj-launch-readiness", "Launch Readiness", "Prepare docs, launch review, and handoff work.", "started", "on_track", "usr_priya", "2026-04-08", "2026-06-10"),
        ("prj-billing-polish", "Billing Polish", "Reduce billing escalations before renewal season.", "planned", "on_track", "usr_taylor", "2026-04-15", "2026-06-20"),
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
        ("LIN-077", "Command palette reassignment target", "Todo", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Validate command palette reassignment flow."),
        ("LIN-087", "Fix OAuth callback rollback guard", "In Progress", "high", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Rollback path must be ready before callback changes ship."),
        ("LIN-099", "Enterprise customer follow-up owner missing", "Todo", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Customer issue needs a clear owner handoff."),
        ("LIN-104", "API burn-rate alert parent", "In Progress", "high", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Parent issue for API burn-rate alert work."),
        ("LIN-121", "Callback retry copy follow-up", "Todo", "medium", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Needs relation cleanup."),
        ("LIN-122", "Duplicate OAuth callback task", "Todo", "low", "usr_diego", "prj-api-hardening", "cyc-platform-w18", "Potential duplicate task."),
        ("LIN-130", "Launch review customer import", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Launch review item one."),
        ("LIN-131", "Launch review webhook checklist", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Launch review item two."),
        ("LIN-132", "Launch review settings copy", "In Review", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Launch review item three."),
        ("LIN-133", "Launch review distractor", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Should not be moved to QA."),
        ("LIN-140", "Deferrable low-priority metrics cleanup", "Todo", "low", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Deferrable scope candidate."),
        ("LIN-141", "Deferrable low-priority dashboard polish", "Todo", "low", "usr_nora", "prj-api-hardening", "cyc-platform-w18", "Deferrable scope candidate."),
        ("LIN-142", "Committed W18 production fix", "Todo", "urgent", "usr_maya", "prj-api-hardening", "cyc-platform-w18", "Must remain in W18."),
        ("LIN-150", "Chargeback escalation follow-up", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Billing escalation: chargeback review needed."),
        ("LIN-151", "Invoice export escalation", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Billing escalation: invoice export failure."),
        ("LIN-152", "Tax rounding escalation", "Backlog", "medium", "usr_nora", "prj-billing-polish", "cyc-platform-w19", "Billing escalation: tax rounding mismatch."),
        ("LIN-153", "Billing distractor task", "Backlog", "low", "usr_diego", "prj-billing-polish", "cyc-growth-w18", "Do not bulk assign this issue."),
        ("LIN-160", "Board card that belongs in review", "In Progress", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Board correction target."),
        ("LIN-161", "Board card correctly in progress", "In Progress", "medium", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Should stay in progress."),
        ("LIN-162", "Adjacent board distractor", "Todo", "low", "usr_jordan", "prj-api-hardening", "cyc-platform-w18", "Board distractor."),
        ("LIN-170", "Launch docs parent", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Parent for launch docs handoff."),
        ("LIN-171", "Launch docs relation target", "Todo", "medium", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Relation target for launch docs handoff."),
        ("LIN-172", "Launch docs distractor", "Todo", "low", "usr_priya", "prj-launch-readiness", "cyc-platform-w18", "Do not link this task."),
        ("LIN-180", "Alex active regression candidate one", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target."),
        ("LIN-181", "Alex active regression candidate two", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target."),
        ("LIN-182", "Alex active distractor candidate three", "In Progress", "low", "usr_alex", "prj-api-hardening", "cyc-platform-w18", "My Issues priority pass target but not regression."),
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
        "LIN-130": ["lbl_plat_customer"],
        "LIN-131": ["lbl_plat_customer"],
        "LIN-132": ["lbl_plat_customer"],
        "LIN-150": ["lbl_plat_billing"],
        "LIN-151": ["lbl_plat_billing"],
        "LIN-152": ["lbl_plat_billing"],
        "LIN-170": ["lbl_plat_launch"],
        "LIN-171": ["lbl_plat_launch"],
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
        ("cmt_billing_150", "LIN-150", "Chargeback escalation remains open for the enterprise renewal."),
        ("cmt_billing_151", "LIN-151", "Invoice export escalation is blocking the finance handoff."),
        ("cmt_billing_152", "LIN-152", "Tax rounding escalation is still unresolved for the billing polish project."),
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
        ("notif-alex-001", "comment", "iss_lin_121"),
        ("notif-alex-002", "assigned", "iss_lin_122"),
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


def main() -> None:
    print(f"[seed] Waiting for tool server at {TOOL_SERVER_URL}...")
    wait_for_health(f"{TOOL_SERVER_URL}/health")
    seed_users()

    workspace = tool("create_workspace", {"name": "Acme Product", "url_key": "acme"})
    teams = {}
    for team in [
        ("ENG", "Engineering", "code", "#5e6ad2"),
        ("DES", "Design", "palette", "#d26ac2"),
        ("OPS", "Operations", "workflow", "#4cb782"),
    ]:
        teams[team[0]] = tool(
            "create_team",
            {"workspace_id": workspace["id"], "key": team[0], "name": team[1], "icon": team[2], "color": team[3]},
        )

    user_ids = ["user_001", "user_002", "user_003", "user_004", "user_005", "user_006", "user_007", "user_008"]
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
            ("Customer", "#4cb782"),
            ("P0", "#ffcf5c"),
            ("Area: Frontend", "#d26ac2"),
            ("Area: Backend", "#5e6ad2"),
            ("Research", "#8a8f98"),
        ]:
            label = tool("create_label", {"team_id": team["id"], "name": label_name, "color": color})
            labels_by_team[key][label_name] = label["id"]

    projects: dict[str, dict[str, Any]] = {}
    project_specs = [
        ("prj-api", "API Reliability", "Reduce customer-visible API failure rate.", "started", "at_risk", "user_002", "2026-04-01", "2026-06-15"),
        ("prj-mobile", "Mobile Issue Composer", "Bring quick issue creation to mobile.", "started", "on_track", "user_003", "2026-04-08", "2026-05-30"),
        ("prj-design-system", "Design System Refresh", "Polish core Linear-like primitives.", "planned", "unknown", "user_005", "2026-05-01", "2026-07-10"),
        ("prj-onboarding", "Customer Onboarding Signals", "Surface high-revenue customer asks.", "started", "off_track", "user_006", "2026-03-20", "2026-06-01"),
        ("prj-ops-automation", "Operations Automation", "Automate triage and weekly reporting.", "planned", "on_track", "user_007", "2026-04-15", "2026-07-01"),
        ("prj-roadmap", "Roadmap Planning", "Align cross-team project timelines.", "started", "on_track", "user_001", "2026-04-01", "2026-08-01"),
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
                    "name": f"{key} Cycle {idx}",
                    "start_date": start.isoformat(),
                    "end_date": (start + timedelta(days=13)).isoformat(),
                    "state": state,
                },
            )
            cycles[key].append(cycle)

    issue_titles = {
        "ENG": [
            "Reduce webhook retry latency",
            "Fix OAuth refresh token rotation",
            "Add audit trail for workflow edits",
            "Backfill missing customer request links",
            "Stabilize command palette indexing",
            "Harden bulk issue updates",
            "Expose project health in snapshot",
            "Repair notification read state",
            "Improve cycle rollover metrics",
            "Handle archived relation edge cases",
        ],
        "DES": [
            "Refresh issue row density",
            "Align dark mode contrast tokens",
            "Design customer request empty state",
            "Polish project update composer",
            "Audit picker keyboard states",
            "Rework inbox notification hierarchy",
            "Create roadmap timeline stub",
            "Improve command palette grouping",
            "Document settings page spacing",
            "Prototype cycle progress chart",
        ],
        "OPS": [
            "Create weekly triage view",
            "Define support escalation labels",
            "Automate stale issue reminders",
            "Review enterprise customer asks",
            "Prepare incident retro template",
            "Archive duplicate roadmap issues",
            "Update onboarding project health",
            "Map team capacity by cycle",
            "Clean up no-assignee backlog",
            "Draft cross-team launch checklist",
        ],
    }
    created_issues: list[dict[str, Any]] = []
    priorities = ["urgent", "high", "medium", "low", "none"]
    assignees = ["user_002", "user_003", "user_005", "user_006", "user_007", "user_008", None]
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
                    "description": f"Seeded {key} issue {i + 1} for Linear clone evaluation workflows.",
                    "state_id": states_by_team[key][state_names[i % len(state_names)]],
                    "priority": priorities[i % len(priorities)],
                    "estimate": [1, 2, 3, 5, 8][i % 5],
                    "assignee_id": assignees[i % len(assignees)],
                    "creator_id": "user_002" if i % 2 else "user_001",
                    "project_id": project["id"],
                    "cycle_id": cycle["id"],
                    "due_date": (base + timedelta(days=i + 3)).isoformat(),
                    "label_ids": [labels_by_team[key]["Bug" if i % 3 == 0 else "Feature"], labels_by_team[key]["P0" if i % 11 == 0 else "Customer"]],
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
        ("High priority bugs", {"priority": "urgent"}, "list"),
        ("Customer asks", {"label_id": labels_by_team["OPS"]["Customer"]}, "list"),
        ("No assignee", {"assignee_id": None}, "list"),
        ("In review", {"state_category": "started"}, "board"),
        ("Done this cycle", {"state_category": "completed"}, "list"),
    ]:
        tool("create_view", {"name": name, "owner_id": "user_002", "filter_json": filters, "layout": layout, "group_by": "status"})

    customers = []
    for customer in [
        ("Northstar Bank", "northstar.example", "Enterprise", 240000, "Enterprise", "active"),
        ("Helio Retail", "helio.example", "Business", 82000, "Mid-market", "active"),
        ("Orbit Labs", "orbit.example", "Startup", 18000, "Startup", "trial"),
        ("Cobalt Health", "cobalt.example", "Enterprise", 310000, "Enterprise", "at_risk"),
    ]:
        customers.append(tool("create_customer", {"name": customer[0], "domain": customer[1], "tier": customer[2], "revenue": customer[3], "size": customer[4], "status": customer[5], "owner_id": "user_006"}))
    for idx, customer in enumerate(customers):
        target_issue = created_issues[(idx * 7) % len(created_issues)]
        tool(
            "create_customer_request",
            {
                "customer_id": customer["id"],
                "issue_id": target_issue["id"],
                "requester_name": f"{customer['name']} champion",
                "body": f"{customer['name']} needs this resolved before renewal.",
                "source": "manual",
                "important": idx % 2 == 0,
            },
        )

    tool("create_initiative", {"name": "Improve enterprise reliability", "description": "Rolls up customer-impacting engineering and operations work.", "owner_id": "user_001", "state": "active", "target_date": "2026-08-15", "project_ids": [projects["prj-api"]["id"], projects["prj-onboarding"]["id"], projects["prj-ops-automation"]["id"]]})
    tool("create_initiative", {"name": "Polish planning workflows", "description": "Design and roadmap improvements for planning-heavy teams.", "owner_id": "user_005", "state": "planned", "target_date": "2026-09-01", "project_ids": [projects["prj-design-system"]["id"], projects["prj-roadmap"]["id"]]})

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

    seed_task_fixtures()

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
