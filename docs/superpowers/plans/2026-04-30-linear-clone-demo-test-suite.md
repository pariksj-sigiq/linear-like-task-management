# Linear Clone Demo Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an assignment-demo-grade test suite proving every UI feature we show is working and is reproducible through `POST /step`, with an MCP-compatible tool boundary.

**Architecture:** Keep the React UI and FastAPI tool server as the two public control planes, then test them against the same Postgres-backed state. UI tests should perform visible browser actions and assert the equivalent `/step` read/write result. API tests should cover the same operations directly, using stable IDs when visible names are duplicated. MCP coverage is a contract test: `/tools` must be usable as an MCP `tools/list` source, and `/step` must be usable as a `tools/call` transport without adding business logic to an adapter.

**Tech Stack:** FastAPI, SQLAlchemy, Postgres, React/Vite, pytest, pytest-playwright, existing `shared.test_helpers.ToolServerClient`, Docker compose local stack.

---

## Current Baseline

- `make validate`: pass, 118 tools.
- `make test`: pass, 21 backend tests and 11 Playwright e2e tests.
- Browser click pass: 94 checks passed, 9 checks flagged as gaps or brittle selectors.
- Current clean post-seed snapshot after reset/seed in this checkout: 23 users, 7 teams, 143 issues, 18 projects, 14 cycles, 231 audit rows.
- Console errors during browser pass: 0.

## Gaps Found During Click Pass

1. `/inbox` renders, but notification rows are hidden (`notification-row` count is 0) while `list_notifications` returns 9 rows.
2. Quick create successfully creates an issue, but the modal can remain open after navigation; a demo test should fail until it always closes on successful submit.
3. Project names are duplicated (`Backend Tool Server Coverage` appears twice), making unscoped UI menu selection and command-palette assertions ambiguous.
4. Label names are duplicated across teams (`P0` appeared 3 times), so label picker tests need team scoping or stable option test IDs.
5. `/settings/workspace` once stayed on `Loading...` on direct navigation, then recovered after reload. Add a direct-route regression test.
6. Some docs still show the older seed counts (`16/5/116`); update docs after the suite lands.

## UI To API/MCP Demo Matrix

| Demo surface | UI action | Backend API equivalent | MCP-compatible call shape | Required test |
|---|---|---|---|---|
| Auth | login, logout, `/api/me` shell | `/api/login`, `/api/logout`, `/api/me` | Not a tool call; HTTP auth setup for browser tests | e2e auth + API auth |
| Tool registry | show API/MCP readiness | `GET /tools` | `tools/list` from `/tools` entries | contract test |
| My Issues | list assigned work, tabs, bulk toolbar | `list_my_issues`, `list_created_issues`, `list_subscribed_issues`, `bulk_update_issues` | `tools/call` with same tool name/args | e2e + API parity |
| Team Issues | tabs, filters, issue row open | `search_issues`, `list_issues_by_state`, `get_issue` | same | e2e route/render |
| Issue Detail | comment, status, priority, assignee, project, label | `add_issue_comment`, `update_issue`, `move_issue_state`, `set_priority`, `assign_issue`, `set_project`, `apply_issue_labels` | same | e2e mutates, API verifies |
| Quick Create | create issue with assignee/project/priority | `create_issue` | same | e2e create and API create |
| Projects | create project, post update, link issue | `create_project`, `post_project_update`, `update_issue`, `get_project` | same | e2e mutates, API verifies |
| Views | list/open saved views | `list_views`, `get_view`, `search_issues` with `view_id` | same | e2e + API |
| Cycles | list/open cycle board | `search_cycles`, `get_cycle`, `get_cycle_metrics`, `search_issues` with `cycle_id` | same | e2e + API |
| Inbox | view notification, mark read, snooze | `list_notifications`, `mark_notification_read`, `snooze_notification` | same | currently failing e2e, API green |
| Search/Command Palette | global search, open result, create command | `global_search`, `command_palette_search`, `command_palette_action` | same | e2e + API |
| Tier 2 Routes | initiatives, roadmap, settings, drafts, archive | `search_initiatives`, `snapshot`, `search_issues` with archive flags | same where data-backed | e2e direct-route smoke |
| Reset/Snapshot | deterministic grader state | `/reset`, `/snapshot` | Usually orchestration, not tool call | API test + smoke reset |

## File Structure

