"""Reduced-scope end-to-end workflow tests for the Linear clone tool API.

These tests exercise the product stories we expect the browser UI to mirror:
issue creation, assignment, labels, filters, projects, project updates, saved
views, inbox, and global search.
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


def unique(prefix: str) -> str:
    return f"{prefix} {int(time.time() * 1000)}"


def eng_team() -> dict:
    return step("search_teams", {"query": "ENG", "limit": 10})["teams"][0]


def workflow_state(team_id: str, name: str) -> dict:
    states = step("list_workflow_states", {"query": "ENG", "limit": 50})["states"]
    return next(state for state in states if state["team_id"] == team_id and state["name"] == name)


class TestIssueWorkflowApi:
    def test_issue_lifecycle_assignment_labels_filters_comments_and_view(self):
        team = eng_team()
        label = step(
            "create_label",
            {
                "team_id": team["id"],
                "name": unique("Workflow QA"),
                "color": "#5e6ad2",
            },
        )
        review_state = workflow_state(team["id"], "In Review")

        issue = step(
            "create_issue",
            {
                "team_id": team["id"],
                "title": unique("Workflow issue"),
                "description": "Created by API workflow coverage.",
                "priority": "medium",
                "creator_id": "user_001",
                "assignee_id": "user_002",
                "estimate": 2,
            },
        )

        labelled = step("apply_issue_labels", {"identifiers": [issue["key"]], "label_ids": [label["id"]]})
        assert labelled["count"] == 1

        updated = step(
            "update_issue",
            {
                "id": issue["key"],
                "state_id": review_state["id"],
                "priority": "urgent",
                "assignee_id": "user_003",
                "estimate": 5,
                "due_date": "2026-05-15",
            },
        )
        assert updated["key"] == issue["key"]
        assert updated["state_name"] == "In Review"
        assert updated["priority"] == "urgent"
        assert updated["assignee_id"] == "user_003"
        assert updated["estimate"] == 5
        assert updated["due_date"] == "2026-05-15"

        comment = step("add_issue_comment", {"issue_key": issue["key"], "body": "Workflow API comment"})
        assert comment["body"] == "Workflow API comment"

        by_label = step("search_issues", {"label_id": label["id"], "limit": 20})["issues"]
        assert any(row["key"] == issue["key"] for row in by_label)

        by_assignee_priority = step(
            "search_issues",
            {"assignee_id": "user_003", "priority": "urgent", "limit": 50},
        )["issues"]
        assert any(row["key"] == issue["key"] for row in by_assignee_priority)

        view = step(
            "create_view",
            {
                "name": unique("Urgent John workflow"),
                "owner_id": "user_001",
                "filter_json": {"assignee_id": "user_003", "priority": "urgent"},
                "layout": "list",
            },
        )
        view_data = step("get_view", {"id": view["id"]})
        assert any(row["key"] == issue["key"] for row in view_data["issues"])

        full_issue = step("get_issue", {"id": issue["key"]})["issue"]
        assert any(row["body"] == "Workflow API comment" for row in full_issue["comments"])
        assert any(row["id"] == label["id"] for row in full_issue["labels"])


class TestProjectWorkflowApi:
    def test_project_creation_update_linked_issues_and_search(self):
        team = eng_team()
        project_name = unique("Workflow project")
        project = step(
            "create_project",
            {
                "name": project_name,
                "description": "Project created by reduced-scope workflow tests.",
                "state": "planned",
                "health": "unknown",
                "priority": "high",
                "lead_id": "user_002",
                "target_date": "2026-06-01",
            },
        )

        issue = step(
            "create_issue",
            {
                "team_id": team["id"],
                "title": unique("Project linked issue"),
                "description": "This issue should be linked into the new project.",
                "priority": "high",
                "creator_id": "user_001",
            },
        )
        linked = step("set_project", {"issue_id": issue["key"], "project_id": project["id"]})
        assert linked["project_id"] == project["id"]
        assert linked["project_name"] == project_name

        update = step(
            "post_project_update",
            {
                "project_id": project["id"],
                "author_id": "user_001",
                "body": "Project workflow update from API tests.",
                "health": "on_track",
            },
        )
        assert update["health"] == "on_track"

        updated_project = step(
            "update_project",
            {
                "id": project["id"],
                "state": "started",
                "health": "on_track",
                "priority": "urgent",
            },
        )
        assert updated_project["state"] == "started"
        assert updated_project["health"] == "on_track"
        assert updated_project["priority"] == "urgent"

        project_detail = step("get_project", {"id": project["id"]})
        assert project_detail["project"]["name"] == project_name
        assert any(row["key"] == issue["key"] for row in project_detail["issues"])
        assert any(row["body"] == "Project workflow update from API tests." for row in project_detail["updates"])

        project_filter = step("search_issues", {"project_id": project["id"], "limit": 20})["issues"]
        assert any(row["key"] == issue["key"] for row in project_filter)

        search_results = step("global_search", {"query": project_name, "limit": 10})["results"]
        assert any(row["type"] == "project" and row["id"] == project["id"] for row in search_results)


class TestUtilityWorkflowApi:
    def test_inbox_and_command_palette_surfaces_are_backed_by_tools(self):
        notification = step("list_notifications", {"query": "user_002", "limit": 1})["notifications"][0]
        read = step("mark_notification_read", {"id": notification["id"]})
        assert read["read_at"] is not None

        snoozed = step(
            "snooze_notification",
            {"id": notification["id"], "snoozed_until": "2026-05-01T09:00:00Z"},
        )
        assert snoozed["snoozed_until"] is not None

        command_results = step("command_palette_search", {"query": "Backend", "limit": 10})["results"]
        assert command_results
        assert {row["type"] for row in command_results} & {"issue", "project", "view", "team"}
