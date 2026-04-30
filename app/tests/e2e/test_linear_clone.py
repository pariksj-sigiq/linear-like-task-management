"""Playwright smoke tests for the Linear clone UI.

Run against a live stack: make up && make seed && make test-e2e
"""

from __future__ import annotations

import os
import re
import uuid

import requests
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


def tool_step(tool: str, params: dict | None = None) -> dict:
    response = requests.post(
        f"{BASE_URL}/step",
        json={"action": {"tool_name": tool, "parameters": params or {}}},
        timeout=30,
    )
    response.raise_for_status()
    observation = response.json()["observation"]
    assert not observation["is_error"], observation.get("text")
    return observation["structured_content"]


class TestAuthAndShell:
    def test_login_and_logout(self, page: Page) -> None:
        login(page)
        expect(page.get_by_test_id("nav-my-issues")).to_be_visible()
        page.get_by_test_id("workspace-menu-trigger").click()
        page.get_by_test_id("logout-button").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("login-page")).to_be_visible()

    def test_command_palette_opens(self, page: Page) -> None:
        login(page)
        expect(page.get_by_test_id("workspace-menu-trigger")).to_be_visible()
        expect(page.get_by_test_id("team-eng-active-nav")).to_have_attribute("href", re.compile(r"/team/eng/active$"))
        page.get_by_test_id("command-palette-button").click()
        expect(page.get_by_test_id("command-palette")).to_be_visible()
        page.keyboard.press("Escape")

    def test_shell_header_has_no_favorite_button(self, page: Page) -> None:
        login(page)

        for path in ["/projects/all", "/team/eng/active", "/views"]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
            expect(page.get_by_label("Add to favorites")).to_have_count(0)


