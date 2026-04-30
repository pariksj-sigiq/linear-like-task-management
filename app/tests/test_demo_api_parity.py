"""API parity tests for the reduced Linear clone workflow surface.

These tests cover the same user stories the browser suite demonstrates, but
through POST /step so the backend/tool boundary stays honest.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.test_helpers import ToolServerClient
from shared.test_helpers import assert_tool_success

BASE_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
client = ToolServerClient(BASE_URL)


def step(tool: str, params: dict | None = None) -> dict:
    return assert_tool_success(client.step(tool, params or {}))["structured_content"]


def unique_name(prefix: str) -> str:
    return f"{prefix} {int(time.time() * 1000)}"


def test_issue_assignment_project_label_and_filters_are_reproducible_by_api():
    team = step("search_teams", {"query": "ENG", "limit": 1})["teams"][0]
    assignee = step("search_users", {"query": "Sarah", "limit": 5})["users"][0]
    feature_label = next(
        label
        for label in step("search_labels", {"query": "Feature", "limit": 20})["labels"]
        if label["team_id"] == team["id"]
    )
    project = step(
        "create_project",
        {
            "name": unique_name("API workflow project"),
            "description": "Project created by API parity coverage.",
            "state": "planned",
            "health": "on_track",
        },
    )

    issue = step(
        "create_issue",
        {
            "team_id": team["id"],
            "title": unique_name("API workflow issue"),
            "description": "Created, assigned, labelled, and linked through /step.",
            "priority": "high",
            "assignee_id": assignee["id"],
            "project_id": project["id"],
            "label_ids": [feature_label["id"]],
        },
    )

    assert issue["assignee_id"] == assignee["id"]
    assert issue["assignee_name"] == "Sarah Connor"
    assert issue["project_id"] == project["id"]
    assert issue["project_name"] == project["name"]
    assert issue["priority"] == "high"
    assert any(label["id"] == feature_label["id"] for label in issue["labels"])

    filtered = step(
        "search_issues",
        {
            "team_key": "ENG",
            "priority": "high",
            "assignee_id": assignee["id"],
            "project_id": project["id"],
            "label_id": feature_label["id"],
            "limit": 10,
        },
    )
    assert any(row["key"] == issue["key"] for row in filtered["issues"])

    updated = step("update_issue", {"id": issue["key"], "priority": "medium"})
    assert updated["priority"] == "medium"


def test_project_views_cycles_notifications_and_search_are_covered_by_api():
    project = step(
        "create_project",
        {
            "name": unique_name("API planning project"),
            "description": "Planning workflow project.",
            "state": "started",
            "health": "on_track",
        },
    )
    update = step(
        "post_project_update",
        {
            "project_id": project["id"],
            "author_id": "user_001",
            "body": "API parity project update.",
            "health": "on_track",
        },
    )
    assert update["body"] == "API parity project update."
    assert step("get_project", {"id": project["id"]})["project"]["name"] == project["name"]

    view = step(
        "create_view",
        {
            "name": unique_name("API high priority view"),
            "owner_id": "user_001",
            "filter_json": {"priority": "high"},
            "layout": "list",
        },
    )
    view_detail = step("get_view", {"id": view["id"]})
    assert view_detail["view"]["name"] == view["name"]
    assert "issues" in view_detail

    cycle = step("search_cycles", {"query": "ENG Build Sprint 2", "limit": 5})["cycles"][0]
    metrics = step("get_cycle_metrics", {"id": cycle["id"]})
    assert metrics["cycle_id"] == cycle["id"]
    assert "completion_percent" in metrics

    notification = step("list_notifications", {"limit": 5})["notifications"][0]
    read = step("mark_notification_read", {"id": notification["id"]})
    assert read["read_at"] is not None
    snoozed = step(
        "snooze_notification",
        {"id": notification["id"], "snoozed_until": "2026-05-01T12:00:00Z"},
    )
    assert snoozed["snoozed_until"].startswith("2026-05-01T12:00:00")

    results = step("global_search", {"query": "Backend", "limit": 20})["results"]
    assert {item["type"] for item in results} & {"issue", "project", "team", "view"}
