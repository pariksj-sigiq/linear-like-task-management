"""FastAPI tool server for the Linear clone.

The clone exposes every meaningful Linear-style operation through POST /step
while serving the same data to the React UI. Verifiers can query Postgres
directly against the tables in app/postgres/init.sql.
"""

from __future__ import annotations

import json
import os
import secrets
from contextlib import asynccontextmanager
from datetime import date
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any

from fastapi import Cookie
from fastapi import FastAPI
from fastapi import Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session as DBSession

from app.models import Session as SessionModel
from app.models import User
from app.schema import BulkIssueArgs
from app.schema import CommentArgs
from app.schema import CustomerArgs
from app.schema import CustomerRequestArgs
from app.schema import CycleArgs
from app.schema import EmptyArgs
from app.schema import FavoriteArgs
from app.schema import GetIssueArgs
from app.schema import IdArgs
from app.schema import InitiativeArgs
from app.schema import IssueArgs
from app.schema import IssueAssigneeArgs
from app.schema import IssueCycleArgs
from app.schema import IssueDueDateArgs
from app.schema import IssueEstimateArgs
from app.schema import IssueLabelArgs
from app.schema import IssueParentArgs
from app.schema import IssuePriorityArgs
from app.schema import IssueProjectArgs
from app.schema import IssueStateArgs
from app.schema import LabelArgs
from app.schema import LoginRequest
from app.schema import MilestoneArgs
from app.schema import NotificationActionArgs
from app.schema import NotificationArgs
from app.schema import ProjectArgs
from app.schema import ProjectUpdateArgs
from app.schema import RelationArgs
from app.schema import ReorderWorkflowStatesArgs
from app.schema import SearchArgs
from app.schema import SearchIssuesArgs
from app.schema import SnoozeNotificationArgs
from app.schema import TeamArgs
from app.schema import TeamMemberArgs
from app.schema import TeamSearchArgs
from app.schema import TemplateArgs
from app.schema import UpdateCycleArgs
from app.schema import UpdateIssueArgs
from app.schema import UpdateLabelArgs
from app.schema import UpdateMilestoneArgs
from app.schema import UpdateProjectArgs
from app.schema import UpdateViewArgs
from app.schema import UpdateWorkflowStateArgs
from app.schema import UserSearchArgs
from app.schema import ViewArgs
from app.schema import WorkflowStateArgs
from app.schema import WorkspaceArgs

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/cloneapp",
)
SYNC_DB_URL = DATABASE_URL.replace("+asyncpg", "")
SESSION_DURATION_HOURS = 24
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

engine = create_engine(SYNC_DB_URL, pool_pre_ping=True)


class ToolResult:
    def __init__(self, *, is_error: bool, text: str = "", structured_content: Any = None):
        self.is_error = is_error
        self.text = text
        self.structured_content = structured_content


def _jsonify(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_jsonify(v) for v in value]
    if isinstance(value, dict):
        return {k: _jsonify(v) for k, v in value.items()}
    return value