class TestIssues:
    def test_issue_list_and_board_render(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/team/eng/all")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-grouped-list")).to_be_visible()
        rows = page.get_by_test_id(re.compile(r"issue-row-"))
        expect(rows.first).to_be_visible()
        assert rows.count() > 0
        page.get_by_test_id("team-eng-active-nav").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(re.compile(r"/team/eng/active$"))
        expect(page.get_by_test_id("issue-grouped-list")).to_be_visible()

    def test_issue_detail_comment_flow(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/issue/ENG-1")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        page.get_by_test_id("issue-comment-input").fill("E2E comment from Linear smoke test.")
        page.get_by_test_id("issue-comment-submit").click()
        page.wait_for_load_state("networkidle")
        expect(page.locator(".comment").filter(has_text="E2E comment from Linear smoke test.").last).to_be_visible()

    def test_reference_issue_detail_opens_from_seed(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/issue/ELT-18")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        expect(page.get_by_text("Polish project update composer").first).to_be_visible()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text("Constructing linear clone")

    def test_issue_detail_creates_sub_issue_and_lists_it_in_issue_views(self, page: Page) -> None:
        login(page)
        title = f"E2E child issue {uuid.uuid4().hex[:8]}"

        page.goto(f"{BASE_URL}/issue/ENG-9")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        page.get_by_test_id("create-sub-issue-button").click()
        expect(page.get_by_test_id("sub-issue-title-input")).to_be_visible()
        page.get_by_test_id("sub-issue-title-input").fill(title)
        page.get_by_test_id("submit-sub-issue").click()
        expect(page.get_by_test_id("sub-issues-section")).to_contain_text(title, timeout=10000)

        page.goto(f"{BASE_URL}/team/eng/all")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-subissue-count-ENG-9")).to_be_visible(timeout=10000)
        expect(page.get_by_test_id("issue-grouped-list")).to_contain_text(title)

        page.goto(f"{BASE_URL}/my-issues/assigned")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("my-issues-assigned-list")).to_contain_text(title)

    def test_sub_issue_keeps_parent_context_and_my_issues_return_pill(self, page: Page) -> None:
        login(page)
        team_id = tool_step("search_teams", {"query": "ENG"})["teams"][0]["id"]
        parent = tool_step(
            "create_issue",
            {
                "team_id": team_id,
                "title": f"E2E contextual parent {uuid.uuid4().hex[:8]}",
                "creator_id": "user_001",
                "assignee_id": "user_001",
            },
        )
        title = f"E2E contextual child {uuid.uuid4().hex[:8]}"

        page.goto(f"{BASE_URL}/issue/{parent['key']}")
        page.wait_for_load_state("networkidle")
        page.get_by_test_id("create-sub-issue-button").click()
        page.get_by_test_id("sub-issue-title-input").fill(title)
        page.get_by_test_id("submit-sub-issue").click()
        expect(page.get_by_test_id("sub-issues-section")).to_contain_text(title, timeout=10000)

        page.goto(f"{BASE_URL}/my-issues/assigned")
        page.wait_for_load_state("networkidle")
        page.get_by_text(title).first.click()
        expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)
        expect(page.get_by_test_id("issue-origin-pill")).to_have_attribute("href", re.compile(r"/my-issues/assigned$"))
        expect(page.get_by_test_id("issue-origin-pill")).to_contain_text("Assigned")
        expect(page.get_by_test_id("issue-parent-context")).to_contain_text(parent["key"])
        expect(page.get_by_test_id("issue-parent-progress")).to_contain_text(re.compile(r"\d+/\d+"))

        page.get_by_test_id("issue-parent-link").click()
        expect(page).to_have_url(re.compile(rf"/issue/{parent['key']}$"), timeout=10000)
        expect(page.get_by_test_id("subissue-section-progress")).to_contain_text(re.compile(r"\d+/\d+"))
        expect(page.get_by_test_id("sub-issues-section")).to_contain_text(title)

    def test_quick_create_modal_opens(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()

    def test_quick_create_property_menus_are_exclusive_and_linearized(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        expect(page.get_by_text("Create more")).to_have_count(0)

        page.get_by_test_id("create-issue-status").click()
        expect(page.get_by_test_id("quick-create-status-menu")).to_be_visible()
        expect(page.get_by_text("Change status...")).to_be_visible()
        expect(page.get_by_role("menuitem", name="Duplicate")).to_be_visible()

        page.get_by_test_id("create-issue-priority").click()
        expect(page.get_by_test_id("quick-create-status-menu")).not_to_be_visible()
        expect(page.get_by_test_id("quick-create-priority-menu")).to_be_visible()
        expect(page.get_by_text("Set priority to...")).to_be_visible()

        page.get_by_test_id("create-issue-assignee").click()
        expect(page.get_by_test_id("quick-create-priority-menu")).not_to_be_visible()
        expect(page.get_by_test_id("quick-create-assignee-menu")).to_be_visible()
        expect(page.get_by_text("Assign to...")).to_be_visible()

        page.get_by_test_id("create-issue-project").click()
        expect(page.get_by_test_id("quick-create-assignee-menu")).not_to_be_visible()
        expect(page.get_by_test_id("quick-create-project-menu")).to_be_visible()
        expect(page.get_by_text("No project")).to_be_visible()

        page.get_by_test_id("create-issue-labels").click()
        expect(page.get_by_test_id("quick-create-project-menu")).not_to_be_visible()
        expect(page.get_by_test_id("quick-create-labels-menu")).to_be_visible()
        expect(page.get_by_text("Add labels...")).to_be_visible()
        page.get_by_role("menuitem", name="Feature").click()
        expect(page.get_by_test_id("quick-create-labels-menu")).not_to_be_visible()

        page.get_by_test_id("create-issue-more").click()
        expect(page.get_by_test_id("quick-create-labels-menu")).not_to_be_visible()
        expect(page.get_by_test_id("quick-create-more-menu")).to_be_visible()
        expect(page.get_by_text("Set due date")).to_be_visible()
        page.get_by_test_id("quick-create-due-date-trigger").hover()
        expect(page.get_by_test_id("quick-create-due-date-menu")).to_be_visible()

    def test_quick_create_persists_issue_with_project_and_assignee(self, page: Page) -> None:
        login(page)
        title = f"E2E quick create linked issue {uuid.uuid4().hex[:8]}"
        page.get_by_test_id("quick-create-button").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        page.get_by_test_id("create-issue-title").fill(title)
        page.get_by_test_id("create-issue-priority").click()
        page.get_by_role("menuitem", name="High").click()
        page.get_by_test_id("create-issue-assignee").click()
        page.get_by_role("menuitem", name="Sarah Connor").click()
        page.get_by_test_id("create-issue-project").click()
        page.get_by_role("menuitem", name="Issue Flow Implementation").first.click()
        page.get_by_test_id("create-issue-submit").click()
        expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-detail-page")).to_be_visible()
        expect(page.get_by_text(title).first).to_be_visible(timeout=10000)
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

        current_status = page.get_by_test_id("issue-status-display").inner_text()
        status_target = "Todo" if "In Review" in current_status else "In Review"
        page.get_by_test_id("issue-status-display").click()
        page.get_by_role("menuitem", name=status_target).click()
        expect(page.get_by_test_id("issue-status-display")).to_contain_text(status_target)
        page.wait_for_load_state("networkidle")

        current_assignee = page.get_by_test_id("issue-assignee-display").inner_text()
        assignee_target = "John Smith" if "Sarah Connor" in current_assignee else "Sarah Connor"
        page.get_by_test_id("issue-assignee-display").click()
        page.get_by_role("menuitem", name=assignee_target).click()
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text(assignee_target)
        page.wait_for_load_state("networkidle")

        current_priority = page.get_by_test_id("issue-priority-display").inner_text()
        priority_target = "High" if "Urgent" in current_priority else "Urgent"
        page.get_by_test_id("issue-priority-display").click()
        page.get_by_role("menuitem", name=priority_target).click()
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text(priority_target)
        page.wait_for_load_state("networkidle")

        current_project = page.get_by_test_id("issue-project-display").inner_text()
        project_target = "Backend Tool Server Coverage" if "Issue Flow Implementation" in current_project else "Issue Flow Implementation"
        page.get_by_test_id("issue-project-display").click()
        page.get_by_role("menuitem", name=project_target).first.click()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text(project_target)

        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-status-display")).to_contain_text(status_target)
        expect(page.get_by_test_id("issue-assignee-display")).to_contain_text(assignee_target)
        expect(page.get_by_test_id("issue-priority-display")).to_contain_text(priority_target)
        expect(page.get_by_test_id("issue-project-display")).to_contain_text(project_target)

    def test_my_issues_tabs_have_distinct_linear_workflows(self, page: Page) -> None:
        login(page)
        page.goto(f"{BASE_URL}/my-issues/assigned")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("my-issues-page")).to_be_visible()
        expect(page.get_by_test_id("my-issues-tab-assigned")).to_have_attribute("aria-current", "page")
        expect(page.get_by_test_id("my-issues-group-Other active")).to_be_visible()
        expect(page.get_by_test_id("my-issue-priority-no-priority")).to_have_count(0)

        page.get_by_test_id("my-issues-tab-created").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(re.compile(r"/my-issues/created$"))
        expect(page.get_by_test_id("my-issues-tab-created")).to_have_attribute("aria-current", "page")
        expect(page.get_by_test_id("my-issues-created-list")).to_be_visible()
        expect(page.get_by_text("Created by you").first).to_be_visible()

        page.get_by_test_id("my-issues-tab-subscribed").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(re.compile(r"/my-issues/subscribed$"))
        expect(page.get_by_test_id("my-issues-tab-subscribed")).to_have_attribute("aria-current", "page")
        expect(page.get_by_test_id("my-issues-subscribed-list")).to_be_visible()
        expect(page.get_by_text("Subscribed by you").first).to_be_visible()

        page.get_by_test_id("my-issues-tab-activity").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(re.compile(r"/my-issues/activity$"))
        expect(page.get_by_test_id("my-issues-tab-activity")).to_have_attribute("aria-current", "page")
        expect(page.get_by_test_id("my-issues-activity-list")).to_be_visible()
        expect(page.get_by_text("Updated on").first).to_be_visible()


class TestPlanningAndUtilityPages:
    def test_projects_and_project_detail_render(self, page: Page) -> None:
        login(page)
        page.get_by_test_id("nav-projects").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("projects-page")).to_be_visible()
        page.get_by_text("Backend Tool Server Coverage").first.click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()

    def test_project_status_picker_matches_linear_project_menu(self, page: Page) -> None:
        login(page)
        page.set_viewport_size({"width": 1440, "height": 900})
        project_name = f"E2E status picker project {uuid.uuid4().hex[:8]}"
        project = tool_step(
            "create_project",
            {
                "name": project_name,
                "description": "Created for project status picker coverage.",
                "state": "planned",
                "health": "unknown",
            },
        )

        page.goto(f"{BASE_URL}/project/{project['id']}/overview")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-detail-page")).to_be_visible()
        expect(page.get_by_test_id("overview-state-chip")).to_contain_text("Planned")

        page.get_by_test_id("overview-state-chip").click()
        expect(page.get_by_test_id("overview-status-menu")).to_be_visible()
        for status in ["Backlog", "Planned", "In Progress", "Completed", "Canceled"]:
            expect(page.get_by_test_id("overview-status-menu")).to_contain_text(status)
        expect(page.get_by_test_id("overview-status-option-planned")).to_have_attribute("aria-checked", "true")
        expect(page.get_by_test_id("overview-status-option-planned-check")).to_be_visible()

        page.get_by_test_id("overview-status-option-completed").click()
        expect(page.get_by_test_id("overview-state-chip")).to_contain_text("Completed", timeout=10000)

        page.get_by_test_id("overview-state-chip").click()
        expect(page.get_by_test_id("overview-status-option-completed")).to_have_attribute("aria-checked", "true")
        expect(page.get_by_test_id("overview-status-option-completed-check")).to_be_visible()

        page.get_by_test_id("project-status-trigger").click()
        expect(page.get_by_test_id("project-status-menu")).to_be_visible()
        expect(page.get_by_test_id("project-status-menu")).to_contain_text("Status")
        expect(page.get_by_test_id("project-status-option-started")).to_contain_text("In Progress")

    def test_project_create_and_link_issue_flow(self, page: Page) -> None:
        login(page)
        project_name = f"E2E Workflow Closure {uuid.uuid4().hex[:8]}"
        issue_title = f"E2E project scoped issue {uuid.uuid4().hex[:8]}"
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

        page.get_by_test_id("project-tab-issues").click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("project-issues-tab")).to_be_visible()
        page.get_by_test_id("project-issues-create").click()
        expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
        page.get_by_test_id("create-issue-title").fill(issue_title)
        page.get_by_test_id("create-issue-submit").click()
        expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"), timeout=10000)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name=issue_title)).to_be_visible()
        expect(page.get_by_test_id("issue-project-display")).to_contain_text(project_name)

        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id("issue-project-display")).to_contain_text(project_name)

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
