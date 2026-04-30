"""Browser workflow coverage for the reduced Linear clone scope."""

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


def unique_name(prefix: str) -> str:
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


def test_primary_routes_render_without_console_errors(page: Page) -> None:
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    login(page)

    routes = [
        ("/my-issues/activity", "my-issues-page"),
        ("/team/eng/active", "issue-grouped-list"),
        ("/projects/all", "projects-page"),
        ("/views", "views-page"),
        ("/team/eng/cycles", "cycles-page"),
        ("/search", "search-page"),
        ("/archive", "archive-page"),
        ("/inbox", "inbox-page"),
    ]
    for path, test_id in routes:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id(test_id)).to_be_visible()

    for path in ["/initiatives", "/roadmap", "/settings/account", "/settings/workspace", "/drafts"]:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle")
        expect(page.locator("main, [data-testid$='page']").first).to_be_visible()
        expect(page.get_by_text("Loading...", exact=True)).not_to_be_visible()

    assert errors == []


def test_create_project_issue_assignment_label_and_project_filter_flow(page: Page) -> None:
    login(page)
    project_name = unique_name("Browser workflow project")
    issue_title = unique_name("Browser workflow issue")

    page.goto(f"{BASE_URL}/projects/all")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("projects-page")).to_be_visible()

    page.get_by_test_id("create-project-button").click()
    expect(page.get_by_test_id("create-project-modal")).to_be_visible()
    page.get_by_test_id("project-name-input").fill(project_name)
    page.get_by_test_id("project-description-input").fill("Created by the browser workflow suite.")
    page.get_by_test_id("create-project-submit").click()
    page.wait_for_load_state("networkidle")

    project = api_step("search_projects", {"query": project_name, "limit": 5})["projects"][0]
    expect(page.get_by_test_id(f"project-row-{project['id']}")).to_be_visible()

    page.goto(f"{BASE_URL}/project/{project['id']}/issues")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("project-detail-page")).to_be_visible()
    expect(page.get_by_test_id("project-issues-tab")).to_be_visible()

    page.get_by_test_id("project-issues-create").click()
    expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
    page.get_by_test_id("create-issue-title").fill(issue_title)
    page.get_by_test_id("create-issue-description").fill("Created from the project issues tab.")
    page.get_by_test_id("create-issue-priority").click()
    page.get_by_role("menuitem", name="High").click()
    page.get_by_test_id("create-issue-assignee").click()
    page.get_by_role("menuitem", name="Sarah Connor").click()
    page.get_by_test_id("create-issue-labels").click()
    page.get_by_role("menuitem", name="Feature").first.click()
    page.get_by_test_id("create-issue-submit").click()

    expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name=issue_title)).to_be_visible()
    expect(page.get_by_test_id("issue-project-display")).to_contain_text(project_name)
    expect(page.get_by_test_id("issue-assignee-display")).to_contain_text("Sarah Connor")
    expect(page.get_by_test_id("issue-priority-display")).to_contain_text("High")

    issue_key = page.url.rsplit("/", 1)[-1]
    issue = api_step("get_issue", {"id": issue_key})["issue"]
    assert issue["title"] == issue_title
    assert issue["project_id"] == project["id"]
    assert issue["assignee_name"] == "Sarah Connor"
    assert issue["priority"] == "high"
    assert any(label["name"] == "Feature" for label in issue["labels"])

    page.goto(f"{BASE_URL}/projects/all")
    page.wait_for_load_state("networkidle")
    page.get_by_test_id("projects-filter-button").click()
    page.get_by_test_id("projects-filter-row-status").click()
    page.get_by_test_id("projects-filter-option-backlog").click()
    expect(page.get_by_test_id(f"project-row-{project['id']}")).to_be_visible()
    expect(page.get_by_text("Issue Flow Implementation").first).not_to_be_visible()


def test_inbox_read_action_persists_to_api(page: Page) -> None:
    notification = api_step("list_notifications", {"limit": 1})["notifications"][0]

    login(page)
    page.goto(f"{BASE_URL}/inbox")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("inbox-page")).to_be_visible()
    expect(page.get_by_test_id("notification-row").first).to_be_visible()

    page.get_by_test_id("notification-row").first.click()
    expect(page.get_by_test_id("mark-notification-read")).to_be_visible()
    page.get_by_test_id("mark-notification-read").click()
    page.wait_for_load_state("networkidle")

    notifications = api_step("list_notifications", {"limit": 20})["notifications"]
    updated = next(row for row in notifications if row["id"] == notification["id"])
    assert updated["read_at"] is not None