def _row(row: RowMapping | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return _jsonify(dict(row))


def _rows(rows: list[RowMapping]) -> list[dict[str, Any]]:
    return [_jsonify(dict(r)) for r in rows]


def observation_from_result(result: ToolResult) -> dict[str, Any]:
    content = [{"type": "text", "text": result.text}] if result.text else []
    return {
        "observation": {
            "is_error": result.is_error,
            "text": result.text,
            "content": content,
            "structured_content": result.structured_content,
        },
        "reward": None,
        "done": False,
    }


def get_current_user(session_token: str | None) -> dict[str, Any] | None:
    if not session_token:
        return None
    with DBSession(engine) as db:
        row = db.execute(
            text(
                "SELECT u.id, u.username, u.full_name, u.email, u.role, u.avatar_url "
                "FROM sessions s JOIN users u ON s.user_id = u.id "
                "WHERE s.token = :token AND s.expires_at > NOW()"
            ),
            {"token": session_token},
        ).mappings().fetchone()
        return _row(row)


def _scalar(db: DBSession, sql: str, params: dict[str, Any] | None = None) -> Any:
    return db.execute(text(sql), params or {}).scalar()


def _one(db: DBSession, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    return _row(db.execute(text(sql), params or {}).mappings().fetchone())


def _many(db: DBSession, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return _rows(db.execute(text(sql), params or {}).mappings().all())


def _next_id(db: DBSession, table: str, prefix: str) -> str:
    count = int(_scalar(db, f"SELECT COUNT(*) FROM {table}") or 0) + 1
    while True:
        candidate = f"{prefix}_{count:03d}"
        exists = _scalar(db, f"SELECT COUNT(*) FROM {table} WHERE id = :id", {"id": candidate})
        if not exists:
            return candidate
        count += 1


def _audit(db: DBSession, entity_type: str, entity_id: str, action: str, details: dict[str, Any] | None = None) -> None:
    db.execute(
        text(
            "INSERT INTO audit_log (entity_type, entity_id, action, details) "
            "VALUES (:entity_type, :entity_id, :action, CAST(:details AS jsonb))"
        ),
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "details": json.dumps(_jsonify(details or {})),
        },
    )


def _activity(
    db: DBSession,
    issue_id: str | None,
    kind: str,
    *,
    actor_id: str | None = "user_001",
    from_value: Any = None,
    to_value: Any = None,
) -> None:
    if not issue_id:
        return
    db.execute(
        text(
            "INSERT INTO issue_activity (id, issue_id, actor_id, kind, from_value, to_value) "
            "VALUES (:id, :issue_id, :actor_id, :kind, :from_value, :to_value)"
        ),
        {
            "id": _next_id(db, "issue_activity", "act"),
            "issue_id": issue_id,
            "actor_id": actor_id,
            "kind": kind,
            "from_value": None if from_value is None else str(from_value),
            "to_value": None if to_value is None else str(to_value),
        },
    )


def _touch_issue(db: DBSession, issue_id: str) -> None:
    db.execute(text("UPDATE issues SET updated_at = NOW() WHERE id = :id"), {"id": issue_id})


def _issue_key(issue: dict[str, Any]) -> str:
    return issue.get("identifier") or f"{issue['team_key']}-{issue['number']}"


def _issue_select() -> str:
    return """
        SELECT i.*, t.key AS team_key, t.name AS team_name,
               ws.name AS state_name, ws.category AS state_category, ws.color AS state_color,
               assignee.username AS assignee_username, assignee.full_name AS assignee_name,
               creator.username AS creator_username, creator.full_name AS creator_name,
               p.name AS project_name, c.name AS cycle_name
        FROM issues i
        JOIN teams t ON t.id = i.team_id
        LEFT JOIN workflow_states ws ON ws.id = i.state_id
        LEFT JOIN users assignee ON assignee.id = i.assignee_id
        LEFT JOIN users creator ON creator.id = i.creator_id
        LEFT JOIN projects p ON p.id = i.project_id
        LEFT JOIN cycles c ON c.id = i.cycle_id
    """


def _labels_for_issue(db: DBSession, issue_id: str) -> list[dict[str, Any]]:
    return _many(
        db,
        """
        SELECT l.* FROM labels l
        JOIN issue_labels il ON il.label_id = l.id
        WHERE il.issue_id = :issue_id
        ORDER BY l.name
        """,
        {"issue_id": issue_id},
    )


def _hydrate_issue(db: DBSession, issue: dict[str, Any]) -> dict[str, Any]:
    issue["key"] = _issue_key(issue)
    issue["identifier"] = issue.get("identifier") or issue["key"]
    issue["status"] = issue.get("state_name") or issue.get("status")
    issue["state"] = {
        "id": issue.get("state_id"),
        "name": issue.get("state_name"),
        "category": issue.get("state_category"),
        "color": issue.get("state_color"),
    }
    issue["assignee"] = None
    if issue.get("assignee_id"):
        issue["assignee"] = {
            "id": issue.get("assignee_id"),
            "username": issue.get("assignee_username"),
            "full_name": issue.get("assignee_name"),
        }
    issue["creator"] = None
    if issue.get("creator_id"):
        issue["creator"] = {
            "id": issue.get("creator_id"),
            "username": issue.get("creator_username"),
            "full_name": issue.get("creator_name"),
        }
    issue["team"] = {"id": issue.get("team_id"), "key": issue.get("team_key"), "name": issue.get("team_name")}
    issue["project"] = {"id": issue.get("project_id"), "name": issue.get("project_name")} if issue.get("project_id") else None
    issue["cycle"] = {"id": issue.get("cycle_id"), "name": issue.get("cycle_name")} if issue.get("cycle_id") else None
    issue["labels"] = _labels_for_issue(db, issue["id"])
    return issue


def _get_issue_by_ref(db: DBSession, *, issue_id: str | None = None, key: str | None = None) -> dict[str, Any] | None:
    if key and not issue_id:
        direct = _one(db, _issue_select() + " WHERE i.identifier = :identifier", {"identifier": key})
        if direct:
            return _hydrate_issue(db, direct)
        if "-" not in key:
            return None
        team_key, number = key.rsplit("-", 1)
        if not number.isdigit():
            return None
        row = _one(
            db,
            _issue_select() + " WHERE t.key = :team_key AND i.number = :number",
            {"team_key": team_key, "number": int(number)},
        )
    else:
        row = _one(db, _issue_select() + " WHERE i.id = :id OR i.identifier = :id", {"id": issue_id})
    if not row:
        return None
    return _hydrate_issue(db, row)


def _resolve_user_id(db: DBSession, value: str | None) -> str | None:
    if not value:
        return None
    found = _scalar(db, "SELECT id FROM users WHERE id = :value OR username = :value", {"value": value})
    return found or value


def _resolve_team_id(db: DBSession, value: str | None) -> str | None:
    if not value:
        return None
    found = _scalar(db, "SELECT id FROM teams WHERE id = :value OR key = :value", {"value": value})
    return found or value


def _resolve_state_id(db: DBSession, team_id: str | None, value: str | None) -> str | None:
    if not value:
        return None
    value = _normalize_status_value(value)
    found = _scalar(
        db,
        "SELECT id FROM workflow_states WHERE id = :value OR (name = :value AND (:team_id IS NULL OR team_id = :team_id)) ORDER BY position LIMIT 1",
        {"value": value, "team_id": team_id},
    )
    return found or value


def _resolve_or_create_state_id(db: DBSession, team_id: str | None, value: str | None) -> str | None:
    if not value:
        return None
    found = _resolve_state_id(db, team_id, value)
    if found != value or not team_id:
        return found
    state_id = _next_id(db, "workflow_states", "ws")
    db.execute(
        text(
            """
            INSERT INTO workflow_states (id, team_id, name, category, color, position)
            VALUES (:id, :team_id, :name, :category, :color, :position)
            """
        ),
        {
            "id": state_id,
            "team_id": team_id,
            "name": value,
            "category": "completed" if value.lower() == "done" else "started",
            "color": "#5e6ad2",
            "position": 50,
        },
    )
    return state_id


def _normalize_status_value(value: str | None) -> str | None:
    if not value:
        return value
    aliases = {
        "active": "In Progress",
        "started": "In Progress",
        "in_progress": "In Progress",
        "in-review": "In Review",
        "in_review": "In Review",
        "review": "In Review",
        "todo": "Todo",
        "to_do": "Todo",
        "backlog": "Backlog",
        "triage": "Triage",
        "done": "Done",
        "completed": "Done",
        "canceled": "Canceled",
        "cancelled": "Canceled",
    }
    key = value.strip().lower().replace(" ", "_")
    return aliases.get(key, value)


def _resolve_issue_id(db: DBSession, value: str | None) -> str | None:
    if not value:
        return None
    row = _get_issue_by_ref(db, issue_id=value, key=value)
    return row["id"] if row else value


def _resolve_label_ids(db: DBSession, team_id: str | None, names: list[str] | None) -> list[str]:
    if not names:
        return []
    ids: list[str] = []
    for name in names:
        found = _scalar(
            db,
            "SELECT id FROM labels WHERE id = :name OR (name = :name AND (:team_id IS NULL OR team_id = :team_id)) ORDER BY name LIMIT 1",
            {"name": name, "team_id": team_id},
        )
        if found:
            ids.append(found)
    return ids


def _ensure_label_ids(db: DBSession, team_id: str | None, names: list[str] | None) -> list[str]:
    if not names:
        return []
    ids: list[str] = []
    for name in names:
        found = _scalar(
            db,
            "SELECT id FROM labels WHERE id = :name OR (name = :name AND (:team_id IS NULL OR team_id = :team_id)) ORDER BY name LIMIT 1",
            {"name": name, "team_id": team_id},
        )
        if not found and team_id:
            found = _next_id(db, "labels", "lbl")
            db.execute(
                text("INSERT INTO labels (id, team_id, name, color) VALUES (:id, :team_id, :name, :color)"),
                {"id": found, "team_id": team_id, "name": name, "color": "#5e6ad2"},
            )
        if found:
            ids.append(found)
    return ids


def _legacy_issue_args(arguments: dict[str, Any]) -> dict[str, Any]:
    with DBSession(engine) as db:
        team_id = _resolve_team_id(db, arguments.get("team_id") or arguments.get("team_key"))
        issue_id = _resolve_issue_id(db, arguments.get("id") or arguments.get("identifier") or arguments.get("issue_identifier") or arguments.get("issue_id"))
        parent_id = _resolve_issue_id(db, arguments.get("parent_id") or arguments.get("parent_identifier"))
        if not team_id and parent_id:
            team_id = _scalar(db, "SELECT team_id FROM issues WHERE id = :id", {"id": parent_id})
        payload: dict[str, Any] = {}
        if issue_id:
            payload["id"] = issue_id
        if team_id:
            payload["team_id"] = team_id
        for src, dest in [
            ("title", "title"),
            ("description", "description"),
            ("priority", "priority"),
            ("estimate", "estimate"),
            ("project_id", "project_id"),
            ("cycle_id", "cycle_id"),
            ("due_date", "due_date"),
        ]:
            if src in arguments:
                payload[dest] = arguments[src]
        state_id = _resolve_or_create_state_id(
            db,
            team_id,
            arguments.get("state_id") or arguments.get("status_id") or arguments.get("status_name") or arguments.get("state") or arguments.get("status"),
        )
        if state_id:
            payload["state_id"] = state_id
        assignee_id = _resolve_user_id(db, arguments.get("assignee_id") or arguments.get("assignee_username"))
        if "assignee_id" in arguments or "assignee_username" in arguments:
            payload["assignee_id"] = assignee_id
        creator_id = _resolve_user_id(db, arguments.get("creator_id") or arguments.get("creator_username"))
        if creator_id:
            payload["creator_id"] = creator_id
        if parent_id:
            payload["parent_id"] = parent_id
        supplied_labels = arguments.get("label_ids") or arguments.get("label_names")
        if not supplied_labels and arguments.get("label_id"):
            supplied_labels = [arguments["label_id"]]
        if not supplied_labels and arguments.get("labels"):
            supplied_labels = arguments["labels"]
        label_ids = _ensure_label_ids(db, team_id, supplied_labels)
        if label_ids:
            payload["label_ids"] = label_ids
        db.commit()
        return payload


def _legacy_identifiers_to_ids(identifiers: list[str] | None) -> list[str]:
    with DBSession(engine) as db:
        return [resolved for value in (identifiers or []) if (resolved := _resolve_issue_id(db, value))]


def _project_progress(db: DBSession, project_id: str) -> dict[str, Any]:
    row = _one(
        db,
        """
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE ws.category = 'completed') AS completed,
               COUNT(*) FILTER (WHERE ws.category = 'started') AS started,
               COUNT(*) FILTER (WHERE ws.category IN ('backlog','unstarted','triage')) AS open
        FROM issues i
        LEFT JOIN workflow_states ws ON ws.id = i.state_id
        WHERE i.project_id = :project_id AND i.archived_at IS NULL
        """,
        {"project_id": project_id},
    ) or {"total": 0, "completed": 0, "started": 0, "open": 0}
    total = int(row["total"] or 0)
    completed = int(row["completed"] or 0)
    progress = int(round((completed / total) * 100)) if total else 0
    db.execute(text("UPDATE projects SET progress = :progress WHERE id = :id"), {"progress": progress, "id": project_id})
    row["progress"] = progress
    return row


def _insert_json(db: DBSession, sql: str, params: dict[str, Any]) -> None:
    db.execute(text(sql), {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in params.items()})


def create_workspace(args: WorkspaceArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM workspaces WHERE url_key = :url_key", {"url_key": args.url_key})
        if existing:
            return existing
        workspace_id = _next_id(db, "workspaces", "wks")
        db.execute(
            text("INSERT INTO workspaces (id, name, url_key) VALUES (:id, :name, :url_key)"),
            {"id": workspace_id, "name": args.name, "url_key": args.url_key},
        )
        _audit(db, "workspace", workspace_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM workspaces WHERE id = :id", {"id": workspace_id}) or {}


def search_workspaces(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        params = {"limit": args.limit, "pattern": f"%{args.query or ''}%"}
        rows = _many(
            db,
            "SELECT * FROM workspaces WHERE (:pattern = '%%' OR name ILIKE :pattern OR url_key ILIKE :pattern) ORDER BY name LIMIT :limit",
            params,
        )
        return {"count": len(rows), "workspaces": rows}


def create_team(args: TeamArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM teams WHERE key = :key", {"key": args.key})
        if existing:
            return existing
        team_id = _next_id(db, "teams", "tm")
        db.execute(
            text(
                "INSERT INTO teams (id, workspace_id, name, key, icon, color) "
                "VALUES (:id, :workspace_id, :name, :key, :icon, :color)"
            ),
            {"id": team_id, **args.model_dump()},
        )
        _audit(db, "team", team_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM teams WHERE id = :id", {"id": team_id}) or {}


def search_teams(args: TeamSearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        params = {"limit": args.limit, "pattern": f"%{args.query or ''}%", "workspace_id": args.workspace_id}
        rows = _many(
            db,
            """
            SELECT t.*, COUNT(tm.user_id) AS member_count
            FROM teams t
            LEFT JOIN team_members tm ON tm.team_id = t.id
            WHERE (:workspace_id IS NULL OR t.workspace_id = :workspace_id)
              AND (:pattern = '%%' OR t.name ILIKE :pattern OR t.key ILIKE :pattern)
            GROUP BY t.id
            ORDER BY t.key
            LIMIT :limit
            """,
            params,
        )
        return {"count": len(rows), "teams": rows}


def add_team_member(args: TeamMemberArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(
            text(
                "INSERT INTO team_members (team_id, user_id, role) VALUES (:team_id, :user_id, :role) "
                "ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()"
            ),
            args.model_dump(),
        )
        _audit(db, "team", args.team_id, "member_added", args.model_dump())
        db.commit()
        return {"team_id": args.team_id, "user_id": args.user_id, "role": args.role}


def list_team_members(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT tm.*, u.username, u.full_name, u.email
            FROM team_members tm JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = :id
            ORDER BY u.full_name
            """,
            {"id": args.id},
        )
        return {"count": len(rows), "members": rows}


def create_workflow_state(args: WorkflowStateArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(
            db,
            "SELECT * FROM workflow_states WHERE team_id = :team_id AND name = :name",
            {"team_id": args.team_id, "name": args.name},
        )
        if existing:
            return existing
        state_id = _next_id(db, "workflow_states", "ws")
        db.execute(
            text(
                "INSERT INTO workflow_states (id, team_id, name, category, color, position) "
                "VALUES (:id, :team_id, :name, :category, :color, :position)"
            ),
            {"id": state_id, **args.model_dump()},
        )
        _audit(db, "workflow_state", state_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM workflow_states WHERE id = :id", {"id": state_id}) or {}


def list_workflow_states(args: TeamSearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT ws.*, t.key AS team_key FROM workflow_states ws
            JOIN teams t ON t.id = ws.team_id
            WHERE (:workspace_id IS NULL OR t.workspace_id = :workspace_id)
              AND (:query IS NULL OR ws.team_id = :query OR t.key = :query)
            ORDER BY t.key, ws.position, ws.name
            """,
            {"workspace_id": args.workspace_id, "query": args.query},
        )
        return {"count": len(rows), "states": rows}


def update_workflow_state(args: UpdateWorkflowStateArgs) -> dict[str, Any]:
    allowed = ["name", "category", "color", "position"]
    return _update_record("workflow_states", args.id, args.model_dump(exclude={"id"}, exclude_none=True), allowed)


def reorder_workflow_states(args: ReorderWorkflowStatesArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        for idx, state_id in enumerate(args.state_ids):
            db.execute(text("UPDATE workflow_states SET position = :pos, updated_at = NOW() WHERE id = :id"), {"pos": idx, "id": state_id})
        _audit(db, "workflow_state", "bulk", "reordered", {"state_ids": args.state_ids})
        db.commit()
        return {"state_ids": args.state_ids}


def create_label(args: LabelArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM labels WHERE team_id = :team_id AND name = :name", {"team_id": args.team_id, "name": args.name})
        if existing:
            return existing
        label_id = _next_id(db, "labels", "lbl")
        db.execute(
            text("INSERT INTO labels (id, team_id, name, color, parent_label_id) VALUES (:id, :team_id, :name, :color, :parent_label_id)"),
            {"id": label_id, **args.model_dump()},
        )
        _audit(db, "label", label_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM labels WHERE id = :id", {"id": label_id}) or {}


def search_labels(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT l.*, t.key AS team_key, parent.name AS parent_name
            FROM labels l
            JOIN teams t ON t.id = l.team_id
            LEFT JOIN labels parent ON parent.id = l.parent_label_id
            WHERE (:pattern = '%%' OR l.name ILIKE :pattern OR t.key ILIKE :pattern)
            ORDER BY t.key, COALESCE(parent.name, l.name), l.name
            LIMIT :limit
            """,
            {"pattern": f"%{args.query or ''}%", "limit": args.limit},
        )
        return {"count": len(rows), "labels": rows}


def update_label(args: UpdateLabelArgs) -> dict[str, Any]:
    return _update_record("labels", args.id, args.model_dump(exclude={"id"}, exclude_none=True), ["name", "color", "parent_label_id"])


def delete_label(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM labels WHERE id = :id"), {"id": args.id})
        _audit(db, "label", args.id, "deleted")
        db.commit()
        return {"id": args.id, "deleted": True}


def create_project(args: ProjectArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM projects WHERE name = :name", {"name": args.name})
        if existing:
            return existing
        project_id = _next_id(db, "projects", "prj")
        db.execute(
            text(
                "INSERT INTO projects (id, workspace_id, name, description, icon, color, state, status, priority, lead_id, start_date, target_date, health) "
                "VALUES (:id, :workspace_id, :name, :description, :icon, :color, :state, :state, :priority, :lead_id, :start_date, :target_date, :health)"
            ),
            {"id": project_id, **args.model_dump()},
        )
        if args.lead_id:
            db.execute(text("INSERT INTO project_members (project_id, user_id) VALUES (:project_id, :user_id) ON CONFLICT DO NOTHING"), {"project_id": project_id, "user_id": args.lead_id})
        _audit(db, "project", project_id, "created", args.model_dump())
        db.commit()
        return get_project(IdArgs(id=project_id))["project"]


def search_projects(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT p.*, u.full_name AS lead_name, u.username AS lead_username,
                   COUNT(i.id) AS issue_count,
                   COUNT(i.id) FILTER (WHERE ws.category = 'completed') AS completed_count
            FROM projects p
            LEFT JOIN users u ON u.id = p.lead_id
            LEFT JOIN issues i ON i.project_id = p.id AND i.archived_at IS NULL
            LEFT JOIN workflow_states ws ON ws.id = i.state_id
            WHERE p.archived_at IS NULL
              AND (:pattern = '%%' OR p.name ILIKE :pattern OR p.description ILIKE :pattern)
            GROUP BY p.id, u.full_name, u.username
            ORDER BY p.sort_order, p.updated_at DESC
            LIMIT :limit
            """,
            {"pattern": f"%{args.query or ''}%", "limit": args.limit},
        )
        return {"count": len(rows), "projects": rows}


def get_project(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        project = _one(
            db,
            "SELECT p.*, u.full_name AS lead_name, u.username AS lead_username FROM projects p LEFT JOIN users u ON u.id = p.lead_id WHERE p.id = :id",
            {"id": args.id},
        )
        if not project:
            raise ValueError(f"Project not found: {args.id}")
        progress = _project_progress(db, args.id)
        updates = _many(db, "SELECT pu.*, u.full_name AS author_name FROM project_updates pu LEFT JOIN users u ON u.id = pu.author_id WHERE project_id = :id ORDER BY pu.created_at DESC", {"id": args.id})
        milestones = _many(db, "SELECT * FROM project_milestones WHERE project_id = :id ORDER BY sort_order, created_at", {"id": args.id})
        issues = search_issues(SearchIssuesArgs(project_id=args.id, limit=100))["issues"]
        db.commit()
        return {"project": project, "progress": progress, "updates": updates, "milestones": milestones, "issues": issues}


def update_project(args: UpdateProjectArgs) -> dict[str, Any]:
    updates = args.model_dump(exclude={"id"}, exclude_none=True)
    if "state" in updates:
        updates["status"] = updates["state"]
    return _update_record("projects", args.id, updates, ["name", "description", "state", "status", "health", "priority", "icon", "lead_id", "start_date", "target_date"])


def delete_project(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM projects WHERE id = :id"), {"id": args.id})
        _audit(db, "project", args.id, "deleted")
        db.commit()
        return {"id": args.id, "deleted": True}


def create_milestone(args: MilestoneArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        milestone_id = _next_id(db, "project_milestones", "pms")
        db.execute(
            text(
                "INSERT INTO project_milestones (id, project_id, name, description, target_date, sort_order, status) "
                "VALUES (:id, :project_id, :name, :description, :target_date, :sort_order, :status)"
            ),
            {"id": milestone_id, **args.model_dump()},
        )
        _audit(db, "project_milestone", milestone_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM project_milestones WHERE id = :id", {"id": milestone_id}) or {}


def list_milestones(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM project_milestones WHERE project_id = :id ORDER BY sort_order, created_at", {"id": args.id})
        return {"count": len(rows), "milestones": rows}


def update_milestone(args: UpdateMilestoneArgs) -> dict[str, Any]:
    updates = args.model_dump(exclude={"id"}, exclude_none=True)
    return _update_record("project_milestones", args.id, updates, ["name", "description", "target_date", "status", "sort_order"])


def delete_milestone(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM project_milestones WHERE id = :id"), {"id": args.id})
        _audit(db, "project_milestone", args.id, "deleted")
        db.commit()
        return {"id": args.id, "deleted": True}


def archive_project(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE projects SET archived_at = NOW(), updated_at = NOW() WHERE id = :id"), {"id": args.id})
        _audit(db, "project", args.id, "archived")
        db.commit()
        return {"id": args.id, "archived": True}


def post_project_update(args: ProjectUpdateArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        update_id = _next_id(db, "project_updates", "pu")
        db.execute(
            text("INSERT INTO project_updates (id, project_id, author_id, body, health) VALUES (:id, :project_id, :author_id, :body, :health)"),
            {"id": update_id, **args.model_dump()},
        )
        db.execute(text("UPDATE projects SET health = :health, updated_at = NOW() WHERE id = :project_id"), {"health": args.health, "project_id": args.project_id})
        _audit(db, "project", args.project_id, "update_posted", {"update_id": update_id, "health": args.health})
        db.commit()
        return _one(db, "SELECT * FROM project_updates WHERE id = :id", {"id": update_id}) or {}


def list_project_updates(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM project_updates WHERE project_id = :id ORDER BY created_at DESC", {"id": args.id})
        return {"count": len(rows), "updates": rows}


def create_cycle(args: CycleArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM cycles WHERE team_id = :team_id AND number = :number", {"team_id": args.team_id, "number": args.number})
        if existing:
            return existing
        cycle_id = _next_id(db, "cycles", "cyc")
        db.execute(
            text("INSERT INTO cycles (id, team_id, number, name, start_date, end_date, state) VALUES (:id, :team_id, :number, :name, :start_date, :end_date, :state)"),
            {"id": cycle_id, **args.model_dump()},
        )
        _audit(db, "cycle", cycle_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM cycles WHERE id = :id", {"id": cycle_id}) or {}


def search_cycles(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT c.*, t.key AS team_key, COUNT(i.id) AS issue_count
            FROM cycles c
            JOIN teams t ON t.id = c.team_id
            LEFT JOIN issues i ON i.cycle_id = c.id
            WHERE (:pattern = '%%' OR c.name ILIKE :pattern OR t.key ILIKE :pattern OR c.state ILIKE :pattern)
            GROUP BY c.id, t.key
            ORDER BY c.start_date DESC, t.key
            LIMIT :limit
            """,
            {"pattern": f"%{args.query or ''}%", "limit": args.limit},
        )
        for row in rows:
            row["starts_at"] = row.get("start_date")
            row["ends_at"] = row.get("end_date")
            row["status"] = row.get("state")
        return {"count": len(rows), "cycles": rows}


def get_cycle(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        cycle = _one(db, "SELECT c.*, t.key AS team_key FROM cycles c JOIN teams t ON t.id = c.team_id WHERE c.id = :id", {"id": args.id})
        if not cycle:
            raise ValueError(f"Cycle not found: {args.id}")
        cycle["starts_at"] = cycle.get("start_date")
        cycle["ends_at"] = cycle.get("end_date")
        cycle["status"] = cycle.get("state")
        metrics = get_cycle_metrics(args)
        issues = search_issues(SearchIssuesArgs(cycle_id=args.id, limit=200))["issues"]
        return {"cycle": cycle, "metrics": metrics, "issues": issues}


def update_cycle(args: UpdateCycleArgs) -> dict[str, Any]:
    return _update_record("cycles", args.id, args.model_dump(exclude={"id"}, exclude_none=True), ["name", "start_date", "end_date", "state"])


def close_cycle(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE cycles SET state = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = :id"), {"id": args.id})
        _audit(db, "cycle", args.id, "closed")
        db.commit()
        return {"id": args.id, "state": "completed"}


def get_cycle_metrics(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        row = _one(
            db,
            """
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(i.estimate), 0) AS total_estimate,
                   COUNT(*) FILTER (WHERE ws.category = 'completed') AS completed,
                   COALESCE(SUM(i.estimate) FILTER (WHERE ws.category = 'completed'), 0) AS completed_estimate
            FROM issues i
            LEFT JOIN workflow_states ws ON ws.id = i.state_id
            WHERE i.cycle_id = :id
            """,
            {"id": args.id},
        ) or {}
        total = int(row.get("total") or 0)
        completed = int(row.get("completed") or 0)
        row["completion_percent"] = int(round((completed / total) * 100)) if total else 0
        row["cycle_id"] = args.id
        return row


def create_issue(args: IssueArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT id FROM issues WHERE team_id = :team_id AND title = :title", {"team_id": args.team_id, "title": args.title})
        if existing:
            return get_issue(GetIssueArgs(id=existing["id"]))["issue"]
        state_id = args.state_id or _scalar(
            db,
            "SELECT id FROM workflow_states WHERE team_id = :team_id AND category IN ('unstarted','backlog','triage') ORDER BY position LIMIT 1",
            {"team_id": args.team_id},
        )
        number = int(_scalar(db, "SELECT COALESCE(MAX(number), 0) + 1 FROM issues WHERE team_id = :team_id", {"team_id": args.team_id}) or 1)
        issue_id = _next_id(db, "issues", "iss")
        data = args.model_dump()
        data["state_id"] = state_id
        team_key = _scalar(db, "SELECT key FROM teams WHERE id = :team_id", {"team_id": args.team_id}) or "ISS"
        identifier = f"{team_key}-{number}"
        db.execute(
            text(
                """
                INSERT INTO issues
                  (id, team_id, number, identifier, title, description, state_id, status_id, priority, estimate,
                   assignee_id, creator_id, project_id, cycle_id, parent_id, due_date)
                VALUES
                  (:id, :team_id, :number, :identifier, :title, :description, :state_id, :state_id, :priority,
                   :estimate, :assignee_id, :creator_id, :project_id, :cycle_id,
                   :parent_id, :due_date)
                """
            ),
            {"id": issue_id, "number": number, "identifier": identifier, **data},
        )
        for label_id in args.label_ids:
            db.execute(text("INSERT INTO issue_labels (issue_id, label_id) VALUES (:issue_id, :label_id) ON CONFLICT DO NOTHING"), {"issue_id": issue_id, "label_id": label_id})
        for user_id in {args.creator_id, args.assignee_id} - {None}:
            db.execute(text("INSERT INTO issue_subscriptions (issue_id, user_id) VALUES (:issue_id, :user_id) ON CONFLICT DO NOTHING"), {"issue_id": issue_id, "user_id": user_id})
        _activity(db, issue_id, "created", actor_id=args.creator_id, to_value=args.title)
        _audit(db, "issue", issue_id, "created", data)
        db.commit()
        return get_issue(GetIssueArgs(id=issue_id))["issue"]


def search_issues(args: SearchIssuesArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        params: dict[str, Any] = {
            "limit": args.limit,
            "pattern": f"%{args.query or ''}%",
            "team_key": args.team_key,
            "state_category": args.state_category,
            "state_id": args.state_id,
            "priority": args.priority,
            "assignee_id": args.assignee_id,
            "project_id": args.project_id,
            "cycle_id": args.cycle_id,
            "label_id": args.label_id,
            "include_archived": args.include_archived,
        }
        where = [
            "(:include_archived OR (i.archived_at IS NULL AND i.is_archived = FALSE))",
            "(:team_key IS NULL OR t.key = :team_key)",
            "(:state_category IS NULL OR ws.category = :state_category)",
            "(:state_id IS NULL OR i.state_id = :state_id)",
            "(:priority IS NULL OR i.priority = :priority)",
            "(:assignee_id IS NULL OR i.assignee_id = :assignee_id)",
            "(:project_id IS NULL OR i.project_id = :project_id)",
            "(:cycle_id IS NULL OR i.cycle_id = :cycle_id)",
            "(:pattern = '%%' OR i.title ILIKE :pattern OR i.description ILIKE :pattern OR i.identifier ILIKE :pattern OR CAST(i.number AS TEXT) ILIKE :pattern)",
        ]
        join_label = ""
        if args.label_id:
            join_label = "JOIN issue_labels filter_labels ON filter_labels.issue_id = i.id AND filter_labels.label_id = :label_id"
        if args.view_id:
            view = _one(db, "SELECT filter_json FROM views WHERE id = :id", {"id": args.view_id})
            if view and view.get("filter_json"):
                filters = view["filter_json"]
                if isinstance(filters, str):
                    filters = json.loads(filters)
                for key in ["team_key", "state_category", "priority", "assignee_id", "project_id", "cycle_id"]:
                    if filters.get(key) and not params.get(key):
                        params[key] = filters[key]
        sql = _issue_select() + f" {join_label} WHERE " + " AND ".join(where) + " ORDER BY i.updated_at DESC LIMIT :limit"
        issues = [_hydrate_issue(db, row) for row in _many(db, sql, params)]
        return {"count": len(issues), "issues": issues}


def get_issue(args: GetIssueArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        issue = _get_issue_by_ref(db, issue_id=args.id, key=args.key)
        if not issue:
            raise ValueError(f"Issue not found: {args.id or args.key}")
        issue["comments"] = _many(
            db,
            "SELECT c.*, u.full_name AS author_name, u.username AS author_username FROM issue_comments c LEFT JOIN users u ON u.id = c.author_id WHERE issue_id = :id ORDER BY c.created_at",
            {"id": issue["id"]},
        )
        issue["activity"] = _many(
            db,
            "SELECT a.*, u.full_name AS actor_name FROM issue_activity a LEFT JOIN users u ON u.id = a.actor_id WHERE issue_id = :id ORDER BY a.created_at DESC",
            {"id": issue["id"]},
        )
        issue["subissues"] = search_issues(SearchIssuesArgs(limit=100))["issues"]
        issue["subissues"] = [i for i in issue["subissues"] if i.get("parent_id") == issue["id"]]
        issue["relations"] = _many(
            db,
            """
            SELECT r.*,
                   COALESCE(r.relation_type, r.type) AS relation_type,
                   rt.key AS related_team_key,
                   ri.number AS related_number,
                   ri.identifier AS related_issue_key,
                   ri.identifier AS target_issue_key,
                   ri.title AS related_title
            FROM issue_relations r
            JOIN issues ri ON ri.id = r.related_issue_id
            JOIN teams rt ON rt.id = ri.team_id
            WHERE r.issue_id = :id
            ORDER BY r.created_at DESC
            """,
            {"id": issue["id"]},
        )
        issue["customer_requests"] = _many(db, "SELECT cr.*, c.name AS customer_name FROM customer_requests cr JOIN customers c ON c.id = cr.customer_id WHERE cr.issue_id = :id", {"id": issue["id"]})
        return {"issue": issue}


def update_issue(args: UpdateIssueArgs) -> dict[str, Any]:
    updates = {
        field: getattr(args, field)
        for field in args.model_fields_set
        if field != "id"
    }
    return _update_issue(args.id, updates)


def _update_issue(issue_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    allowed = ["title", "description", "state_id", "priority", "estimate", "assignee_id", "project_id", "cycle_id", "parent_id", "due_date"]
    with DBSession(engine) as db:
        before = _get_issue_by_ref(db, issue_id=issue_id)
        if not before:
            raise ValueError(f"Issue not found: {issue_id}")
        resolved_issue_id = before["id"]
        sets = []
        params = {"id": resolved_issue_id}
        for key in allowed:
            if key in updates:
                sets.append(f"{key} = :{key}")
                params[key] = updates[key]
        if not sets:
            return before
        if "state_id" in updates:
            sets.append("status_id = :state_id")
            state = _one(db, "SELECT category FROM workflow_states WHERE id = :id", {"id": updates["state_id"]})
            if state and state["category"] == "started":
                sets.append("started_at = COALESCE(started_at, NOW())")
            if state and state["category"] == "completed":
                sets.append("completed_at = COALESCE(completed_at, NOW())")
        sets.append("updated_at = NOW()")
        db.execute(text(f"UPDATE issues SET {', '.join(sets)} WHERE id = :id"), params)
        for key, value in updates.items():
            if key in allowed and before.get(key) != value:
                _activity(db, resolved_issue_id, f"{key}_change", from_value=before.get(key), to_value=value)
        _audit(db, "issue", resolved_issue_id, "updated", updates)
        db.commit()
    return get_issue(GetIssueArgs(id=resolved_issue_id))["issue"]


def _update_record(table: str, record_id: str, updates: dict[str, Any], allowed: list[str]) -> dict[str, Any]:
    with DBSession(engine) as db:
        if not updates:
            row = _one(db, f"SELECT * FROM {table} WHERE id = :id", {"id": record_id})
            if not row:
                raise ValueError(f"Record not found: {record_id}")
            return row
        sets = []
        params = {"id": record_id}
        for key in allowed:
            if key in updates:
                if key.endswith("_json"):
                    sets.append(f"{key} = CAST(:{key} AS jsonb)")
                else:
                    sets.append(f"{key} = :{key}")
                params[key] = json.dumps(updates[key]) if isinstance(updates[key], (dict, list)) else updates[key]
        if not sets:
            raise ValueError("No supported fields supplied")
        sets.append("updated_at = NOW()")
        db.execute(text(f"UPDATE {table} SET {', '.join(sets)} WHERE id = :id"), params)
        _audit(db, table.rstrip("s"), record_id, "updated", updates)
        db.commit()
        row = _one(db, f"SELECT * FROM {table} WHERE id = :id", {"id": record_id})
        if not row:
            raise ValueError(f"Record not found: {record_id}")
        return row


def add_issue_label(args: IssueLabelArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("INSERT INTO issue_labels (issue_id, label_id) VALUES (:issue_id, :label_id) ON CONFLICT DO NOTHING"), args.model_dump())
        _touch_issue(db, args.issue_id)
        _activity(db, args.issue_id, "label_added", to_value=args.label_id)
        _audit(db, "issue", args.issue_id, "label_added", {"label_id": args.label_id})
        db.commit()
    return get_issue(GetIssueArgs(id=args.issue_id))["issue"]


def remove_issue_label(args: IssueLabelArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM issue_labels WHERE issue_id = :issue_id AND label_id = :label_id"), args.model_dump())
        _touch_issue(db, args.issue_id)
        _activity(db, args.issue_id, "label_removed", from_value=args.label_id)
        _audit(db, "issue", args.issue_id, "label_removed", {"label_id": args.label_id})
        db.commit()
    return get_issue(GetIssueArgs(id=args.issue_id))["issue"]


def bulk_update_issues(args: BulkIssueArgs) -> dict[str, Any]:
    changed = []
    for issue_id in args.issue_ids:
        updates = args.model_dump(exclude={"issue_ids", "add_label_id", "archive"}, exclude_none=True)
        if updates:
            changed.append(_update_issue(issue_id, updates))
        if args.add_label_id:
            changed.append(add_issue_label(IssueLabelArgs(issue_id=issue_id, label_id=args.add_label_id)))
        if args.archive:
            archive_issue(IdArgs(id=issue_id))
    return {"count": len(args.issue_ids), "issues": changed or args.issue_ids}


def archive_issue(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE issues SET archived_at = NOW(), is_archived = TRUE, updated_at = NOW() WHERE id = :id"), {"id": args.id})
        _activity(db, args.id, "archived")
        _audit(db, "issue", args.id, "archived")
        db.commit()
        return {"id": args.id, "archived": True}


def delete_issue(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE issues SET trashed_at = NOW(), is_archived = TRUE, updated_at = NOW() WHERE id = :id"), {"id": args.id})
        _activity(db, args.id, "trashed")
        _audit(db, "issue", args.id, "trashed")
        db.commit()
        return {"id": args.id, "trashed": True}


def add_relation(args: RelationArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(
            db,
            "SELECT * FROM issue_relations WHERE issue_id = :issue_id AND related_issue_id = :related_issue_id AND type = :type",
            args.model_dump(),
        )
        if existing:
            return existing
        relation_id = _next_id(db, "issue_relations", "rel")
        db.execute(
            text(
                """
                INSERT INTO issue_relations
                  (id, issue_id, related_issue_id, type, source_issue_id, target_issue_id, relation_type)
                VALUES
                  (:id, :issue_id, :related_issue_id, :type, :issue_id, :related_issue_id, :type)
                """
            ),
            {"id": relation_id, **args.model_dump()},
        )
        _activity(db, args.issue_id, "relation_added", to_value=f"{args.type}:{args.related_issue_id}")
        _audit(db, "issue", args.issue_id, "relation_added", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM issue_relations WHERE id = :id", {"id": relation_id}) or {}


def remove_relation(args: RelationArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(
            text(
                """
                DELETE FROM issue_relations
                WHERE issue_id = :issue_id
                  AND related_issue_id = :related_issue_id
                  AND type = :type
                """
            ),
            args.model_dump(),
        )
        _activity(db, args.issue_id, "relation_removed", from_value=f"{args.type}:{args.related_issue_id}")
        _audit(db, "issue", args.issue_id, "relation_removed", args.model_dump())
        db.commit()
        return {"removed": True, **args.model_dump()}


def search_relations(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM issue_relations WHERE issue_id = :id OR related_issue_id = :id ORDER BY created_at DESC", {"id": args.id})
        return {"count": len(rows), "relations": rows}


def add_comment(args: CommentArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        comment_id = _next_id(db, "issue_comments", "cmt")
        db.execute(
            text("INSERT INTO issue_comments (id, issue_id, author_id, body) VALUES (:id, :issue_id, :author_id, :body)"),
            {"id": comment_id, **args.model_dump()},
        )
        _touch_issue(db, args.issue_id)
        _activity(db, args.issue_id, "comment_added", actor_id=args.author_id, to_value=args.body[:80])
        _audit(db, "issue", args.issue_id, "comment_added", {"comment_id": comment_id})
        db.commit()
        return _one(db, "SELECT * FROM issue_comments WHERE id = :id", {"id": comment_id}) or {}


def edit_comment(args: Any) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE issue_comments SET body = :body, edited_at = NOW(), updated_at = NOW() WHERE id = :id"), args.model_dump())
        _audit(db, "comment", args.id, "edited", {"body": args.body})
        db.commit()
        return _one(db, "SELECT * FROM issue_comments WHERE id = :id", {"id": args.id}) or {}


def delete_comment(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM issue_comments WHERE id = :id"), {"id": args.id})
        _audit(db, "comment", args.id, "deleted")
        db.commit()
        return {"id": args.id, "deleted": True}


def get_issue_activity(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM issue_activity WHERE issue_id = :id ORDER BY created_at DESC", {"id": args.id})
        return {"count": len(rows), "activity": rows}


def create_view(args: ViewArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM views WHERE name = :name AND owner_id = :owner_id", {"name": args.name, "owner_id": args.owner_id})
        if existing:
            return existing
        view_id = _next_id(db, "views", "vw")
        _insert_json(
            db,
            """
            INSERT INTO views (id, name, description, owner_id, team_id, filter_json, group_by, order_by, layout, icon, color, shared)
            VALUES (:id, :name, :description, :owner_id, :team_id, CAST(:filter_json AS jsonb), :group_by, :order_by, :layout, :icon, :color, :shared)
            """,
            {"id": view_id, **args.model_dump()},
        )
        _audit(db, "view", view_id, "created", args.model_dump())
        db.commit()
        return _one(db, "SELECT * FROM views WHERE id = :id", {"id": view_id}) or {}


def search_views(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            "SELECT v.*, t.key AS team_key FROM views v LEFT JOIN teams t ON t.id = v.team_id WHERE (:pattern = '%%' OR v.name ILIKE :pattern OR v.description ILIKE :pattern) ORDER BY v.name LIMIT :limit",
            {"pattern": f"%{args.query or ''}%", "limit": args.limit},
        )
        return {"count": len(rows), "views": rows}


def update_view(args: UpdateViewArgs) -> dict[str, Any]:
    return _update_record("views", args.id, args.model_dump(exclude={"id"}, exclude_none=True), ["name", "description", "filter_json", "group_by", "order_by", "layout", "shared"])


def delete_view(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM views WHERE id = :id"), {"id": args.id})
        _audit(db, "view", args.id, "deleted")
        db.commit()
        return {"id": args.id, "deleted": True}


def share_view(args: IdArgs) -> dict[str, Any]:
    return _update_record("views", args.id, {"shared": True}, ["shared"])


def create_notification(args: NotificationArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        notification_id = _next_id(db, "notifications", "ntf")
        db.execute(
            text("INSERT INTO notifications (id, recipient_id, kind, actor_id, issue_id, project_id, comment_id) VALUES (:id, :recipient_id, :kind, :actor_id, :issue_id, :project_id, :comment_id)"),
            {"id": notification_id, **args.model_dump()},
        )
        db.commit()
        return _one(db, "SELECT * FROM notifications WHERE id = :id", {"id": notification_id}) or {}


def list_notifications(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT n.*, actor.full_name AS actor_name, i.title AS issue_title, t.key AS issue_team_key, i.number AS issue_number, p.name AS project_name
            FROM notifications n
            LEFT JOIN users actor ON actor.id = n.actor_id
            LEFT JOIN issues i ON i.id = n.issue_id
            LEFT JOIN teams t ON t.id = i.team_id
            LEFT JOIN projects p ON p.id = n.project_id
            WHERE n.archived_at IS NULL
              AND (:query IS NULL OR n.recipient_id = :query OR n.kind ILIKE :pattern OR i.title ILIKE :pattern)
            ORDER BY n.created_at DESC
            LIMIT :limit
            """,
            {"query": args.query, "pattern": f"%{args.query or ''}%", "limit": args.limit},
        )
        return {"count": len(rows), "notifications": rows}


def mark_notification_read(args: NotificationActionArgs) -> dict[str, Any]:
    return _update_record("notifications", args.id, {"read_at": datetime.now(timezone.utc)}, ["read_at"])


def mark_all_notifications_read(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE (:query IS NULL OR recipient_id = :query) AND read_at IS NULL"), {"query": args.query})
        db.commit()
        return {"recipient_id": args.query, "marked_read": True}


def snooze_notification(args: SnoozeNotificationArgs) -> dict[str, Any]:
    return _update_record("notifications", args.id, {"snoozed_until": args.snoozed_until}, ["snoozed_until"])


def archive_notification(args: NotificationActionArgs) -> dict[str, Any]:
    return _update_record("notifications", args.id, {"archived_at": datetime.now(timezone.utc)}, ["archived_at"])


def add_favorite(args: FavoriteArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM favorites WHERE user_id = :user_id AND kind = :kind AND entity_id = :entity_id", args.model_dump())
        if existing:
            return existing
        fav_id = _next_id(db, "favorites", "fav")
        db.execute(text("INSERT INTO favorites (id, user_id, kind, entity_id, sort_order) VALUES (:id, :user_id, :kind, :entity_id, :sort_order)"), {"id": fav_id, **args.model_dump()})
        db.commit()
        return _one(db, "SELECT * FROM favorites WHERE id = :id", {"id": fav_id}) or {}


def list_favorites(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM favorites WHERE (:query IS NULL OR user_id = :query) ORDER BY sort_order, created_at", {"query": args.query})
        return {"count": len(rows), "favorites": rows}


def remove_favorite(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM favorites WHERE id = :id"), {"id": args.id})
        db.commit()
        return {"id": args.id, "deleted": True}


def create_template(args: TemplateArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        tpl_id = _next_id(db, "issue_templates", "tpl")
        _insert_json(
            db,
            "INSERT INTO issue_templates (id, team_id, name, payload_json, created_by) VALUES (:id, :team_id, :name, CAST(:payload_json AS jsonb), :created_by)",
            {"id": tpl_id, **args.model_dump()},
        )
        db.commit()
        return _one(db, "SELECT * FROM issue_templates WHERE id = :id", {"id": tpl_id}) or {}


def list_templates(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM issue_templates WHERE (:pattern = '%%' OR name ILIKE :pattern OR team_id = :query) ORDER BY name", {"pattern": f"%{args.query or ''}%", "query": args.query})
        return {"count": len(rows), "templates": rows}


def create_initiative(args: InitiativeArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM initiatives WHERE name = :name", {"name": args.name})
        if existing:
            return existing
        ini_id = _next_id(db, "initiatives", "ini")
        db.execute(text("INSERT INTO initiatives (id, name, description, owner_id, state, target_date) VALUES (:id, :name, :description, :owner_id, :state, :target_date)"), {"id": ini_id, **args.model_dump(exclude={"project_ids"})})
        for project_id in args.project_ids:
            db.execute(text("INSERT INTO initiative_projects (initiative_id, project_id) VALUES (:initiative_id, :project_id) ON CONFLICT DO NOTHING"), {"initiative_id": ini_id, "project_id": project_id})
        db.commit()
        return _one(db, "SELECT * FROM initiatives WHERE id = :id", {"id": ini_id}) or {}


def search_initiatives(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM initiatives WHERE (:pattern = '%%' OR name ILIKE :pattern OR description ILIKE :pattern) ORDER BY target_date NULLS LAST, name", {"pattern": f"%{args.query or ''}%"})
        return {"count": len(rows), "initiatives": rows}


def create_customer(args: CustomerArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        existing = _one(db, "SELECT * FROM customers WHERE domain = :domain", {"domain": args.domain})
        if existing:
            return existing
        customer_id = _next_id(db, "customers", "cus")
        db.execute(text("INSERT INTO customers (id, name, domain, tier, revenue, size, status, owner_id) VALUES (:id, :name, :domain, :tier, :revenue, :size, :status, :owner_id)"), {"id": customer_id, **args.model_dump()})
        db.commit()
        return _one(db, "SELECT * FROM customers WHERE id = :id", {"id": customer_id}) or {}


def search_customers(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT * FROM customers WHERE (:pattern = '%%' OR name ILIKE :pattern OR domain ILIKE :pattern OR tier ILIKE :pattern) ORDER BY revenue DESC, name LIMIT :limit", {"pattern": f"%{args.query or ''}%", "limit": args.limit})
        return {"count": len(rows), "customers": rows}


def create_customer_request(args: CustomerRequestArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        req_id = _next_id(db, "customer_requests", "crq")
        db.execute(text("INSERT INTO customer_requests (id, customer_id, issue_id, project_id, requester_name, body, source, important) VALUES (:id, :customer_id, :issue_id, :project_id, :requester_name, :body, :source, :important)"), {"id": req_id, **args.model_dump()})
        if args.issue_id:
            _activity(db, args.issue_id, "customer_request_added", to_value=args.customer_id)
        db.commit()
        return _one(db, "SELECT * FROM customer_requests WHERE id = :id", {"id": req_id}) or {}


def list_my_issues(args: SearchArgs) -> dict[str, Any]:
    return search_issues(SearchIssuesArgs(assignee_id=args.query or "user_002", limit=args.limit))


def list_created_issues(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, _issue_select() + " WHERE i.creator_id = :user_id ORDER BY i.updated_at DESC LIMIT :limit", {"user_id": args.query or "user_002", "limit": args.limit})
        return {"count": len(rows), "issues": [_hydrate_issue(db, r) for r in rows]}


def list_subscribed_issues(args: SearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, _issue_select() + " JOIN issue_subscriptions sub ON sub.issue_id = i.id WHERE sub.user_id = :user_id ORDER BY i.updated_at DESC LIMIT :limit", {"user_id": args.query or "user_002", "limit": args.limit})
        return {"count": len(rows), "issues": [_hydrate_issue(db, r) for r in rows]}


def list_my_issue_activity(args: SearchArgs) -> dict[str, Any]:
    user_id = args.query or "user_001"
    with DBSession(engine) as db:
        rows = _many(
            db,
            """
            SELECT a.*, a.kind AS action, u.username AS actor_username, u.full_name AS actor_name
            FROM issue_activity a
            LEFT JOIN users u ON u.id = a.actor_id
            WHERE a.actor_id = :user_id
            ORDER BY a.created_at DESC
            LIMIT :limit
            """,
            {"user_id": user_id, "limit": args.limit},
        )
        hydrated = []
        seen: set[str] = set()
        for row in rows:
            issue = _one(db, _issue_select() + " WHERE i.id = :id", {"id": row.get("issue_id")})
            row["issue"] = _hydrate_issue(db, issue) if issue else None
            row["actor"] = {
                "id": row.get("actor_id"),
                "username": row.get("actor_username"),
                "full_name": row.get("actor_name"),
            } if row.get("actor_id") else None
            unique_key = str(row.get("issue_id") or "")
            if unique_key in seen:
                continue
            seen.add(unique_key)
            hydrated.append(row)
        return {"count": len(hydrated), "activity": hydrated}


def subscribe_issue(args: IssueAssigneeArgs) -> dict[str, Any]:
    user_id = args.assignee_id or "user_002"
    with DBSession(engine) as db:
        db.execute(text("INSERT INTO issue_subscriptions (issue_id, user_id) VALUES (:issue_id, :user_id) ON CONFLICT DO NOTHING"), {"issue_id": args.issue_id, "user_id": user_id})
        db.commit()
        return {"issue_id": args.issue_id, "user_id": user_id, "subscribed": True}


def unsubscribe_issue(args: IssueAssigneeArgs) -> dict[str, Any]:
    user_id = args.assignee_id or "user_002"
    with DBSession(engine) as db:
        db.execute(text("DELETE FROM issue_subscriptions WHERE issue_id = :issue_id AND user_id = :user_id"), {"issue_id": args.issue_id, "user_id": user_id})
        db.commit()
        return {"issue_id": args.issue_id, "user_id": user_id, "subscribed": False}


def global_search(args: SearchArgs) -> dict[str, Any]:
    q = args.query or ""
    with DBSession(engine) as db:
        issues = search_issues(SearchIssuesArgs(query=q, limit=10))["issues"]
        seen_issue_ids = {issue["id"] for issue in issues}
        label_matches = search_labels(SearchArgs(query=q, limit=5))["labels"] if q else []
        for label in label_matches:
            labelled = search_issues(SearchIssuesArgs(label_id=label["id"], limit=10))["issues"]
            for issue in labelled:
                if issue["id"] not in seen_issue_ids:
                    issues.append(issue)
                    seen_issue_ids.add(issue["id"])
        projects = search_projects(SearchArgs(query=q, limit=10))["projects"]
        views = search_views(SearchArgs(query=q, limit=10))["views"]
        customers = search_customers(SearchArgs(query=q, limit=10))["customers"]
        teams = search_teams(TeamSearchArgs(query=q, limit=10))["teams"]
        return {
            "query": q,
            "results": [
                *[{"type": "issue", "id": i["id"], "title": f"{i['key']} {i['title']}", "url": f"/issue/{i['key']}"} for i in issues],
                *[{"type": "project", "id": p["id"], "title": p["name"], "url": f"/projects/{p['id']}"} for p in projects],
                *[{"type": "view", "id": v["id"], "title": v["name"], "url": f"/views/{v['id']}"} for v in views],
                *[{"type": "customer", "id": c["id"], "title": c["name"], "url": "/customers"} for c in customers],
                *[{"type": "team", "id": t["id"], "title": t["name"], "url": f"/team/{t['key']}/all"} for t in teams],
            ][: args.limit],
        }


def search_users(args: UserSearchArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        rows = _many(db, "SELECT id, username, full_name, email, role, avatar_url FROM users WHERE (:role IS NULL OR role = :role) AND (:pattern = '%%' OR username ILIKE :pattern OR full_name ILIKE :pattern OR email ILIKE :pattern) ORDER BY full_name LIMIT :limit", {"role": args.role, "pattern": f"%{args.query or ''}%", "limit": args.limit})
        return {"count": len(rows), "users": rows}


def get_user(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        user = _one(db, "SELECT id, username, full_name, email, role, avatar_url FROM users WHERE id = :id OR username = :id", {"id": args.id})
        if not user:
            raise ValueError(f"User not found: {args.id}")
        return {"user": user}


TOOL_DEFS: list[tuple[str, str, type[Any], bool]] = [
    ("create_workspace", "Create a workspace.", WorkspaceArgs, True),
    ("search_workspaces", "Search workspaces.", SearchArgs, False),
    ("create_team", "Create a team.", TeamArgs, True),
    ("search_teams", "Search teams.", TeamSearchArgs, False),
    ("list_teams", "List teams.", TeamSearchArgs, False),
    ("add_team_member", "Add or update a team member.", TeamMemberArgs, True),
    ("list_team_members", "List team members.", IdArgs, False),
    ("create_workflow_state", "Create a workflow state.", WorkflowStateArgs, True),
    ("list_workflow_states", "List workflow states.", TeamSearchArgs, False),
    ("update_workflow_state", "Update a workflow state.", UpdateWorkflowStateArgs, True),
    ("delete_workflow_state", "Delete a workflow state.", IdArgs, True),
    ("reorder_workflow_states", "Reorder workflow states.", ReorderWorkflowStatesArgs, True),
    ("create_label", "Create a label.", LabelArgs, True),
    ("search_labels", "Search labels.", SearchArgs, False),
    ("update_label", "Update a label.", UpdateLabelArgs, True),
    ("delete_label", "Delete a label.", IdArgs, True),
    ("bulk_apply_label", "Apply a label to multiple issues.", BulkIssueArgs, True),
    ("create_issue", "Create an issue.", IssueArgs, True),
    ("search_issues", "Search issues.", SearchIssuesArgs, False),
    ("list_issues_by_state", "List issues by state/category.", SearchIssuesArgs, False),
    ("get_issue", "Get an issue by id or key.", GetIssueArgs, False),
    ("update_issue", "Update issue fields.", UpdateIssueArgs, True),
    ("delete_issue", "Move an issue to trash.", IdArgs, True),
    ("archive_issue", "Archive an issue.", IdArgs, True),
    ("move_issue_state", "Move an issue to a workflow state.", IssueStateArgs, True),
    ("assign_issue", "Assign an issue.", IssueAssigneeArgs, True),
    ("set_priority", "Set issue priority.", IssuePriorityArgs, True),
    ("set_estimate", "Set issue estimate.", IssueEstimateArgs, True),
    ("set_due_date", "Set issue due date.", IssueDueDateArgs, True),
    ("set_project", "Set issue project.", IssueProjectArgs, True),
    ("set_cycle", "Set issue cycle.", IssueCycleArgs, True),
    ("set_parent", "Set issue parent.", IssueParentArgs, True),
    ("add_subissue", "Set an issue as a sub-issue.", IssueParentArgs, True),
    ("add_label", "Add label to issue.", IssueLabelArgs, True),
    ("remove_label", "Remove label from issue.", IssueLabelArgs, True),
    ("bulk_update_issues", "Bulk update issues.", BulkIssueArgs, True),
    ("bulk_delete_issues", "Bulk archive/delete issues.", BulkIssueArgs, True),
    ("add_relation", "Add an issue relation.", RelationArgs, True),
    ("remove_relation", "Remove an issue relation.", RelationArgs, True),
    ("search_relations", "Search issue relations.", IdArgs, False),
    ("add_comment", "Add issue comment.", CommentArgs, True),
    ("edit_comment", "Edit comment.", Any, True),
    ("delete_comment", "Delete comment.", IdArgs, True),
    ("get_issue_activity", "Get issue activity.", IdArgs, False),
    ("create_project", "Create a project.", ProjectArgs, True),
    ("search_projects", "Search projects.", SearchArgs, False),
    ("get_project", "Get project details.", IdArgs, False),
    ("update_project", "Update project.", UpdateProjectArgs, True),
    ("archive_project", "Archive project.", IdArgs, True),
    ("delete_project", "Delete a project permanently.", IdArgs, True),
    ("set_project_lead", "Set project lead.", UpdateProjectArgs, True),
    ("post_project_update", "Post a project update.", ProjectUpdateArgs, True),
    ("list_project_updates", "List project updates.", IdArgs, False),
    ("get_project_progress", "Get project progress.", IdArgs, False),
    ("create_milestone", "Create a project milestone.", MilestoneArgs, True),
    ("list_milestones", "List milestones for a project.", IdArgs, False),
    ("update_milestone", "Update a milestone.", UpdateMilestoneArgs, True),
    ("delete_milestone", "Delete a milestone.", IdArgs, True),
    ("create_cycle", "Create cycle.", CycleArgs, True),
    ("search_cycles", "Search cycles.", SearchArgs, False),
    ("get_cycle", "Get cycle details.", IdArgs, False),
    ("update_cycle", "Update cycle.", UpdateCycleArgs, True),
    ("close_cycle", "Close cycle.", IdArgs, True),
    ("add_to_cycle", "Add issue to cycle.", IssueCycleArgs, True),
    ("remove_from_cycle", "Remove issue from cycle.", IssueCycleArgs, True),
    ("get_cycle_metrics", "Get cycle metrics.", IdArgs, False),
    ("create_view", "Create saved view.", ViewArgs, True),
    ("search_views", "Search saved views.", SearchArgs, False),
    ("get_view", "Get saved view.", IdArgs, False),
    ("update_view", "Update saved view.", UpdateViewArgs, True),
    ("delete_view", "Delete saved view.", IdArgs, True),
    ("share_view", "Share saved view.", IdArgs, True),
    ("list_my_issues", "List assigned issues.", SearchArgs, False),
    ("list_created_issues", "List created issues.", SearchArgs, False),
    ("list_subscribed_issues", "List subscribed issues.", SearchArgs, False),
    ("list_my_issue_activity", "List issue activity performed by a user.", SearchArgs, False),
    ("subscribe_issue", "Subscribe to an issue.", IssueAssigneeArgs, True),
    ("unsubscribe_issue", "Unsubscribe from an issue.", IssueAssigneeArgs, True),
    ("create_notification", "Create notification.", NotificationArgs, True),
    ("list_notifications", "List notifications.", SearchArgs, False),
    ("mark_notification_read", "Mark a notification read.", NotificationActionArgs, True),
    ("mark_all_read", "Mark all notifications read.", SearchArgs, True),
    ("snooze_notification", "Snooze notification.", SnoozeNotificationArgs, True),
    ("archive_notification", "Archive notification.", NotificationActionArgs, True),
    ("add_favorite", "Add favorite.", FavoriteArgs, True),
    ("list_favorites", "List favorites.", SearchArgs, False),
    ("remove_favorite", "Remove favorite.", IdArgs, True),
    ("create_template", "Create issue template.", TemplateArgs, True),
    ("list_templates", "List issue templates.", SearchArgs, False),
    ("create_initiative", "Create initiative.", InitiativeArgs, True),
    ("search_initiatives", "Search initiatives.", SearchArgs, False),
    ("create_customer", "Create customer.", CustomerArgs, True),
    ("search_customers", "Search customers.", SearchArgs, False),
    ("create_customer_request", "Create customer request.", CustomerRequestArgs, True),
    ("link_customer_request", "Link customer request.", CustomerRequestArgs, True),
    ("mark_customer_request_important", "Mark customer request important.", IdArgs, True),
    ("global_search", "Search issues, projects, views, teams, and customers.", SearchArgs, False),
    ("search_users", "Search users.", UserSearchArgs, False),
    ("get_user", "Get user.", IdArgs, False),
    ("list_issues", "Compatibility alias for issue listing.", Any, False),
    ("create_sub_issue", "Compatibility alias for creating a child issue.", Any, True),
    ("create_issue_relation", "Compatibility alias for creating a relation.", Any, True),
    ("add_issue_relation", "Compatibility alias for creating a relation from the UI.", Any, True),
    ("delete_issue_relation", "Compatibility alias for deleting a relation.", Any, True),
    ("list_activity", "Compatibility alias for issue activity.", Any, False),
    ("list_projects", "Compatibility alias for project listing.", Any, False),
    ("create_project_update", "Compatibility alias for posting project updates.", Any, True),
    ("list_cycles", "Compatibility alias for cycle listing.", Any, False),
    ("move_issues_to_cycle", "Compatibility alias for moving issue scope.", Any, True),
    ("list_labels", "Compatibility alias for label listing.", Any, False),
    ("apply_issue_labels", "Compatibility alias for applying labels.", Any, True),
    ("remove_issue_labels", "Compatibility alias for removing labels.", Any, True),
    ("bulk_apply_labels", "Compatibility alias for bulk labels.", Any, True),
    ("bulk_move_issues", "Compatibility alias for bulk issue moves.", Any, True),
    ("list_saved_views", "Compatibility alias for saved view listing.", Any, False),
    ("create_saved_view", "Compatibility alias for saved view creation.", Any, True),
    ("list_views", "Compatibility alias for saved view listing.", Any, False),
    ("update_saved_view", "Compatibility alias for saved view updates.", Any, True),
    ("list_inbox", "Compatibility alias for inbox listing.", Any, False),
    ("mark_inbox_read", "Compatibility alias for marking inbox read.", Any, True),
    ("archive_inbox_notification", "Compatibility alias for archiving inbox notifications.", Any, True),
    ("command_palette_search", "Compatibility alias for command palette search.", Any, False),
    ("command_palette_action", "Compatibility alias for command palette actions.", Any, True),
    ("add_issue_comment", "Compatibility alias for issue comments from the UI.", Any, True),
]


def _schema_for(cls: type[Any]) -> dict[str, Any]:
    if cls is Any:
        return {"type": "object", "additionalProperties": True}
    return cls.model_json_schema()


TOOLS = [
    {
        "name": name,
        "description": description,
        "input_schema": _schema_for(schema),
        **({"mutates_state": True} if mutates else {}),
    }
    for name, description, schema, mutates in TOOL_DEFS
]


def _legacy_search_issue_args(arguments: dict[str, Any]) -> SearchIssuesArgs:
    with DBSession(engine) as db:
        team_key = arguments.get("team_key")
        assignee_id = _resolve_user_id(db, arguments.get("assignee_id") or arguments.get("assignee_username"))
        label_id = None
        label_names = arguments.get("label_names") or []
        if label_names:
            label_id = (_resolve_label_ids(db, _resolve_team_id(db, team_key), label_names[:1]) or [None])[0]
        requested_state = arguments.get("state_id") or arguments.get("status_id") or arguments.get("status_name") or arguments.get("state") or arguments.get("status")
        normalized = _normalize_status_value(requested_state)
        category_aliases = {
            "active": "started",
            "started": "started",
            "backlog": "backlog",
            "triage": "triage",
            "completed": "completed",
            "done": "completed",
        }
        state_category = arguments.get("state_category") or category_aliases.get(str(requested_state or "").lower())
        state_id = None if state_category else _resolve_state_id(db, _resolve_team_id(db, team_key), normalized)
    return SearchIssuesArgs(
        query=arguments.get("query"),
        limit=arguments.get("limit", 50),
        team_key=team_key,
        state_category=state_category,
        state_id=state_id,
        priority=arguments.get("priority"),
        assignee_id=assignee_id,
        project_id=arguments.get("project_id"),
        cycle_id=arguments.get("cycle_id"),
        label_id=label_id,
        include_archived=arguments.get("include_archived", False),
    )


def _legacy_update_issue(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = _legacy_issue_args(arguments)
    if "id" not in payload:
        raise ValueError("Missing issue identifier")
    label_ids = payload.pop("label_ids", [])
    issue = update_issue(UpdateIssueArgs(**payload))
    for label_id in label_ids:
        issue = add_issue_label(IssueLabelArgs(issue_id=payload["id"], label_id=label_id))
    return issue


def _legacy_create_issue(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = _legacy_issue_args(arguments)
    return create_issue(IssueArgs(**payload))


def _legacy_add_comment(arguments: dict[str, Any]) -> dict[str, Any]:
    with DBSession(engine) as db:
        issue_id = _resolve_issue_id(db, arguments.get("issue_id") or arguments.get("issue_identifier") or arguments.get("identifier") or arguments.get("issue_key"))
        author_id = _resolve_user_id(db, arguments.get("author_id") or arguments.get("author_username")) or "user_001"
    return add_comment(CommentArgs(issue_id=issue_id, author_id=author_id, body=arguments["body"]))


def _legacy_relation(arguments: dict[str, Any], *, remove: bool = False) -> dict[str, Any]:
    with DBSession(engine) as db:
        issue_id = _resolve_issue_id(
            db,
            arguments.get("issue_id")
            or arguments.get("source_identifier")
            or arguments.get("source_issue_key")
            or arguments.get("issue_key"),
        )
        related_issue_id = _resolve_issue_id(
            db,
            arguments.get("related_issue_id")
            or arguments.get("target_identifier")
            or arguments.get("target_issue_key")
            or arguments.get("related_issue_key"),
        )
    args = RelationArgs(issue_id=issue_id, related_issue_id=related_issue_id, type=arguments.get("type") or arguments.get("relation_type") or "related")
    return remove_relation(args) if remove else add_relation(args)


def _legacy_apply_labels(arguments: dict[str, Any], *, remove: bool = False) -> dict[str, Any]:
    identifiers = arguments.get("identifiers") or [arguments.get("identifier") or arguments.get("issue_identifier")]
    changed: list[dict[str, Any]] = []
    with DBSession(engine) as db:
        for identifier in identifiers:
            issue = _get_issue_by_ref(db, issue_id=identifier, key=identifier)
            if not issue:
                continue
            label_ids = _ensure_label_ids(db, issue["team_id"], arguments.get("label_ids") or arguments.get("label_names"))
            db.commit()
            for label_id in label_ids:
                if remove:
                    changed.append(remove_issue_label(IssueLabelArgs(issue_id=issue["id"], label_id=label_id)))
                else:
                    changed.append(add_issue_label(IssueLabelArgs(issue_id=issue["id"], label_id=label_id)))
        if identifiers and not remove:
            first = _resolve_issue_id(db, identifiers[0])
            _activity(db, first, "bulk_apply_labels", to_value=",".join(str(i) for i in identifiers))
            db.commit()
    return {"count": len(changed), "issues": changed}


def _legacy_bulk_update_issues(arguments: dict[str, Any]) -> dict[str, Any]:
    identifiers = arguments.get("identifiers") or arguments.get("issue_keys") or arguments.get("issue_ids") or []
    issue_ids = _legacy_identifiers_to_ids(identifiers)
    changed: list[dict[str, Any]] = []
    for issue_id in issue_ids:
        with DBSession(engine) as db:
            issue = _get_issue_by_ref(db, issue_id=issue_id)
            if not issue:
                continue
            state_id = _resolve_or_create_state_id(
                db,
                issue["team_id"],
                arguments.get("state_id") or arguments.get("status_id") or arguments.get("status_name") or arguments.get("state") or arguments.get("status"),
            )
            db.commit()
        updates: dict[str, Any] = {"id": issue_id}
        if state_id:
            updates["state_id"] = state_id
        for key in ["priority", "project_id", "cycle_id", "estimate", "due_date"]:
            if key in arguments:
                updates[key] = arguments[key]
        if "assignee_username" in arguments or "assignee_id" in arguments:
            with DBSession(engine) as db:
                updates["assignee_id"] = _resolve_user_id(db, arguments.get("assignee_id") or arguments.get("assignee_username"))
        if len(updates) > 1:
            changed.append(update_issue(UpdateIssueArgs(**updates)))
        if arguments.get("comment"):
            changed.append(_legacy_add_comment({"issue_id": issue_id, "body": arguments["comment"]}))
    if issue_ids:
        with DBSession(engine) as db:
            _activity(db, issue_ids[0], "bulk_update_issues", to_value=",".join(str(i) for i in identifiers))
            db.commit()
    return {"count": len(issue_ids), "issues": changed}


def _legacy_move_issues(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = dict(arguments)
    payload.pop("comment", None)
    return _legacy_bulk_update_issues(payload)


def _legacy_create_saved_view(arguments: dict[str, Any]) -> dict[str, Any]:
    with DBSession(engine) as db:
        owner_id = _resolve_user_id(db, arguments.get("owner_id") or arguments.get("owner_username")) or "user_001"
        team_id = _resolve_team_id(db, arguments.get("team_id") or arguments.get("team_key"))
    display = arguments.get("display") or {}
    return create_view(
        ViewArgs(
            name=arguments["name"],
            description=arguments.get("description"),
            owner_id=owner_id,
            team_id=team_id,
            filter_json=arguments.get("filter_json") or arguments.get("filters") or {},
            group_by=display.get("group_by") or arguments.get("group_by", "status"),
            order_by=display.get("order_by") or arguments.get("order_by", "updated"),
            layout=display.get("mode") or arguments.get("layout", "list"),
            shared=(arguments.get("scope") != "personal"),
        )
    )


def _legacy_list_inbox(arguments: dict[str, Any]) -> dict[str, Any]:
    with DBSession(engine) as db:
        user_id = _resolve_user_id(db, arguments.get("user_id") or arguments.get("username") or arguments.get("owner_username"))
        rows = _many(
            db,
            """
            SELECT * FROM inbox_notifications
            WHERE (:user_id IS NULL OR user_id = :user_id)
              AND (:status IS NULL OR status = :status)
            ORDER BY created_at DESC
            LIMIT :limit
            """,
            {"user_id": user_id, "status": arguments.get("status"), "limit": arguments.get("limit", 50)},
        )
        return {"count": len(rows), "notifications": rows}


def _legacy_notification_action(arguments: dict[str, Any], *, archive: bool = False) -> dict[str, Any]:
    notification_id = arguments.get("id") or arguments.get("notification_id")
    with DBSession(engine) as db:
        if archive:
            db.execute(text("UPDATE notifications SET read_at = COALESCE(read_at, NOW()), archived_at = NOW(), updated_at = NOW() WHERE id = :id"), {"id": notification_id})
        else:
            db.execute(text("UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE id = :id"), {"id": notification_id})
        db.commit()
        return _one(db, "SELECT * FROM notifications WHERE id = :id", {"id": notification_id}) or {"id": notification_id}


def _legacy_snooze_notification(arguments: dict[str, Any]) -> dict[str, Any]:
    notification_id = arguments.get("id") or arguments.get("notification_id")
    until = arguments.get("snoozed_until") or arguments.get("until")
    if until == "tomorrow":
        until = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    return snooze_notification(SnoozeNotificationArgs(id=notification_id, snoozed_until=until or (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()))


def _legacy_project_args(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = dict(arguments)
    if "project_id" in payload and "id" not in payload:
        payload["id"] = payload.pop("project_id")
    if "status" in payload and "state" not in payload:
        payload["state"] = payload.pop("status")
    if "lead_username" in payload and "lead_id" not in payload:
        with DBSession(engine) as db:
            payload["lead_id"] = _resolve_user_id(db, payload.pop("lead_username"))
    return payload


def _legacy_project_update(arguments: dict[str, Any]) -> dict[str, Any]:
    if "status" in arguments or "state" in arguments or "health" in arguments:
        update_project(UpdateProjectArgs(**_legacy_project_args(arguments)))
    with DBSession(engine) as db:
        author_id = _resolve_user_id(db, arguments.get("author_id") or arguments.get("author_username")) or "user_001"
    return post_project_update(ProjectUpdateArgs(project_id=arguments["project_id"], author_id=author_id, body=arguments["body"], health=arguments.get("health", "on_track")))


def _legacy_command_palette_action(arguments: dict[str, Any]) -> dict[str, Any]:
    action = arguments.get("action")
    params = dict(arguments.get("parameters") or {})
    entity_id = arguments.get("entity_id")
    if arguments.get("entity_type") == "issue" and entity_id:
        params.setdefault("identifier", entity_id)
    result = call_tool(action, params).structured_content
    with DBSession(engine) as db:
        issue_id = _resolve_issue_id(db, entity_id)
        _activity(db, issue_id, "command_palette", to_value=json.dumps({"action": action, "entity_id": entity_id}))
        db.commit()
    return result


def call_tool(name: str, arguments: dict[str, Any]) -> ToolResult:
    try:
        match name:
            case "create_workspace":
                result = create_workspace(WorkspaceArgs(**arguments))
            case "search_workspaces":
                result = search_workspaces(SearchArgs(**arguments))
            case "create_team":
                result = create_team(TeamArgs(**arguments))
            case "search_teams" | "list_teams":
                result = search_teams(TeamSearchArgs(**arguments))
            case "add_team_member":
                result = add_team_member(TeamMemberArgs(**arguments))
            case "list_team_members":
                result = list_team_members(IdArgs(**arguments))
            case "create_workflow_state":
                if "team_key" in arguments and "team_id" not in arguments:
                    with DBSession(engine) as db:
                        arguments = {**arguments, "team_id": _resolve_team_id(db, arguments["team_key"])}
                    arguments.pop("team_key", None)
                result = create_workflow_state(WorkflowStateArgs(**arguments))
            case "list_workflow_states":
                if "team_key" in arguments and "query" not in arguments:
                    arguments = {**arguments, "query": str(arguments["team_key"]).upper()}
                    arguments.pop("team_key", None)
                result = list_workflow_states(TeamSearchArgs(**arguments))
            case "update_workflow_state":
                result = update_workflow_state(UpdateWorkflowStateArgs(**arguments))
            case "delete_workflow_state":
                result = _delete_record("workflow_states", IdArgs(**arguments).id)
            case "reorder_workflow_states":
                result = reorder_workflow_states(ReorderWorkflowStatesArgs(**arguments))
            case "create_label":
                if "team_key" in arguments and "team_id" not in arguments:
                    with DBSession(engine) as db:
                        arguments = {**arguments, "team_id": _resolve_team_id(db, arguments["team_key"])}
                    arguments.pop("team_key", None)
                    arguments.pop("description", None)
                result = create_label(LabelArgs(**arguments))
            case "search_labels" | "list_labels":
                result = search_labels(SearchArgs(**arguments))
            case "update_label":
                result = update_label(UpdateLabelArgs(**arguments))
            case "delete_label":
                result = delete_label(IdArgs(**arguments))
            case "bulk_apply_label" | "bulk_apply_labels":
                result = _legacy_apply_labels(arguments) if "identifiers" in arguments else bulk_update_issues(BulkIssueArgs(**arguments))
            case "create_issue":
                result = _legacy_create_issue(arguments) if ("team_key" in arguments or "status_name" in arguments or "assignee_username" in arguments or "label_names" in arguments or "parent_identifier" in arguments) else create_issue(IssueArgs(**arguments))
            case "create_sub_issue":
                result = _legacy_create_issue(arguments)
            case "search_issues" | "list_issues_by_state" | "list_issues":
                result = search_issues(
                    _legacy_search_issue_args(arguments)
                    if ("assignee_username" in arguments or "status_name" in arguments or "label_names" in arguments or "state" in arguments or "status" in arguments)
                    else SearchIssuesArgs(**arguments)
                )
            case "get_issue":
                if "identifier" in arguments or "issue_identifier" in arguments:
                    result = get_issue(GetIssueArgs(key=arguments.get("identifier") or arguments.get("issue_identifier")))
                else:
                    result = get_issue(GetIssueArgs(**arguments))
            case "update_issue":
                if arguments.get("archived") or arguments.get("is_archived"):
                    with DBSession(engine) as db:
                        resolved = _resolve_issue_id(db, arguments.get("id") or arguments.get("identifier") or arguments.get("issue_identifier") or arguments.get("issue_key"))
                    result = archive_issue(IdArgs(id=resolved))
                else:
                    result = (
                        _legacy_update_issue(arguments)
                        if (
                            "identifier" in arguments
                            or "issue_identifier" in arguments
                            or "status_name" in arguments
                            or "assignee_username" in arguments
                            or "parent_identifier" in arguments
                            or "state" in arguments
                            or "status" in arguments
                            or "label_id" in arguments
                            or "labels" in arguments
                        )
                        else update_issue(UpdateIssueArgs(**arguments))
                    )
            case "delete_issue":
                result = delete_issue(IdArgs(**arguments))
            case "archive_issue":
                result = archive_issue(IdArgs(**arguments))
            case "move_issue_state":
                a = IssueStateArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, state_id=a.state_id))
            case "assign_issue":
                a = IssueAssigneeArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, assignee_id=a.assignee_id))
            case "set_priority":
                a = IssuePriorityArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, priority=a.priority))
            case "set_estimate":
                a = IssueEstimateArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, estimate=a.estimate))
            case "set_due_date":
                a = IssueDueDateArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, due_date=a.due_date))
            case "set_project":
                a = IssueProjectArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, project_id=a.project_id))
            case "set_cycle" | "add_to_cycle":
                a = IssueCycleArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, cycle_id=a.cycle_id))
            case "remove_from_cycle":
                a = IssueCycleArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, cycle_id=None))
            case "set_parent" | "add_subissue":
                a = IssueParentArgs(**arguments)
                result = update_issue(UpdateIssueArgs(id=a.issue_id, parent_id=a.parent_id))
            case "add_label":
                result = add_issue_label(IssueLabelArgs(**arguments))
            case "remove_label":
                result = remove_issue_label(IssueLabelArgs(**arguments))
            case "apply_issue_labels":
                result = _legacy_apply_labels(arguments)
            case "remove_issue_labels":
                result = _legacy_apply_labels(arguments, remove=True)
            case "bulk_update_issues" | "bulk_delete_issues":
                result = (
                    _legacy_bulk_update_issues(arguments)
                    if ("identifiers" in arguments or "issue_keys" in arguments or "state" in arguments or "status" in arguments)
                    else bulk_update_issues(BulkIssueArgs(**arguments))
                )
            case "bulk_move_issues" | "move_issues_to_cycle":
                result = _legacy_move_issues(arguments)
            case "add_relation":
                result = _legacy_relation(arguments) if ("source_identifier" in arguments or "target_identifier" in arguments) else add_relation(RelationArgs(**arguments))
            case "create_issue_relation" | "add_issue_relation":
                result = _legacy_relation(arguments)
            case "remove_relation":
                result = _legacy_relation(arguments, remove=True) if ("source_identifier" in arguments or "target_identifier" in arguments) else remove_relation(RelationArgs(**arguments))
            case "delete_issue_relation":
                result = _legacy_relation(arguments, remove=True)
            case "search_relations":
                result = search_relations(IdArgs(**arguments))
            case "add_comment" | "add_issue_comment":
                result = _legacy_add_comment(arguments) if ("issue_identifier" in arguments or "identifier" in arguments or "issue_key" in arguments or name == "add_issue_comment") else add_comment(CommentArgs(**arguments))
            case "edit_comment":
                from app.schema import EditCommentArgs

                result = edit_comment(EditCommentArgs(**arguments))
            case "delete_comment":
                result = delete_comment(IdArgs(**arguments))
            case "get_issue_activity" | "list_activity":
                if "issue_identifier" in arguments or "identifier" in arguments:
                    with DBSession(engine) as db:
                        arguments = {"id": _resolve_issue_id(db, arguments.get("issue_identifier") or arguments.get("identifier"))}
                result = get_issue_activity(IdArgs(**arguments))
            case "create_project":
                result = create_project(ProjectArgs(**arguments))
            case "search_projects" | "list_projects":
                result = search_projects(SearchArgs(**arguments))
            case "get_project":
                result = get_project(IdArgs(**arguments))
            case "update_project":
                result = update_project(UpdateProjectArgs(**_legacy_project_args(arguments)))
            case "archive_project":
                result = archive_project(IdArgs(**arguments))
            case "delete_project":
                result = delete_project(IdArgs(**arguments))
            case "create_milestone":
                result = create_milestone(MilestoneArgs(**arguments))
            case "list_milestones":
                result = list_milestones(IdArgs(**arguments))
            case "update_milestone":
                result = update_milestone(UpdateMilestoneArgs(**arguments))
            case "delete_milestone":
                result = delete_milestone(IdArgs(**arguments))
            case "set_project_lead":
                a = UpdateProjectArgs(**arguments)
                result = update_project(UpdateProjectArgs(id=a.id, lead_id=a.lead_id))
            case "post_project_update":
                result = post_project_update(ProjectUpdateArgs(**arguments))
            case "create_project_update":
                result = _legacy_project_update(arguments)
            case "list_project_updates":
                result = list_project_updates(IdArgs(**arguments))
            case "get_project_progress":
                result = get_project_progress(IdArgs(**arguments))
            case "create_cycle":
                result = create_cycle(CycleArgs(**arguments))
            case "search_cycles" | "list_cycles":
                result = search_cycles(SearchArgs(**arguments))
            case "get_cycle":
                result = get_cycle(IdArgs(**arguments))
            case "update_cycle":
                result = update_cycle(UpdateCycleArgs(**arguments))
            case "close_cycle":
                result = close_cycle(IdArgs(**arguments))
            case "get_cycle_metrics":
                result = get_cycle_metrics(IdArgs(**arguments))
            case "create_view":
                result = create_view(ViewArgs(**arguments))
            case "create_saved_view":
                result = _legacy_create_saved_view(arguments)
            case "search_views" | "list_saved_views" | "list_views":
                result = search_views(SearchArgs(**arguments))
            case "get_view":
                result = get_view_record(IdArgs(**arguments))
            case "update_view":
                result = update_view(UpdateViewArgs(**arguments))
            case "update_saved_view":
                result = update_view(UpdateViewArgs(**arguments))
            case "delete_view":
                result = delete_view(IdArgs(**arguments))
            case "share_view":
                result = share_view(IdArgs(**arguments))
            case "list_my_issues":
                result = list_my_issues(SearchArgs(**arguments))
            case "list_created_issues":
                result = list_created_issues(SearchArgs(**arguments))
            case "list_subscribed_issues":
                result = list_subscribed_issues(SearchArgs(**arguments))
            case "list_my_issue_activity":
                result = list_my_issue_activity(SearchArgs(**arguments))
            case "subscribe_issue":
                result = subscribe_issue(IssueAssigneeArgs(**arguments))
            case "unsubscribe_issue":
                result = unsubscribe_issue(IssueAssigneeArgs(**arguments))
            case "create_notification":
                result = create_notification(NotificationArgs(**arguments))
            case "list_notifications" | "list_inbox":
                if name == "list_inbox":
                    result = _legacy_list_inbox(arguments)
                else:
                    result = list_notifications(SearchArgs(**arguments))
            case "mark_notification_read":
                result = mark_notification_read(NotificationActionArgs(**arguments))
            case "mark_inbox_read":
                result = _legacy_notification_action(arguments)
            case "mark_all_read":
                result = mark_all_notifications_read(SearchArgs(**arguments))
            case "snooze_notification":
                result = _legacy_snooze_notification(arguments) if ("until" in arguments or "notification_id" in arguments) else snooze_notification(SnoozeNotificationArgs(**arguments))
            case "archive_notification":
                result = archive_notification(NotificationActionArgs(**arguments))
            case "archive_inbox_notification":
                result = _legacy_notification_action(arguments, archive=True)
            case "add_favorite":
                result = add_favorite(FavoriteArgs(**arguments))
            case "list_favorites":
                result = list_favorites(SearchArgs(**arguments))
            case "remove_favorite":
                result = remove_favorite(IdArgs(**arguments))
            case "create_template":
                result = create_template(TemplateArgs(**arguments))
            case "list_templates":
                result = list_templates(SearchArgs(**arguments))
            case "create_initiative":
                result = create_initiative(InitiativeArgs(**arguments))
            case "search_initiatives":
                result = search_initiatives(SearchArgs(**arguments))
            case "create_customer":
                result = create_customer(CustomerArgs(**arguments))
            case "search_customers":
                result = search_customers(SearchArgs(**arguments))
            case "create_customer_request" | "link_customer_request":
                result = create_customer_request(CustomerRequestArgs(**arguments))
            case "mark_customer_request_important":
                result = _update_record("customer_requests", IdArgs(**arguments).id, {"important": True}, ["important"])
            case "global_search" | "command_palette_search":
                result = global_search(SearchArgs(**arguments))
            case "command_palette_action":
                result = _legacy_command_palette_action(arguments)
            case "search_users":
                result = search_users(UserSearchArgs(**arguments))
            case "get_user":
                result = get_user(IdArgs(**arguments))
            case _:
                return ToolResult(is_error=True, text=f"Unknown tool: {name}")
        return ToolResult(is_error=False, text=f"{name} completed.", structured_content=result)
    except Exception as exc:
        return ToolResult(is_error=True, text=f"Error executing {name}: {exc}")


def _delete_record(table: str, record_id: str) -> dict[str, Any]:
    with DBSession(engine) as db:
        db.execute(text(f"DELETE FROM {table} WHERE id = :id"), {"id": record_id})
        _audit(db, table.rstrip("s"), record_id, "deleted")
        db.commit()
        return {"id": record_id, "deleted": True}


def get_view_record(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        view = _one(db, "SELECT * FROM views WHERE id = :id", {"id": args.id})
        if not view:
            raise ValueError(f"View not found: {args.id}")
        issues = search_issues(SearchIssuesArgs(view_id=args.id, limit=200))["issues"]
        return {"view": view, "issues": issues}


def get_project_progress(args: IdArgs) -> dict[str, Any]:
    with DBSession(engine) as db:
        progress = _project_progress(db, args.id)
        db.commit()
        return progress


@asynccontextmanager
async def lifespan(application: FastAPI):
    yield


app = FastAPI(title="Linear Clone Tool Server", lifespan=lifespan)


@app.post("/api/login")
async def login(body: LoginRequest, response: Response) -> dict[str, Any]:
    with DBSession(engine) as db:
        user = db.query(User).filter(User.username == body.username).first()
        if not user or user.password != body.password:
            response.status_code = 401
            return {"error": "Invalid username or password"}
        user_data = {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "avatar_url": user.avatar_url,
        }
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)
        db.add(SessionModel(token=token, user_id=user.id, expires_at=expires))
        db.commit()
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_DURATION_HOURS * 3600,
    )
    return {"user": user_data}


@app.post("/api/logout")
async def logout(response: Response, session_token: str | None = Cookie(default=None)) -> dict[str, str]:
    if session_token:
        with DBSession(engine) as db:
            db.execute(text("DELETE FROM sessions WHERE token = :token"), {"token": session_token})
            db.commit()
    response.delete_cookie("session_token")
    return {"status": "logged_out"}


@app.get("/api/me")
async def me(session_token: str | None = Cookie(default=None)) -> dict[str, Any]:
    return {"user": get_current_user(session_token)}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/tools")
async def get_tools() -> dict[str, Any]:
    return {"tools": TOOLS}


@app.post("/step")
async def step(request: dict[str, Any]) -> dict[str, Any]:
    action = request.get("action", request) or {}
    tool_name = action.get("tool_name") or action.get("kind") or request.get("tool_name")
    parameters = action.get("parameters") or action.get("arguments") or request.get("parameters") or {}
    if not tool_name:
        return observation_from_result(ToolResult(is_error=True, text="Missing tool_name in action"))
    return observation_from_result(call_tool(tool_name, dict(parameters)))


@app.post("/reset")
async def reset() -> dict[str, Any]:
    tables = [
        "audit_log",
        "customer_requests",
        "customers",
        "favorites",
        "notifications",
        "initiative_projects",
        "initiatives",
        "views",
        "project_updates",
        "project_milestones",
        "issue_comments",
        "issue_activity",
        "issue_subscriptions",
        "issue_relations",
        "issue_labels",
        "issues",
        "labels",
        "cycles",
        "project_members",
        "projects",
        "issue_templates",
        "workflow_states",
        "team_members",
        "teams",
        "workspaces",
        "sessions",
        "users",
    ]
    with DBSession(engine) as db:
        for table in tables:
            db.execute(text(f"DELETE FROM {table}"))
        db.commit()
    return observation_from_result(ToolResult(is_error=False, text="Database reset. Run seed to repopulate."))


@app.get("/snapshot")
async def snapshot() -> dict[str, Any]:
    data: dict[str, Any] = {}
    table_names = [
        "users",
        "workspaces",
        "teams",
        "workflow_states",
        "labels",
        "projects",
        "project_milestones",
        "project_updates",
        "cycles",
        "issues",
        "issue_labels",
        "issue_comments",
        "issue_activity",
        "views",
        "notifications",
        "favorites",
        "initiatives",
        "customers",
        "customer_requests",
    ]
    with DBSession(engine) as db:
        for table in table_names:
            data[table] = _many(db, f"SELECT * FROM {table} ORDER BY 1")
        audit_count = int(_scalar(db, "SELECT COUNT(*) FROM audit_log") or 0)
        data["audit_log_count"] = audit_count
    lines = [
        "Linear Clone Snapshot",
        f"Users: {len(data['users'])}",
        f"Teams: {len(data['teams'])}",
        f"Issues: {len(data['issues'])}",
        f"Projects: {len(data['projects'])}",
        f"Cycles: {len(data['cycles'])}",
        f"Audit log entries: {audit_count}",
    ]
    return {"status": "ok", "tool_server": "linear-clone", "data": data, "human_readable": "\n".join(lines)}


if os.path.isdir(FRONTEND_DIR):
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        requested = os.path.join(FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(requested):
            return FileResponse(requested)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
