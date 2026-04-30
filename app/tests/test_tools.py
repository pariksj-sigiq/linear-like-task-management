"""Tool-server tests for the Linear clone.

Run against a live stack: make up && make seed && make test-unit
"""

from __future__ import annotations

import os
import subprocess
import sys

import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.test_helpers import ToolServerClient
from shared.test_helpers import assert_tool_error
from shared.test_helpers import assert_tool_success

BASE_URL = os.getenv("TOOL_SERVER_URL", "http://localhost:8030")
client = ToolServerClient(BASE_URL)


def step(tool: str, params: dict | None = None) -> dict:
    return assert_tool_success(client.step(tool, params or {}))["structured_content"]


class TestHealthAndRegistry:
    def test_health_returns_ok(self):
        assert client.health()["status"] == "healthy"

    def test_tools_expose_linear_surface(self):
        names = {tool["name"] for tool in client.tools()}
        assert len(names) >= 55
        for required in [
            "search_issues",
            "create_issue",
            "update_issue",
            "bulk_update_issues",
            "search_projects",
            "create_project",
            "search_cycles",
            "create_view",
            "list_notifications",
            "global_search",
        ]:
            assert required in names


class TestAuth:
    def test_seeded_users_login(self):
        for username, password in [
            ("admin", "admin"),
            ("sarah.connor", "password"),
            ("john.smith", "password"),
            ("viewer", "password"),
        ]:
            resp = requests.post(f"{BASE_URL}/api/login", json={"username": username, "password": password})
            assert resp.status_code == 200
            assert resp.json()["user"]["username"] == username

    def test_invalid_login_fails(self):
        resp = requests.post(f"{BASE_URL}/api/login", json={"username": "admin", "password": "bad"})
        assert resp.status_code == 401


class TestIssues:
    def test_search_issues_returns_seeded_issue_keys(self):
        data = step("search_issues", {"limit": 10})
        assert data["count"] >= 10
        assert all("key" in issue for issue in data["issues"])

    def test_create_and_update_issue_workflow(self):
        teams = step("search_teams", {"query": "ENG"})
        team_id = teams["teams"][0]["id"]
        states = step("list_workflow_states", {"query": "ENG"})["states"]
        done_state = next(s for s in states if s["name"] == "Done")
        issue = step(
            "create_issue",
            {
                "team_id": team_id,
                "title": "Unit test issue workflow",
                "description": "Created by pytest",
                "priority": "high",
                "creator_id": "user_001",
                "assignee_id": "user_002",
            },
        )
        moved = step("move_issue_state", {"issue_id": issue["id"], "state_id": done_state["id"]})
        assert moved["state_name"] == "Done"
        assert moved["state_category"] == "completed"
        updated = step("set_priority", {"issue_id": issue["id"], "priority": "urgent"})
        assert updated["priority"] == "urgent"

    def test_issue_assignee_and_project_can_be_cleared(self):
        team_id = step("search_teams", {"query": "ENG"})["teams"][0]["id"]
        project_id = step("search_projects", {"query": "Issue Flow Implementation"})["projects"][0]["id"]
        issue = step(
            "create_issue",
            {
                "team_id": team_id,
                "title": "Unit test nullable issue properties",
                "creator_id": "user_001",
                "assignee_id": "user_002",
                "project_id": project_id,
            },
        )
        assert issue["assignee_id"] == "user_002"
        assert issue["project_id"] == project_id

        unassigned = step("assign_issue", {"issue_id": issue["id"], "assignee_id": None})
        assert unassigned["assignee_id"] is None
        unlinked = step("set_project", {"issue_id": issue["id"], "project_id": None})
        assert unlinked["project_id"] is None

    def test_label_comment_relation_and_bulk_tools(self):
        issues = step("search_issues", {"team_key": "ENG", "limit": 3})["issues"]
        labels = step("search_labels", {"query": "P0"})["labels"]
        label_id = labels[0]["id"]
        first, second = issues[0], issues[1]
        labelled = step("add_label", {"issue_id": first["id"], "label_id": label_id})
        assert any(label["id"] == label_id for label in labelled["labels"])
        comment = step("add_comment", {"issue_id": first["id"], "author_id": "user_001", "body": "Pytest comment"})
        assert comment["body"] == "Pytest comment"
        relation = step("add_relation", {"issue_id": first["id"], "related_issue_id": second["id"], "type": "blocks"})
        assert relation["type"] == "blocks"
        bulk = step("bulk_update_issues", {"issue_ids": [first["id"], second["id"]], "priority": "low"})
        assert bulk["count"] == 2

    def test_create_issue_missing_title_errors(self):
        obs = assert_tool_error(client.step("create_issue", {"team_id": "tm_001"}))
        assert "title" in obs["text"].lower()


