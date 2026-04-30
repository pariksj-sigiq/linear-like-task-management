"""Browser workflow tests for the reduced-scope Linear clone.

Each test drives the React UI like a user and then verifies the same state
through the `/step` tool server. This keeps the UI, API, and Postgres-backed
state in one contract.
"""

from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import Page
from playwright.sync_api import expect

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from shared.test_helpers import ToolServerClient
from shared.test_helpers import assert_tool_success

BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:8030")
client = ToolServerClient(BASE_URL)


def api_step(tool: str, params: dict | None = None) -> dict:
    return assert_tool_success(client.step(tool, params or {}))["structured_content"]


def unique(prefix: str) -> str:
    return f"{prefix} {int(time.time() * 1000)}"


def login(page: Page, username: str = "admin", password: str = "admin") -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    if page.get_by_test_id("login-page").is_visible():
        page.get_by_test_id("login-username").fill(username)
        page.get_by_test_id("login-password").fill(password)
        page.get_by_test_id("login-submit").click()
        page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("linear-sidebar")).to_be_visible()


def issue_key_from_url(page: Page) -> str:
    match = re.search(r"/issue/([^/?#]+)", page.url)
    assert match, f"Expected issue route, got {page.url}"
    return match.group(1)


class TestAssignmentBrowserWorkflows:
    def test_quick_create_issue_persists_assignment_project_priority_and_label(self, page: Page) -> None:
        login(page)
        title = unique("Browser workflow issue")

        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        page.get_by_test_id("create-issue-title").fill(title)

        page.get_by_test_id("create-issue-priority").click()
        page.get_by_role("menuitem", name="High").click()

        page.get_by_test_id("create-issue-assignee").click()
        page.get_by_role("menuitem", name="Sarah Connor").click()

        page.get_by_test_id("create-issue-project").click()
        page.get_by_role("menuitem", name="Issue Flow Implementation").first.click()

        page.get_by_test_id("create-issue-labels").click()
        page.get_by_role("menuitem", name="Feature").first.click()

        page.get_by_test_id("create-issue-submit").click()
        expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name=title)).to_be_visible(timeout=10000)

        issue = api_step("get_issue", {"id": issue_key_from_url(page)})["issue"]
        assert issue["title"] == title
        assert issue["assignee_id"] == "user_002"
        assert issue["priority"] == "high"
        assert issue["project_name"] == "Issue Flow Implementation"
        assert any(label["name"] == "Feature" for label in issue["labels"])

    def test_issue_detail_property_pickers_persist_to_backend_filters(self, page: Page) -> None:
        team = api_step("search_teams", {"query": "ENG", "limit": 10})["teams"][0]
        issue = api_step(
            "create_issue",
            {
                "team_id": team["id"],
                "title": unique("Browser picker issue"),
                "description": "Created by Playwright before editing properties.",
                "priority": "medium",
                "creator_id": "user_001",
            },
        )

        login(page)
        page.goto(f"{BASE_URL}/issue/{issue['key']}")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()

        page.get_by_test_id("issue-status-display").click()
        page.get_by_role("menuitem", name="In Review").click()
        expect(page.get_by_test_id("issue-status-display")).to_contain_text("In Review")

        page.get_by_test_id("issue-assignee-display").click()
        page.get_by_role("menuitem", name="John Smith").click()
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text("John Smith")

        page.get_by_test_id("issue-priority-display").click()
        page.get_by_role("menuitem", name="Urgent").click()
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text("Urgent")

        page.get_by_test_id("issue-project-display").click()
        page.get_by_role("menuitem", name="Issue Flow Implementation").first.click()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Issue Flow Implementation")

        saved = api_step("get_issue", {"id": issue["key"]})["issue"]
        assert saved["state_name"] == "In Review"
        assert saved["assignee_id"] == "user_003"
        assert saved["priority"] == "urgent"
        assert saved["project_name"] == "Issue Flow Implementation"

        filtered = api_step(
            "search_issues",
            {"assignee_id": "user_003", "priority": "urgent", "project_id": saved["project_id"], "limit": 50},
        )["issues"]
        assert any(row["key"] == issue["key"] for row in filtered)

    def test_project_create_and_project_scoped_issue_flow_persist_to_backend(self, page: Page) -> None:
        login(page)
        project_name = unique("Browser workflow project")

        page.goto(f"{BASE_URL}/projects/all")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("projects-page")).to_be_visible()
        page.get_by_test_id("create-project-button").click()
        expect(page.get_by_test_id("create-project-modal")).to_be_visible()
        page.get_by_test_id("project-name-input").fill(project_name)
        page.get_by_test_id("project-summary-input").fill("Created from the browser workflow suite.")
        page.get_by_test_id("project-description-input").fill("This project should be visible and usable immediately.")
        page.get_by_test_id("create-project-submit").click()

        expect(page.get_by_text(project_name).first).to_be_visible(timeout=10000)
        page.get_by_text(project_name).first.click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()
        expect(page.get_by_role("heading", name=project_name)).to_be_visible()

        project = api_step("search_projects", {"query": project_name, "limit": 5})["projects"][0]

        page.get_by_test_id("project-tab-issues").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-issues-tab")).to_be_visible()

        issue_title = unique("Project scoped browser issue")
        page.get_by_test_id("project-issues-create").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        page.get_by_test_id("create-issue-title").fill(issue_title)
        page.get_by_test_id("create-issue-submit").click()
        expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)

        created_issue = api_step("get_issue", {"id": issue_key_from_url(page)})["issue"]
        assert created_issue["title"] == issue_title
        assert created_issue["project_id"] == project["id"]

        project_detail = api_step("get_project", {"id": project["id"]})
        assert any(row["key"] == created_issue["key"] for row in project_detail["issues"])
