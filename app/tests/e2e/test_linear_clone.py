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

    def test_issue_detail_comment_flow(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/issue/ENG-1")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        page.get_by_test_id("issue-comment-input").fill("E2E comment from Linear smoke test.")
        page.get_by_test_id("issue-comment-submit").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("E2E comment from Linear smoke test.")).to_be_visible()

    def test_quick_create_modal_opens(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()


class TestPlanningAndUtilityPages:
    def test_projects_and_project_detail_render(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("nav-projects").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("projects-page")).to_be_visible()
        page.get_by_text("Backend Tool Server Coverage").first.click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()

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