class TestPlanningSurfaces:
    def test_project_progress_and_updates(self):
        project = step("search_projects", {"query": "Backend Tool Server Coverage"})["projects"][0]
        update = step("post_project_update", {"project_id": project["id"], "author_id": "user_001", "body": "Pytest project update", "health": "on_track"})
        assert update["health"] == "on_track"
        progress = step("get_project_progress", {"id": project["id"]})
        assert "progress" in progress

    def test_cycle_metrics(self):
        cycle = step("search_cycles", {"query": "ENG Build Sprint 2"})["cycles"][0]
        metrics = step("get_cycle_metrics", {"id": cycle["id"]})
        assert metrics["cycle_id"] == cycle["id"]
        assert "completion_percent" in metrics

    def test_saved_view_search(self):
        view = step("create_view", {"name": "Pytest urgent work", "owner_id": "user_001", "filter_json": {"priority": "urgent"}, "layout": "list"})
        data = step("get_view", {"id": view["id"]})
        assert data["view"]["name"] == "Pytest urgent work"
        assert "issues" in data


class TestInboxSearchAndCustomers:
    def test_notifications_can_be_read_and_snoozed(self):
        notification = step("list_notifications", {"query": "user_002", "limit": 1})["notifications"][0]
        read = step("mark_notification_read", {"id": notification["id"]})
        assert read["read_at"] is not None
        snoozed = step("snooze_notification", {"id": notification["id"], "snoozed_until": "2026-05-01T12:00:00Z"})
        assert snoozed["snoozed_until"] is not None

    def test_admin_login_has_assigned_my_issues(self):
        data = step("list_my_issues", {"query": "user_001", "limit": 10})
        assert data["count"] > 0

    def test_global_search_returns_mixed_entities(self):
        data = step("global_search", {"query": "Backend", "limit": 10})
        assert data["results"]
        assert {item["type"] for item in data["results"]} & {"issue", "project", "view", "team"}

    def test_global_search_matches_issue_labels(self):
        data = step("global_search", {"query": "API", "limit": 10})
        assert any(item["type"] == "issue" for item in data["results"])

    def test_customer_request_can_link_to_issue(self):
        customer = step("search_customers", {"query": "Collinear"})["customers"][0]
        issue = step("search_issues", {"query": "command", "limit": 1})["issues"][0]
        request = step(
            "create_customer_request",
            {
                "customer_id": customer["id"],
                "issue_id": issue["id"],
                "requester_name": "Collinear reviewer",
                "body": "Please prioritize command palette reliability.",
                "important": True,
            },
        )
        assert request["important"] is True


class TestSnapshotAndReset:
    def test_snapshot_contains_linear_tables(self):
        snap = client.snapshot()
        assert snap["status"] == "ok"
        assert "issues" in snap["data"]
        assert "projects" in snap["data"]
        assert "Linear Clone Snapshot" in snap["human_readable"]

    def test_reset_clears_seeded_data(self):
        client.reset()
        data = step("search_issues", {})
        assert data["count"] == 0
        env = {
            **os.environ,
            "TOOL_SERVER_URL": BASE_URL,
            "DATABASE_URL": os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cloneapp"),
        }
        subprocess.run([sys.executable, "seed/seed_app.py"], cwd=os.path.dirname(os.path.dirname(__file__)), env=env, check=True)