- Modify: `app/tests/e2e/test_linear_clone.py`
  - Keep existing smoke tests, but tighten them where they already cover demo flows.
- Create: `app/tests/e2e/test_assignment_demo_flows.py`
  - Full browser demo suite with UI actions and API readback.
- Create: `app/tests/test_demo_api_parity.py`
  - API-only parity suite for the exact operations shown in the demo.
- Create: `app/tests/test_mcp_contract.py`
  - `/tools` and `/step` MCP-pluggability contract tests.
- Optional create: `app/tests/e2e/conftest.py`
  - Shared Playwright login, console-error capture, and API client fixtures.
- Modify after implementation: `QA_REPORT.md`, `FEATURE_INVENTORY.md`, `README.md`
  - Update counts, coverage, known fixed gaps, and the final command list.

## Task 1: API Parity Tests

**Files:**
- Create: `app/tests/test_demo_api_parity.py`

- [ ] **Step 1: Add the test file with shared API helpers**

```python
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
```

- [ ] **Step 2: Cover the issue-detail demo actions through `/step`**

```python
def test_issue_detail_demo_actions_are_reproducible_by_api():
    issue = step("get_issue", {"id": "ELT-21"})["issue"]
    states = step("list_workflow_states", {"query": issue["team_key"]})["states"]
    todo = next(state for state in states if state["name"] == "Todo")

    moved = step("update_issue", {"id": issue["key"], "state_id": todo["id"], "priority": "medium", "assignee_id": "user_002"})
    assert moved["state_name"] == "Todo"
    assert moved["priority"] == "medium"
    assert moved["assignee_name"] == "Sarah Connor"

    comment = step("add_issue_comment", {"issue_key": issue["key"], "body": "API parity comment for assignment demo."})
    assert comment["body"] == "API parity comment for assignment demo."

    labels = step("search_labels", {"query": "P0", "limit": 50})["labels"]
    p0 = next(label for label in labels if label["team_id"] == issue["team_id"])
    labelled = step("apply_issue_labels", {"identifiers": [issue["key"]], "label_ids": [p0["id"]]})
    assert labelled["count"] == 1
```

- [ ] **Step 3: Cover quick-create, project, cycle, view, inbox, and search API parity**

```python
def test_demo_create_project_cycle_view_inbox_and_search_api_parity():
    created = step(
        "create_issue",
        {
            "team_key": "ENG",
            "title": unique_name("API parity issue"),
            "description": "Created through /step to mirror quick create.",
            "state": "Todo",
            "priority": "high",
            "assignee_id": "user_002",
        },
    )
    assert created["key"].startswith("ENG-")
    assert created["assignee_name"] == "Sarah Connor"

    project = step("create_project", {"name": unique_name("API parity project"), "description": "Created through /step.", "state": "planned"})
    assert project["name"].startswith("API parity project")

    linked = step("update_issue", {"id": created["key"], "project_id": project["id"]})
    assert linked["project_id"] == project["id"]

    update = step("post_project_update", {"project_id": project["id"], "body": "API parity project update.", "health": "on_track"})
    assert update["body"] == "API parity project update."

    cycles = step("search_cycles", {"query": "ENG Build Sprint 2", "limit": 5})["cycles"]
    assert cycles
    assert "completion_percent" in step("get_cycle_metrics", {"id": cycles[0]["id"]})

    views = step("list_views", {"limit": 10})["views"]
    assert views
    assert "issues" in step("get_view", {"id": views[0]["id"]})

    notifications = step("list_notifications", {"limit": 10})["notifications"]
    assert notifications
    read = step("mark_notification_read", {"id": notifications[0]["id"]})
    assert read["read_at"] is not None

    results = step("global_search", {"query": "Backend", "limit": 10})["results"]
    assert any(result["type"] == "project" for result in results)
```

- [ ] **Step 4: Run the API parity tests**

Run: `cd app && ../.venv/bin/python -m pytest tests/test_demo_api_parity.py -v`

Expected: pass after the app is running and seeded.

## Task 2: Browser Demo Flow Tests

**Files:**
- Create: `app/tests/e2e/test_assignment_demo_flows.py`
- Optional create: `app/tests/e2e/conftest.py`

- [ ] **Step 1: Add e2e helpers**

