"""Playwright smoke tests for the Linear clone UI.

Run against a live stack: make up && make seed && make test-e2e
"""

from __future__ import annotations

import os
import re

from playwright.sync_api import Page
from playwright.sync_api import expect

BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:8030")


def login(page: Page, username: str = "admin", password: str = "admin") -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    if page.get_by_test_id("login-page").is_visible():
        page.get_by_test_id("login-username").fill(username)
        page.get_by_test_id("login-password").fill(password)
        page.get_by_test_id("login-submit").click()
        page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("linear-sidebar")).to_be_visible()


class TestAuthAndShell:
    def test_login_and_logout(self, page: Page) -> None:
        login(page)
        expect(page.get_by_test_id("nav-my-issues")).to_be_visible()
        page.get_by_test_id("logout-button").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("login-page")).to_be_visible()

    def test_command_palette_opens(self, page: Page) -> None:
        login(page)
        expect(page.get_by_text("Collinear")).to_be_visible()
        expect(page.get_by_test_id("favorite-active")).to_have_attribute("href", re.compile(r"/team/eng/active$"))
        page.get_by_test_id("command-palette-button").click()
        expect(page.get_by_test_id("command-palette")).to_be_visible()
        page.keyboard.press("Escape")


class TestIssues:
    def test_issue_list_and_board_render(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/team/eng/all")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-list")).to_be_visible()
        rows = page.get_by_test_id(re.compile(r"issue-row-"))
        expect(rows.first).to_be_visible()
        assert rows.count() > 0
        page.get_by_test_id("board-toggle").click()
        expect(page.get_by_test_id("issue-board")).to_be_visible()
        page.get_by_test_id("favorite-active").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name="ENG Active")).to_be_visible()
        expect(page.get_by_test_id("issue-board")).to_be_visible()

    def test_issue_detail_comment_flow(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/issue/ENG-1")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        page.get_by_test_id("issue-comment-input").fill("E2E comment from Linear smoke test.")
        page.get_by_test_id("issue-comment-submit").click()
        page.wait_for_load_state("networkidle")
        expect(page.locator(".comment").filter(has_text="E2E comment from Linear smoke test.").last).to_be_visible()

    def test_quick_create_modal_opens(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()

    def test_quick_create_persists_issue_with_project_and_assignee(self, page: Page) -> None:
        login(page)
        title = "E2E quick create linked issue"
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        page.get_by_test_id("create-issue-title").fill(title)
        page.get_by_role("button", name=re.compile(r"Priority|No priority")).click()
        page.get_by_role("menuitem", name="High").click()
        page.get_by_role("button", name=re.compile(r"Assignee|Unassigned")).click()
        page.get_by_role("menuitem", name="Sarah Connor").click()
        page.get_by_role("button", name=re.compile(r"Project|No project")).click()
        page.get_by_role("menuitem", name="Issue Flow Implementation").click()
        page.get_by_test_id("create-issue-submit").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        expect(page.get_by_role("heading", name=title)).to_be_visible()
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text("Sarah Connor")
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text("High")
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Issue Flow Implementation")

        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name=title)).to_be_visible()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Issue Flow Implementation")

    def test_issue_property_pickers_persist_changes(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/issue/ENG-1")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()

        page.get_by_test_id("issue-status-display").click()
        page.get_by_role("menuitem", name="In Review").click()
        expect(page.get_by_test_id("issue-status-display")).to_contain_text("In Review")

        page.get_by_test_id("issue-assignee-display").click()
        page.get_by_role("menuitem", name="Sarah Connor").click()
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text("Sarah Connor")

        page.get_by_test_id("issue-priority-display").click()
        page.get_by_role("menuitem", name="Urgent").click()
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text("Urgent")

        page.get_by_test_id("issue-project-display").click()
        page.get_by_role("menuitem", name="Issue Flow Implementation").click()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Issue Flow Implementation")

        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-status-display")).to_contain_text("In Review")
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text("Sarah Connor")
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text("Urgent")
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Issue Flow Implementation")


class TestPlanningAndUtilityPages:
    def test_projects_and_project_detail_render(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("nav-projects").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("projects-page")).to_be_visible()
        page.get_by_text("Backend Tool Server Coverage").first.click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()

    def test_project_create_and_link_issue_flow(self, page: Page) -> None:
        login(page)
        project_name = "E2E Workflow Closure"
        page.goto(f"{BASE_URL}/projects/all")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("projects-page")).to_be_visible()
        page.get_by_test_id("create-project-button").click()
        expect(page.get_by_test_id("create-project-modal")).to_be_visible()
        page.get_by_test_id("project-name-input").fill(project_name)
        page.get_by_test_id("project-description-input").fill("Created by the browser workflow regression test.")
        page.get_by_test_id("create-project-submit").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text(project_name).first).to_be_visible()
        page.get_by_text(project_name).first.click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()
        expect(page.get_by_role("heading", name=project_name)).to_be_visible()

        page.get_by_test_id("project-add-issue").click()
        expect(page.get_by_test_id("project-add-issue-modal")).to_be_visible()
        page.get_by_test_id("project-issue-search").fill("Expose full /tools registry")
        page.get_by_test_id("project-issue-option-ENG-1").click()
        expect(page.get_by_test_id("project-issue-row-ENG-1")).to_be_visible()

        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-issue-row-ENG-1")).to_be_visible()

    def test_inbox_settings_and_stubs_render(self, page: Page) -> None:
        login(page)
        for path, test_id in [
            ("/inbox", "inbox-page"),
            ("/team/eng/settings", "team-settings-page"),
            ("/roadmap", "roadmap-page"),
            ("/initiatives", "initiatives-page"),
            ("/archive", "archive-page"),
        ]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
            expect(page.get_by_test_id(test_id)).to_be_visible()