```python
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


def login(page: Page, username: str = "admin", password: str = "admin") -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    if page.get_by_test_id("login-page").is_visible():
        page.get_by_test_id("login-username").fill(username)
        page.get_by_test_id("login-password").fill(password)
        page.get_by_test_id("login-submit").click()
        page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("linear-sidebar")).to_be_visible()
```

- [ ] **Step 2: Add route and console-error coverage**

```python
def test_assignment_demo_routes_render_without_console_errors(page: Page) -> None:
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    login(page)

    routes = [
        ("/my-issues/activity", "issue-grouped-list"),
        ("/team/eng/active", "issue-grouped-list"),
        ("/projects/all", "projects-page"),
        ("/views", "views-page"),
        ("/team/eng/cycles", "cycles-page"),
        ("/search", "search-page"),
        ("/archive", "archive-page"),
    ]
    for path, test_id in routes:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_test_id(test_id)).to_be_visible()

    for path in ["/initiatives", "/roadmap", "/settings/account", "/settings/workspace", "/drafts"]:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle")
        expect(page.locator("main")).to_be_visible()
        expect(page.get_by_text("Loading...", exact=True)).not_to_be_visible()

    assert errors == []
```

- [ ] **Step 3: Add issue-detail UI-to-API parity**

```python
def test_issue_detail_demo_flow_persists_to_api(page: Page) -> None:
    login(page)
    page.goto(f"{BASE_URL}/issue/ELT-21")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name=re.compile("Task verifier zero-state scoring gap"))).to_be_visible()

    page.get_by_test_id("issue-status-display").click()
    page.get_by_role("menuitem", name="Todo").click()
    page.get_by_test_id("issue-priority-display").click()
    page.get_by_role("menuitem", name="Medium").click()
    page.get_by_test_id("issue-assignee-display").click()
    page.get_by_role("menuitem", name="Sarah Connor").click()

    comment = f"Browser/API parity comment {int(time.time() * 1000)}"
    page.get_by_placeholder("Leave a comment...").fill(comment)
    page.get_by_role("button", name="Submit comment").click()
    expect(page.get_by_text(comment)).to_be_visible()

    issue = api_step("get_issue", {"id": "ELT-21"})["issue"]
    assert issue["state_name"] == "Todo"
    assert issue["priority"] == "medium"
    assert issue["assignee_name"] == "Sarah Connor"
    assert any(item["body"] == comment for item in issue["comments"])
```

- [ ] **Step 4: Add quick-create closure and stable project selection coverage**

```python
def test_quick_create_creates_issue_closes_modal_and_api_matches(page: Page) -> None:
    login(page)
    title = f"Demo quick create {int(time.time() * 1000)}"
    page.get_by_test_id("quick-create-button").click()
    expect(page.get_by_test_id("quick-create-modal")).to_be_visible()
    page.get_by_test_id("create-issue-title").fill(title)
    page.get_by_test_id("create-issue-description").fill("Created by assignment demo flow.")
    page.get_by_test_id("create-issue-priority").click()
    page.get_by_role("menuitem", name="High").click()
    page.get_by_test_id("create-issue-assignee").click()
    page.get_by_role("menuitem", name="Sarah Connor").click()
    page.get_by_test_id("create-issue-project").click()
    page.get_by_role("menuitem", name="Issue Flow Implementation").click()
    page.get_by_test_id("create-issue-submit").click()

    expect(page).to_have_url(re.compile(r"/issue/ENG-\d+"))
    expect(page.get_by_test_id("quick-create-modal")).not_to_be_visible()
    expect(page.get_by_role("heading", name=title)).to_be_visible()

    key = page.url.rsplit("/", 1)[-1]
    issue = api_step("get_issue", {"id": key})["issue"]
    assert issue["title"] == title
    assert issue["priority"] == "high"
    assert issue["assignee_name"] == "Sarah Connor"
    assert issue["project_name"] == "Issue Flow Implementation"
```

Expected before fix: this may fail because quick-create can leave the modal open. Fix the UI, then keep the test.

- [ ] **Step 5: Add inbox UI coverage that fails until inbox rows are shown**

```python
def test_inbox_notifications_are_visible_and_actions_persist_to_api(page: Page) -> None:
    login(page)
    page.goto(f"{BASE_URL}/inbox")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("inbox-page")).to_be_visible()
    expect(page.get_by_test_id("notification-row").first).to_be_visible()

    before = api_step("list_notifications", {"limit": 1})["notifications"][0]
    page.get_by_test_id("notification-row").first.click()
    page.get_by_test_id("mark-notification-read").click()
    after = api_step("list_notifications", {"limit": 10})["notifications"]
    assert next(item for item in after if item["id"] == before["id"])["read_at"] is not None
```

Expected before fix: fail because the UI currently renders the empty inbox state even though API notifications exist.

- [ ] **Step 6: Run the browser demo tests**

Run: `cd app && ../.venv/bin/python -m pytest tests/e2e/test_assignment_demo_flows.py -v`

Expected: route/search/project tests pass; inbox and quick-create closure tests fail until the UI fixes are implemented.

## Task 3: MCP-Pluggability Contract Tests

**Files:**
- Create: `app/tests/test_mcp_contract.py`

- [ ] **Step 1: Add the contract tests**

```python
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.test_helpers import ToolServerClient
from shared.test_helpers import assert_tool_success

client = ToolServerClient(os.getenv("TOOL_SERVER_URL", "http://localhost:8030"))


def test_tools_registry_is_mcp_tools_list_compatible():
    tools = client.tools()
    names = {tool["name"] for tool in tools}
    required = {
        "search_issues",
        "get_issue",
        "create_issue",
        "update_issue",
        "add_issue_comment",
        "search_projects",
        "create_project",
        "post_project_update",
        "list_notifications",
        "mark_notification_read",
        "snooze_notification",
        "global_search",
    }
    assert required <= names
    for tool in tools:
        assert isinstance(tool["name"], str) and tool["name"]
        assert isinstance(tool["description"], str) and tool["description"]
        assert tool["input_schema"]["type"] == "object"


def test_mcp_tools_call_can_passthrough_to_step_contract():
    payload = {"name": "get_issue", "arguments": {"id": "ENG-1"}}
    result = assert_tool_success(client.step(payload["name"], payload["arguments"]))["structured_content"]
    assert result["issue"]["key"] == "ENG-1"
```

- [ ] **Step 2: Run the MCP contract tests**

Run: `cd app && ../.venv/bin/python -m pytest tests/test_mcp_contract.py -v`

Expected: pass.

## Task 4: CUA Task Pack Regression

**Files:**
- Modify: `tasks/smoke_test.py` only if command ergonomics need improvement.
- Modify: `QA_REPORT.md` after final results.

- [ ] **Step 1: Run the full CUA task smoke with reset/seed between tasks**

Run:

```bash
TASK_SMOKE_RESET_COMMAND='curl -sf -X POST http://localhost:8030/reset >/dev/null && PATH=/Applications/Docker.app/Contents/Resources/bin:$PATH /Applications/Docker.app/Contents/Resources/bin/docker compose -f docker-compose.dev.yml run --rm seed >/dev/null' \
  .venv/bin/python tasks/smoke_test.py
```

Expected: every `linear-T*` task reports negative `reward: 0.0`, golden `ok: true`, positive `reward: 1.0`.

- [ ] **Step 2: If any task fails, fix the task verifier or seed fixture**

Use the failing task directory shown by `tasks/smoke_test.py`; each task owns:

- `tasks/<task>/instruction.md`
- `tasks/<task>/tests/golden_apply.py`
- `tasks/<task>/tests/verify.py`

Expected after fix: rerunning the single task, then the full smoke, passes.

## Task 5: Final Verification And Docs

**Files:**
- Modify: `QA_REPORT.md`
- Modify: `FEATURE_INVENTORY.md`
- Modify: `README.md`

- [ ] **Step 1: Run the final verification gates**

Run:

```bash
make test
make validate
```

Expected:

- `tests/test_tools.py`: pass.
- `tests/e2e/`: pass.
- `scripts/validate.sh`: pass with 118 tools.

- [ ] **Step 2: Update docs with current truth**

Write these facts into the verification sections after the suite lands:

- Current clean seed counts from `/snapshot`.
- New API parity tests and MCP contract tests.
- New browser demo tests.
- CUA smoke result.
- Fixed gaps: inbox row rendering, quick-create modal closure, duplicate option disambiguation, direct workspace-settings route.

- [ ] **Step 3: Commit**

Run:

```bash
git add app/tests docs/superpowers/plans/2026-04-30-linear-clone-demo-test-suite.md QA_REPORT.md FEATURE_INVENTORY.md README.md
git commit -m "test: add assignment demo parity suite"
```

Expected: commit succeeds after the tests and docs are green.
